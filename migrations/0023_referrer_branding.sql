-- 0023_referrer_branding.sql
--
-- Referrer logos. A side table holding, for each referrer that has uploaded
-- a logo, the key of the image in the logo storage bucket (the same R2
-- bucket firm logos use, under referrer-logos/<referrer id>/). When a
-- referred client is sent their quote, the email shows the referrer's logo
-- with "Powered by ConveyQuote". No change to the referrers or enquiries
-- tables.
--
-- ⚠ APPLY THIS BEFORE MERGING THE PULL REQUEST THAT SHIPS IT.
--
-- How to apply (Cloudflare dashboard → D1 → conveyquote-db → Console)
-- Paste ONE statement at a time.

-- STEP 1 — create the table. Safe to re-run.

CREATE TABLE IF NOT EXISTS referrer_branding (
  referrer_id INTEGER PRIMARY KEY,
  logo_key TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- STEP 2 — confirm. Expect one row naming referrer_branding.

SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'referrer_branding';
