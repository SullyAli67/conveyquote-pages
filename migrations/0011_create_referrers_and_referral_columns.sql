-- Retroactive capture of the referrer-portal schema.
--
-- The referrers table and the referrer-related columns on enquiries
-- were created directly in production D1 without a corresponding
-- migration file in repo. This migration captures the live state so
-- that fresh D1 environments can be provisioned from `wrangler d1
-- migrations apply` instead of needing manual recovery from a prod
-- dump.
--
-- The column orders, types, and defaults below were taken verbatim
-- from `SELECT sql FROM sqlite_master` on production. Notable history:
-- marketing_fee and fee_markup were added to referrers after
-- created_at/updated_at, and their position in the CREATE TABLE
-- preserves that order so a fresh table is byte-equivalent.
--
-- Expected behaviour
-- ------------------
--   Production D1 (schema already in place):
--     CREATE TABLE IF NOT EXISTS referrers — no-op (table exists).
--     ALTER TABLE ... ADD COLUMN — each errors with
--     "duplicate column name". This is expected and safe to ignore.
--     Sully will apply this only on fresh environments.
--
--   Fresh D1 (empty enquiries, no referrers table):
--     The CREATE creates the table; the ALTERs add the referrer
--     columns to the existing enquiries table (assumes enquiries
--     was created via an earlier migration / schema bootstrap).
--
-- Idempotency caveat
-- ------------------
-- SQLite does not support `ALTER TABLE … ADD COLUMN IF NOT EXISTS`.
-- The ADD COLUMN statements are individual rather than batched so
-- that a partial failure on one does not block the rest.
-- referrer-submit-enquiry.js:38-60 already PRAGMAs `table_info` and
-- filters insert columns to those that exist, so even partial
-- application leaves the runtime in a consistent state.

CREATE TABLE IF NOT EXISTS referrers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  referral_fee REAL DEFAULT 0,
  portal_email TEXT,
  portal_password_hash TEXT,
  portal_active INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  marketing_fee REAL NOT NULL DEFAULT 50,
  fee_markup REAL DEFAULT 0
);

ALTER TABLE enquiries ADD COLUMN referrer_id INTEGER;
ALTER TABLE enquiries ADD COLUMN referral_fee_payable INTEGER DEFAULT 0;
ALTER TABLE enquiries ADD COLUMN referral_fee_amount REAL DEFAULT 0;
ALTER TABLE enquiries ADD COLUMN referred_at TEXT;
ALTER TABLE enquiries ADD COLUMN property_address TEXT;
ALTER TABLE enquiries ADD COLUMN fall_through_reason TEXT;
ALTER TABLE enquiries ADD COLUMN target_completion_date TEXT;
ALTER TABLE enquiries ADD COLUMN negotiator_name TEXT;
