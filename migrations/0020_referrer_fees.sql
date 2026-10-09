-- 0020_referrer_fees.sql
--
-- Two additions for referrer fees. Neither touches the enquiries table
-- (it is at the D1 100-column cap).
--
-- 1. referrer_fee_payments — a side table recording that ConveyQuote has
--    PAID a referrer their fee on a case. One row per enquiry (the
--    PRIMARY KEY on enquiry_id enforces it). The referrer portal shows
--    "Paid <date>" when a row exists, "Completed — fee due" when the case
--    is completed with no row, and "Pending completion" otherwise.
--    Rows are added by hand for now (see the example at the bottom).
--
-- 2. referrers.remortgage_referral_fee — a second, lower fee per
--    referrer for remortgage, transfer of equity and remortgage &
--    transfer referrals. referrers.referral_fee stays the fee for
--    purchase, sale and sale & purchase. Any other matter type gets no
--    automatic fee. See functions/lib/referrer-fee.js.
--
-- ⚠ APPLY THIS BEFORE MERGING THE PULL REQUEST THAT SHIPS IT. The new
-- code reads both the table and the column; without them the referrer
-- portal, the admin Referrers tab and referrer submissions will error.
--
-- How to apply (Cloudflare dashboard → D1 → conveyquote-db → Console)
-- Paste ONE statement at a time.

-- STEP 1 — create the payments side table. Safe to re-run.

CREATE TABLE IF NOT EXISTS referrer_fee_payments (
  enquiry_id INTEGER PRIMARY KEY,
  amount REAL NOT NULL,
  paid_at TEXT NOT NULL,
  payment_note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- STEP 2 — add the second fee to referrers. Run ONCE: SQLite has no
-- "ADD COLUMN IF NOT EXISTS", so a second run errors with
-- "duplicate column name" (harmless).

ALTER TABLE referrers ADD COLUMN remortgage_referral_fee REAL NOT NULL DEFAULT 0;

-- STEP 3 — confirm. Expect one row for the table and one for the column.

SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'referrer_fee_payments';

SELECT name, type, dflt_value FROM pragma_table_info('referrers') WHERE name = 'remortgage_referral_fee';

-- ─────────────────────────────────────────────────────────────────
-- Recording a real payment later (example — do not run as part of
-- this migration). Replace the reference, amount and date:
--
--   INSERT INTO referrer_fee_payments (enquiry_id, amount, paid_at, payment_note)
--   SELECT id, 75, '2026-10-31', 'Bank transfer'
--   FROM enquiries WHERE reference = 'CQ-20261009-4821';
