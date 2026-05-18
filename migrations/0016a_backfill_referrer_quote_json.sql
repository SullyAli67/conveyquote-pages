-- 0016a_backfill_referrer_quote_json.sql
--
-- Phase B backfill — pure SQL replacement for the wrangler-dependent
-- Node script that originally shipped with PR #50. The operator runs
-- everything through the Cloudflare D1 web console, so the backfill
-- must be pasteable SQL.
--
-- Why this backfill exists
-- -----------------------
-- Before PR #49, functions/api/referrer-submit-enquiry.js stored
-- quote_json as JSON.stringify(quote) — calculation output only. The
-- form-body fields (most importantly saleMortgage) lived ONLY in
-- dedicated DB columns. PR #49 fixed new rows by spreading the form
-- body in: JSON.stringify({ ...body, ...quote }). Migration 0016 is
-- about to drop 33 of those dedicated columns. Without this backfill,
-- sale_mortgage on legacy referrer-sale enquiries is permanently
-- lost — admin re-calculation would treat them as cash sales and
-- produce wrong quotes.
--
-- Discriminator key
-- -----------------
-- post-PR-#49 quote_json always contains $.type (the transaction
-- type, spread from body.type). pre-PR-#49 quote_json contains
-- only calc-engine output (legalFees, disbursements, vat,
-- grandTotal, sdltAmount, …) — never $.type. So the SQL filter
-- "json_extract(quote_json, '$.type') IS NULL" cleanly selects
-- exactly the referrer rows that need backfill. The final UPDATE in
-- STEP 2 sets $.type from the transaction_type column, which means
-- once a row is backfilled the discriminator no longer matches it
-- — making re-runs of this whole file a natural no-op.
--
-- Column → JSON-key mapping (matches PR #50's Node script)
-- --------------------------------------------------------
-- Purchase leg (PR1's 17):
--   purchase_tenure                          -> $.purchaseTenure
--   purchase_price                           -> $.purchasePrice
--   purchase_postcode                        -> $.purchasePostcode
--   purchase_mortgage                        -> $.purchaseMortgage
--   purchase_lender                          -> $.purchaseLender
--   purchase_ownership_type                  -> $.purchaseOwnershipType
--   purchase_first_time_buyer                -> $.purchaseFirstTimeBuyer
--   purchase_new_build                       -> $.purchaseNewBuild
--   purchase_shared_ownership                -> $.purchaseSharedOwnership
--   purchase_help_to_buy                     -> $.purchaseHelpToBuy
--   purchase_is_company                      -> $.purchaseIsCompany
--   purchase_buy_to_let                      -> $.purchaseBuyToLet
--   purchase_gifted_deposit                  -> $.purchaseGiftedDeposit
--   purchase_additional_property             -> $.purchaseAdditionalProperty
--   purchase_uk_resident_for_sdlt            -> $.purchaseUkResidentForSdlt
--   purchase_lifetime_isa                    -> $.purchaseLifetimeIsa
--   remortgage_transfer_has_mortgage         -> $.remortgageTransferHasMortgage
-- Sale leg (PR2's 4 sale_* columns):
--   sale_tenure                              -> $.saleTenure
--   sale_price                               -> $.salePrice
--   sale_postcode                            -> $.salePostcode
--   sale_mortgage                            -> $.saleMortgage
-- Combined leg (PR2's 4 *_combined columns):
--   sale_mortgage_combined                   -> $.saleMortgageCombined
--   management_company_combined              -> $.managementCompanyCombined
--   tenanted_combined                        -> $.tenantedCombined
--   number_of_sellers_combined               -> $.numberOfSellersCombined
-- Remortgage_transfer leg (PR2's 8 remortgage_transfer_* columns):
--   remortgage_transfer_tenure               -> $.remortgageTransferTenure
--   remortgage_transfer_price                -> $.remortgageTransferPrice
--   remortgage_transfer_postcode             -> $.remortgageTransferPostcode
--   remortgage_transfer_current_lender       -> $.remortgageTransferCurrentLender
--   remortgage_transfer_new_lender           -> $.remortgageTransferNewLender
--   remortgage_transfer_additional_borrowing -> $.remortgageTransferAdditionalBorrowing
--   remortgage_transfer_owners_changing      -> $.remortgageTransferOwnersChanging
--   remortgage_transfer_ownership_type       -> $.remortgageTransferOwnershipType
--
-- How empty / NULL source columns are handled
-- -------------------------------------------
-- Each leg UPDATE chains json_set with NULLIF(col, '') values so an
-- empty-string or NULL column injects a JSON null at first, then a
-- single json_remove call wrapping the json_set strips any key whose
-- source column was empty/NULL. End result: only non-empty source
-- columns produce a key in quote_json — empty ones leave the JSON
-- untouched. Calculation-output keys (legalFees, vat, grandTotal, …)
-- never appear in the 33-column mapping above, so json_set on the
-- form-body paths cannot overwrite them.
--
-- Runbook
-- -------
-- 1. STEP 1 — Paste the two SELECTs and review. Confirm the row
--    count looks sane and the samples show populated columns
--    (especially sale_mortgage on referrer-sale rows).
-- 2. STEP 2 — Paste the five UPDATE statements in order. Each is
--    self-contained and idempotent. If your D1 console doesn't like
--    a multi-statement paste, run them one at a time. Order: the
--    four leg UPDATEs may be applied in any order, but the final
--    "$.type" UPDATE must be LAST — it's what arms the idempotency
--    check.
-- 3. STEP 3 — Paste the two post-check SELECTs. Confirm
--    rows_with_type_in_quote_json equals the row count from STEP 1
--    and a referrer-sale row now shows sale_mortgage_in_quote_json.
-- 4. THEN proceed to migration 0016 (the 33 DROP COLUMN
--    statements). Do not skip the post-check.


-- =================================================================
-- STEP 1 — DRY-RUN. Paste these SELECTs FIRST and review.
-- =================================================================

-- (1a) Count rows that will be touched.
SELECT COUNT(*) AS rows_to_backfill
FROM enquiries
WHERE referrer_id IS NOT NULL
  AND json_extract(quote_json, '$.type') IS NULL;

-- (1b) Sample 5 candidate rows with the columns most likely to be
-- recovered. sale_mortgage is the critical one — confirm you see
-- real values ("yes" / "no") on referrer-sale rows.
SELECT
  id, reference, transaction_type,
  substr(quote_json, 1, 160) AS quote_json_preview,
  sale_mortgage,
  sale_tenure, sale_price, sale_postcode,
  purchase_mortgage, purchase_tenure, purchase_price,
  remortgage_transfer_has_mortgage,
  remortgage_transfer_tenure, remortgage_transfer_price
FROM enquiries
WHERE referrer_id IS NOT NULL
  AND json_extract(quote_json, '$.type') IS NULL
ORDER BY id DESC
LIMIT 5;


-- =================================================================
-- STEP 2 — APPLY. Five UPDATEs. Run leg UPDATEs 1–4 in any order;
-- the discriminator UPDATE (5) must be LAST.
-- =================================================================

-- (2/1) Purchase leg — 17 columns (16 purchase_* + remortgage_transfer_has_mortgage).
UPDATE enquiries SET quote_json =
  json_remove(
    json_set(COALESCE(quote_json, '{}'),
      '$.purchaseTenure',                NULLIF(purchase_tenure, ''),
      '$.purchasePrice',                 NULLIF(purchase_price, ''),
      '$.purchasePostcode',              NULLIF(purchase_postcode, ''),
      '$.purchaseMortgage',              NULLIF(purchase_mortgage, ''),
      '$.purchaseLender',                NULLIF(purchase_lender, ''),
      '$.purchaseOwnershipType',         NULLIF(purchase_ownership_type, ''),
      '$.purchaseFirstTimeBuyer',        NULLIF(purchase_first_time_buyer, ''),
      '$.purchaseNewBuild',              NULLIF(purchase_new_build, ''),
      '$.purchaseSharedOwnership',       NULLIF(purchase_shared_ownership, ''),
      '$.purchaseHelpToBuy',             NULLIF(purchase_help_to_buy, ''),
      '$.purchaseIsCompany',             NULLIF(purchase_is_company, ''),
      '$.purchaseBuyToLet',              NULLIF(purchase_buy_to_let, ''),
      '$.purchaseGiftedDeposit',         NULLIF(purchase_gifted_deposit, ''),
      '$.purchaseAdditionalProperty',    NULLIF(purchase_additional_property, ''),
      '$.purchaseUkResidentForSdlt',     NULLIF(purchase_uk_resident_for_sdlt, ''),
      '$.purchaseLifetimeIsa',           NULLIF(purchase_lifetime_isa, ''),
      '$.remortgageTransferHasMortgage', NULLIF(remortgage_transfer_has_mortgage, '')
    ),
    iif(purchase_tenure                  IS NULL OR purchase_tenure                  = '', '$.purchaseTenure',                '$.__noop'),
    iif(purchase_price                   IS NULL OR purchase_price                   = '', '$.purchasePrice',                 '$.__noop'),
    iif(purchase_postcode                IS NULL OR purchase_postcode                = '', '$.purchasePostcode',              '$.__noop'),
    iif(purchase_mortgage                IS NULL OR purchase_mortgage                = '', '$.purchaseMortgage',              '$.__noop'),
    iif(purchase_lender                  IS NULL OR purchase_lender                  = '', '$.purchaseLender',                '$.__noop'),
    iif(purchase_ownership_type          IS NULL OR purchase_ownership_type          = '', '$.purchaseOwnershipType',         '$.__noop'),
    iif(purchase_first_time_buyer        IS NULL OR purchase_first_time_buyer        = '', '$.purchaseFirstTimeBuyer',        '$.__noop'),
    iif(purchase_new_build               IS NULL OR purchase_new_build               = '', '$.purchaseNewBuild',              '$.__noop'),
    iif(purchase_shared_ownership        IS NULL OR purchase_shared_ownership        = '', '$.purchaseSharedOwnership',       '$.__noop'),
    iif(purchase_help_to_buy             IS NULL OR purchase_help_to_buy             = '', '$.purchaseHelpToBuy',             '$.__noop'),
    iif(purchase_is_company              IS NULL OR purchase_is_company              = '', '$.purchaseIsCompany',             '$.__noop'),
    iif(purchase_buy_to_let              IS NULL OR purchase_buy_to_let              = '', '$.purchaseBuyToLet',              '$.__noop'),
    iif(purchase_gifted_deposit          IS NULL OR purchase_gifted_deposit          = '', '$.purchaseGiftedDeposit',         '$.__noop'),
    iif(purchase_additional_property     IS NULL OR purchase_additional_property     = '', '$.purchaseAdditionalProperty',    '$.__noop'),
    iif(purchase_uk_resident_for_sdlt    IS NULL OR purchase_uk_resident_for_sdlt    = '', '$.purchaseUkResidentForSdlt',     '$.__noop'),
    iif(purchase_lifetime_isa            IS NULL OR purchase_lifetime_isa            = '', '$.purchaseLifetimeIsa',           '$.__noop'),
    iif(remortgage_transfer_has_mortgage IS NULL OR remortgage_transfer_has_mortgage = '', '$.remortgageTransferHasMortgage', '$.__noop')
  )
WHERE referrer_id IS NOT NULL
  AND json_extract(quote_json, '$.type') IS NULL;

-- (2/2) Sale leg — 4 columns (sale_tenure/_price/_postcode/_mortgage).
UPDATE enquiries SET quote_json =
  json_remove(
    json_set(COALESCE(quote_json, '{}'),
      '$.saleTenure',   NULLIF(sale_tenure, ''),
      '$.salePrice',    NULLIF(sale_price, ''),
      '$.salePostcode', NULLIF(sale_postcode, ''),
      '$.saleMortgage', NULLIF(sale_mortgage, '')
    ),
    iif(sale_tenure   IS NULL OR sale_tenure   = '', '$.saleTenure',   '$.__noop'),
    iif(sale_price    IS NULL OR sale_price    = '', '$.salePrice',    '$.__noop'),
    iif(sale_postcode IS NULL OR sale_postcode = '', '$.salePostcode', '$.__noop'),
    iif(sale_mortgage IS NULL OR sale_mortgage = '', '$.saleMortgage', '$.__noop')
  )
WHERE referrer_id IS NOT NULL
  AND json_extract(quote_json, '$.type') IS NULL;

-- (2/3) Combined leg — 4 *_combined columns.
UPDATE enquiries SET quote_json =
  json_remove(
    json_set(COALESCE(quote_json, '{}'),
      '$.saleMortgageCombined',      NULLIF(sale_mortgage_combined, ''),
      '$.managementCompanyCombined', NULLIF(management_company_combined, ''),
      '$.tenantedCombined',          NULLIF(tenanted_combined, ''),
      '$.numberOfSellersCombined',   NULLIF(number_of_sellers_combined, '')
    ),
    iif(sale_mortgage_combined      IS NULL OR sale_mortgage_combined      = '', '$.saleMortgageCombined',      '$.__noop'),
    iif(management_company_combined IS NULL OR management_company_combined = '', '$.managementCompanyCombined', '$.__noop'),
    iif(tenanted_combined           IS NULL OR tenanted_combined           = '', '$.tenantedCombined',          '$.__noop'),
    iif(number_of_sellers_combined  IS NULL OR number_of_sellers_combined  = '', '$.numberOfSellersCombined',   '$.__noop')
  )
WHERE referrer_id IS NOT NULL
  AND json_extract(quote_json, '$.type') IS NULL;

-- (2/4) Remortgage+transfer leg — 8 remortgage_transfer_* columns.
UPDATE enquiries SET quote_json =
  json_remove(
    json_set(COALESCE(quote_json, '{}'),
      '$.remortgageTransferTenure',              NULLIF(remortgage_transfer_tenure, ''),
      '$.remortgageTransferPrice',               NULLIF(remortgage_transfer_price, ''),
      '$.remortgageTransferPostcode',            NULLIF(remortgage_transfer_postcode, ''),
      '$.remortgageTransferCurrentLender',       NULLIF(remortgage_transfer_current_lender, ''),
      '$.remortgageTransferNewLender',           NULLIF(remortgage_transfer_new_lender, ''),
      '$.remortgageTransferAdditionalBorrowing', NULLIF(remortgage_transfer_additional_borrowing, ''),
      '$.remortgageTransferOwnersChanging',      NULLIF(remortgage_transfer_owners_changing, ''),
      '$.remortgageTransferOwnershipType',       NULLIF(remortgage_transfer_ownership_type, '')
    ),
    iif(remortgage_transfer_tenure               IS NULL OR remortgage_transfer_tenure               = '', '$.remortgageTransferTenure',              '$.__noop'),
    iif(remortgage_transfer_price                IS NULL OR remortgage_transfer_price                = '', '$.remortgageTransferPrice',               '$.__noop'),
    iif(remortgage_transfer_postcode             IS NULL OR remortgage_transfer_postcode             = '', '$.remortgageTransferPostcode',            '$.__noop'),
    iif(remortgage_transfer_current_lender       IS NULL OR remortgage_transfer_current_lender       = '', '$.remortgageTransferCurrentLender',       '$.__noop'),
    iif(remortgage_transfer_new_lender           IS NULL OR remortgage_transfer_new_lender           = '', '$.remortgageTransferNewLender',           '$.__noop'),
    iif(remortgage_transfer_additional_borrowing IS NULL OR remortgage_transfer_additional_borrowing = '', '$.remortgageTransferAdditionalBorrowing', '$.__noop'),
    iif(remortgage_transfer_owners_changing      IS NULL OR remortgage_transfer_owners_changing      = '', '$.remortgageTransferOwnersChanging',      '$.__noop'),
    iif(remortgage_transfer_ownership_type       IS NULL OR remortgage_transfer_ownership_type       = '', '$.remortgageTransferOwnershipType',       '$.__noop')
  )
WHERE referrer_id IS NOT NULL
  AND json_extract(quote_json, '$.type') IS NULL;

-- (2/5) Discriminator — MUST be last. Sets $.type from the existing
-- transaction_type column so re-runs of this file naturally no-op
-- (the WHERE clauses above all filter on $.type IS NULL).
UPDATE enquiries SET quote_json =
  json_set(COALESCE(quote_json, '{}'), '$.type', transaction_type)
WHERE referrer_id IS NOT NULL
  AND json_extract(quote_json, '$.type') IS NULL
  AND transaction_type IS NOT NULL
  AND transaction_type != '';


-- =================================================================
-- STEP 3 — POST-CHECK. Paste these AFTER the UPDATEs.
-- =================================================================

-- (3a) Every backfilled row should now have $.type set. This count
-- should equal STEP 1's rows_to_backfill (assuming no other
-- referrer-submitted enquiries arrived between the dry-run and the
-- apply).
SELECT COUNT(*) AS rows_with_type_in_quote_json
FROM enquiries
WHERE referrer_id IS NOT NULL
  AND json_extract(quote_json, '$.type') IS NOT NULL;

-- (3b) Spot-check on referrer-sale rows: confirm saleMortgage is now
-- recoverable from quote_json (the critical field). If you see
-- "yes" / "no" values here, the backfill did its job and migration
-- 0016 is safe to apply.
SELECT
  id, reference,
  json_extract(quote_json, '$.type')         AS type_in_quote_json,
  json_extract(quote_json, '$.saleMortgage') AS sale_mortgage_in_quote_json,
  json_extract(quote_json, '$.saleTenure')   AS sale_tenure_in_quote_json,
  json_extract(quote_json, '$.salePrice')    AS sale_price_in_quote_json
FROM enquiries
WHERE referrer_id IS NOT NULL
  AND transaction_type = 'sale'
ORDER BY id DESC
LIMIT 10;
