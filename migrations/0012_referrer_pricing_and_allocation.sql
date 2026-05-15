-- Pattern B referrer workflow — per-referrer pricing and allocation flow.
--
-- Adds a referrer_fee_configs table (mirrors firm_fee_configs from the
-- PR #39 / 0010 migration) so the Pattern B engine can price per
-- referrer instead of falling back to the global customer price book.
-- Also adds four columns to enquiries to capture the new lifecycle:
--   • allocation_requested_at — referrer asks admin to allocate
--   • allocated_at            — admin approves and a panel firm is set
--   • referrer_note           — optional 500-char note travelling with
--                                the quote and visible in My Referrals
--   • parent_enquiry_id       — points back to the original referral
--                                when a referrer re-quotes
--
-- Per-referrer pricing semantics
-- ------------------------------
-- One config per referrer (Sully's product call). The schema mirrors
-- firm_fee_configs verbatim including the supplement_key column from
-- PR #39, so the same canonical 11 supplement keys + matching logic
-- applied to firm Issue Quote also apply to referrer-issued quotes.
-- A row with supplement_key = NULL is an unconditional base fee. A row
-- with a non-NULL supplement_key is included only when the matching
-- request flag is set on the form. Same warnings, same validation.
--
-- SQLite idempotency caveat
-- -------------------------
-- ALTER TABLE … ADD COLUMN is NOT idempotent in SQLite — there is no
-- "IF NOT EXISTS" form. If this migration is re-run on a D1 environment
-- where the columns already exist, each ADD COLUMN errors with
-- "duplicate column name". That is expected and safe — Sully applies
-- migrations once via the D1 console after merge. The CREATE TABLE
-- below uses IF NOT EXISTS so re-runs are a no-op for the table.

CREATE TABLE IF NOT EXISTS referrer_fee_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_id INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  label TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  includes_vat INTEGER DEFAULT 0,
  is_disbursement INTEGER DEFAULT 0,
  supplement_key TEXT,
  sort_order INTEGER DEFAULT 0
);

ALTER TABLE enquiries ADD COLUMN allocation_requested_at TEXT;
ALTER TABLE enquiries ADD COLUMN allocated_at TEXT;
ALTER TABLE enquiries ADD COLUMN referrer_note TEXT;
ALTER TABLE enquiries ADD COLUMN parent_enquiry_id INTEGER;
