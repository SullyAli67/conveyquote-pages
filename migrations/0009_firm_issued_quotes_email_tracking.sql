-- Phase 5 of Type 2 firm-quoting product — email delivery tracking.
--
-- Adds three columns to firm_issued_quotes so the firm portal can:
--   1. record when a quote was last emailed to the client,
--   2. surface the Resend message id (the firm references it if chasing
--      delivery — we deliberately do NOT wire up Resend webhooks here),
--   3. retain a short error string for the last failed send so the firm
--      sees "Last send failed" instead of a silent failure.
--
-- SQLite idempotency caveat
-- -------------------------
-- ALTER TABLE … ADD COLUMN is NOT idempotent in SQLite — there is no
-- "IF NOT EXISTS" form for ADD COLUMN. If this migration is run twice,
-- the second run will error with "duplicate column name". That's fine
-- in our deployment flow (Sully applies migrations once via the D1
-- console after merge), but anyone re-running locally should drop the
-- columns first or skip this file.

ALTER TABLE firm_issued_quotes ADD COLUMN client_email_sent_at TEXT;
ALTER TABLE firm_issued_quotes ADD COLUMN client_email_message_id TEXT;
ALTER TABLE firm_issued_quotes ADD COLUMN client_email_last_error TEXT;
