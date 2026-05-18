-- Risk 1 (send-failure ordering) — email delivery tracking on enquiries.
--
-- Mirrors the three columns migration 0009 added to firm_issued_quotes,
-- now applied to enquiries so the same "send first, record outcome"
-- pattern can be used by every endpoint that emails the client.
--
-- Used by:
--   - send-approved-quote.js    (admin sends an approved quote)
--   - referrer-submit-enquiry.js (referrer submits + optionally emails)
--   - accept-quote.js / reject-quote.js (customer-facing flows)
--   - assign-panel-firm.js      (firm + referrer notifications)
--   - firm-respond-referral.js  (admin notification)
--
-- Semantics:
--   client_email_sent_at      ISO timestamp of the most recent successful
--                             send. NULL if it has not yet been emailed.
--   client_email_message_id   Resend message id from the most recent
--                             successful send (used when chasing a
--                             delivery problem with Resend).
--   client_email_last_error   Short error string from the most recent
--                             failed send. Cleared back to NULL on the
--                             next successful send so a row never shows
--                             a stale failure after recovery.
--
-- SQLite idempotency caveat
-- -------------------------
-- ALTER TABLE … ADD COLUMN is NOT idempotent in SQLite — there is no
-- "IF NOT EXISTS" form for ADD COLUMN. Apply ONE STATEMENT AT A TIME
-- in the D1 console; if any of these columns already exist, skip them.
-- enquiries goes from 64 to 67 columns — well within the D1 100-column
-- cap.

ALTER TABLE enquiries ADD COLUMN client_email_sent_at TEXT;
ALTER TABLE enquiries ADD COLUMN client_email_message_id TEXT;
ALTER TABLE enquiries ADD COLUMN client_email_last_error TEXT;
