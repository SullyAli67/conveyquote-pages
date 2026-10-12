-- 0021_referrer_case_fees.sql
--
-- Separates the two fees on a case. Does not add columns to enquiries.
--
--   firm fee     — what the panel firm pays ConveyQuote.
--                  Stays on enquiries.referral_fee_payable / referral_fee_amount.
--                  Set at allocation; billed on the firm invoice.
--   referrer fee — what ConveyQuote pays the referrer out of it.
--                  Moves to the new side table referrer_case_fees.
--                  Shown only in the referrer portal.
--
-- Until now one pair of columns held whichever was written last: the
-- referrer's fee when the referral was submitted, then whatever was in the
-- allocation box (usually the firm's default) once the case was allocated.
--
-- How to apply (Cloudflare dashboard → D1 → conveyquote-db → Console)
-- Paste ONE statement at a time, in order.
--
-- ⚠ Do STEP 1 and STEP 2 BEFORE merging the pull request that ships this
-- (the new referrer portal reads referrer_case_fees). Straight AFTER
-- merging, run STEP 2 once more (it only adds rows that are missing, so it
-- picks up any referral submitted in between) and then STEP 3.

-- ── STEP 1 — create the side table. Safe to re-run. ───────────────

CREATE TABLE IF NOT EXISTS referrer_case_fees (
  enquiry_id INTEGER PRIMARY KEY,
  amount REAL NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ── STEP 2 — fill it from existing referred cases. Safe to re-run. ─
--   * Not yet allocated: the fee on the case is the referrer's fee, so
--     copy it.
--   * Already allocated: the fee on the case may be the firm's, so use the
--     referrer's rate for the matter type instead (main rate for purchase /
--     sale / sale & purchase, remortgage rate for remortgage / transfer,
--     nothing for other matter types). Review these with the STEP 4 query.

INSERT INTO referrer_case_fees (enquiry_id, amount)
SELECT e.id,
       CASE
         WHEN e.assigned_firm_id IS NULL THEN
           CASE WHEN e.referral_fee_payable = 1 THEN COALESCE(e.referral_fee_amount, 0) ELSE 0 END
         WHEN e.transaction_type IN ('purchase', 'sale', 'sale_purchase') THEN COALESCE(r.referral_fee, 0)
         WHEN e.transaction_type IN ('remortgage', 'transfer', 'remortgage_transfer') THEN COALESCE(r.remortgage_referral_fee, 0)
         ELSE 0
       END
FROM enquiries e
JOIN referrers r ON r.id = e.referrer_id
WHERE NOT EXISTS (SELECT 1 FROM referrer_case_fees c WHERE c.enquiry_id = e.id);

-- ── STEP 3 — after merging: clear the firm fee on referred cases that
-- are not yet allocated (it held the referrer's fee; the firm fee is
-- entered when you allocate). ─────────────────────────────────────

UPDATE enquiries
SET referral_fee_payable = 0, referral_fee_amount = 0
WHERE referrer_id IS NOT NULL
  AND assigned_firm_id IS NULL
  AND id IN (SELECT enquiry_id FROM referrer_case_fees);

-- ── STEP 4 — check. ───────────────────────────────────────────────

-- (4a) Expect one row naming referrer_case_fees.
SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'referrer_case_fees';

-- (4b) Expect 0: every referred case has a referrer fee row.
SELECT COUNT(*) AS referred_cases_missing_fee
FROM enquiries e
WHERE e.referrer_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM referrer_case_fees c WHERE c.enquiry_id = e.id);

-- (4c) Review every allocated case: the firm fee (billed to the firm) and,
-- for referred cases, the referrer fee (paid to the referrer). Correct
-- any wrong figure on the case's Fees panel in admin.
SELECT e.reference, e.transaction_type, p.firm_name,
       CASE WHEN e.referral_fee_payable = 1 THEN e.referral_fee_amount END AS firm_fee,
       p.default_referral_fee AS firm_default,
       r.referrer_name, c.amount AS referrer_fee
FROM enquiries e
LEFT JOIN panel_firms p ON p.id = e.assigned_firm_id
LEFT JOIN referrers r ON r.id = e.referrer_id
LEFT JOIN referrer_case_fees c ON c.enquiry_id = e.id
WHERE e.assigned_firm_id IS NOT NULL
  AND substr(e.reference, 1, 7) <> 'SAMPLE-'
ORDER BY (e.referrer_id IS NULL), e.reference;
