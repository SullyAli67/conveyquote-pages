-- 0016_drop_variant_columns.sql
--
-- Phase B cleanup — drops the 33 variant columns from the enquiries
-- table that are no longer written by any endpoint. Phase B PR1
-- (#47) stopped send-quote.js writing 17 purchase_*/remortgage_*
-- columns; Phase B PR2 (#48) stopped it writing 16
-- sale_*/*_combined/remortgage_transfer_* columns. get-enquiry.js
-- now reconstructs the equivalent camelCase fields from quote_json,
-- so reads survive without the columns. New rows from both the
-- public form and the referrer form have NULL in these columns.
--
-- After applying all 33 statements, enquiries goes from 97 → 64
-- columns.
--
-- ─────────────────────────────────────────────────────────────────
--  ⚠ DO NOT RUN ANY STATEMENT IN THIS FILE UNTIL THE BACKFILL HAS
--  ⚠ BEEN APPLIED AND VERIFIED.
--
--  The backfill script — scripts/backfill-referrer-quote-json.js —
--  must have been run with --apply and its sample output reviewed
--  before any DROP COLUMN here is executed. Historical referrer
--  enquiries store sale_mortgage ONLY in the DB column (because
--  pre-PR-#49 referrer-submit-enquiry.js never spread the form body
--  into quote_json). Dropping sale_mortgage without the backfill
--  permanently loses that data, and admin re-calculation of those
--  enquiries would silently price them as cash sales — wrong quotes
--  to clients.
-- ─────────────────────────────────────────────────────────────────
--
-- Compatibility
-- -------------
-- ALTER TABLE ... DROP COLUMN requires SQLite 3.35+. Cloudflare D1
-- ships a recent SQLite and supports DROP COLUMN.
--
-- How to apply
-- ------------
-- The D1 console has historically been unreliable with multi-
-- statement pastes in this project. Apply each statement ONE AT A
-- TIME and verify the column count after each:
--
--   SELECT COUNT(*) FROM pragma_table_info('enquiries');
--
-- Expected counts: 97 before the first DROP, decrementing by one
-- per statement, 64 after the 33rd.
--
-- Strongly recommended: take a D1 /bookmark in the dashboard before
-- starting so the run is point-in-time recoverable.

-- ── PR1's 17 columns (purchase_* + remortgage_transfer_has_mortgage)

ALTER TABLE enquiries DROP COLUMN purchase_tenure;
ALTER TABLE enquiries DROP COLUMN purchase_price;
ALTER TABLE enquiries DROP COLUMN purchase_postcode;
ALTER TABLE enquiries DROP COLUMN purchase_mortgage;
ALTER TABLE enquiries DROP COLUMN purchase_lender;
ALTER TABLE enquiries DROP COLUMN purchase_ownership_type;
ALTER TABLE enquiries DROP COLUMN purchase_first_time_buyer;
ALTER TABLE enquiries DROP COLUMN purchase_new_build;
ALTER TABLE enquiries DROP COLUMN purchase_shared_ownership;
ALTER TABLE enquiries DROP COLUMN purchase_help_to_buy;
ALTER TABLE enquiries DROP COLUMN purchase_is_company;
ALTER TABLE enquiries DROP COLUMN purchase_buy_to_let;
ALTER TABLE enquiries DROP COLUMN purchase_gifted_deposit;
ALTER TABLE enquiries DROP COLUMN purchase_additional_property;
ALTER TABLE enquiries DROP COLUMN purchase_uk_resident_for_sdlt;
ALTER TABLE enquiries DROP COLUMN purchase_lifetime_isa;
ALTER TABLE enquiries DROP COLUMN remortgage_transfer_has_mortgage;

-- ── PR2's 16 columns (sale_* + *_combined + remortgage_transfer_*)

ALTER TABLE enquiries DROP COLUMN sale_tenure;
ALTER TABLE enquiries DROP COLUMN sale_price;
ALTER TABLE enquiries DROP COLUMN sale_postcode;
ALTER TABLE enquiries DROP COLUMN sale_mortgage;
ALTER TABLE enquiries DROP COLUMN sale_mortgage_combined;
ALTER TABLE enquiries DROP COLUMN management_company_combined;
ALTER TABLE enquiries DROP COLUMN tenanted_combined;
ALTER TABLE enquiries DROP COLUMN number_of_sellers_combined;
ALTER TABLE enquiries DROP COLUMN remortgage_transfer_tenure;
ALTER TABLE enquiries DROP COLUMN remortgage_transfer_price;
ALTER TABLE enquiries DROP COLUMN remortgage_transfer_postcode;
ALTER TABLE enquiries DROP COLUMN remortgage_transfer_current_lender;
ALTER TABLE enquiries DROP COLUMN remortgage_transfer_new_lender;
ALTER TABLE enquiries DROP COLUMN remortgage_transfer_additional_borrowing;
ALTER TABLE enquiries DROP COLUMN remortgage_transfer_owners_changing;
ALTER TABLE enquiries DROP COLUMN remortgage_transfer_ownership_type;
