-- Pattern B referrer workflow — per-referrer pricing.
--
-- Originally this migration also attempted to add four columns to the
-- enquiries table to capture the new lifecycle:
--   • allocation_requested_at — referrer asks admin to allocate
--   • allocated_at            — admin approves and a panel firm is set
--   • referrer_note           — optional 500-char note travelling with
--                                the quote and visible in My Referrals
--   • parent_enquiry_id       — points back to the original referral
--                                when a referrer re-quotes
--
-- All four ALTER TABLE statements failed in the D1 console with the
-- error "too many columns on sqlite_altertab_enquiries: SQLITE_ERROR"
-- — the enquiries table has hit the SQLite/D1 100-column cap
-- (confirmed via SELECT COUNT(*) FROM pragma_table_info('enquiries')).
-- The ALTER TABLE lines have been removed because they cannot be
-- applied. The CREATE TABLE for referrer_fee_configs below DID succeed
-- and is kept for idempotent re-runs.
--
-- The four workflow fields now live in a side-table — see migration
-- 0013_referrer_workflow.sql for the replacement schema and the
-- backend changes that route reads/writes through it.
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
