-- Tracks the three-stage follow-up nudge sequence on outstanding quotes.
-- All columns nullable / safely defaulted; existing rows are unaffected.
--
-- NOTE: quote_sent_at already exists on production D1 (confirmed via
-- PRAGMA table_info — column index 74). It was added ad-hoc during batch 4
-- setup but never migrated formally. The first ALTER below is commented out
-- to reflect that. If you're applying this to a fresh DB that does NOT have
-- quote_sent_at yet, uncomment the first line.

-- ALTER TABLE enquiries ADD COLUMN quote_sent_at TEXT;
ALTER TABLE enquiries ADD COLUMN followup_stage INTEGER NOT NULL DEFAULT 0;
ALTER TABLE enquiries ADD COLUMN last_followup_at TEXT;
ALTER TABLE enquiries ADD COLUMN followups_disabled INTEGER NOT NULL DEFAULT 0;
