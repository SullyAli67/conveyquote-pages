-- 0022_firm_remortgage_fee_and_demo_referrers.sql
--
-- Two additions. Neither touches the enquiries table (it is at the D1
-- 100-column cap).
--
-- 1. panel_firms.remortgage_referral_fee — a second default fee per panel
--    firm for remortgage, transfer of equity and remortgage & transfer
--    cases. panel_firms.default_referral_fee stays the default for every
--    other matter type. When you allocate a case, the Firm fee box fills
--    in from whichever default matches the case. 0 means "not set": the
--    main default is used instead.
--
-- 2. referrer_demo_accounts — a side table marking which referrer logins
--    are demo accounts. A demo account's referrals are priced and shown
--    in its portal straight away, saved as SAMPLE- cases, and never
--    emailed to anyone or sent to the Quote Review queue.
--
-- ⚠ APPLY THIS BEFORE MERGING THE PULL REQUEST THAT SHIPS IT. The new
-- code reads both the column and the table.
--
-- How to apply (Cloudflare dashboard → D1 → conveyquote-db → Console)
-- Paste ONE statement at a time.

-- STEP 1 — add the remortgage / transfer default to panel firms. Run
-- ONCE: SQLite has no "ADD COLUMN IF NOT EXISTS", so a second run errors
-- with "duplicate column name" (harmless).

ALTER TABLE panel_firms ADD COLUMN remortgage_referral_fee REAL NOT NULL DEFAULT 0;

-- STEP 2 — create the demo accounts side table. Safe to re-run.

CREATE TABLE IF NOT EXISTS referrer_demo_accounts (
  referrer_id INTEGER PRIMARY KEY,
  created_at TEXT DEFAULT (datetime('now'))
);

-- STEP 3 — confirm. Expect one row for the column and one for the table.

SELECT name, type, dflt_value FROM pragma_table_info('panel_firms') WHERE name = 'remortgage_referral_fee';

SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'referrer_demo_accounts';

-- STEP 4 — optional. Set Cambridge Solicitors LLP's remortgage /
-- transfer default to £200 (or do it later in the admin Firms tab).

UPDATE panel_firms SET remortgage_referral_fee = 200 WHERE firm_name = 'Cambridge Solicitors LLP';
