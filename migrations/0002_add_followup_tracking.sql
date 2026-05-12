-- Tracks the three-stage follow-up nudge sequence on outstanding quotes.
-- Lives in a separate table because enquiries has hit D1's per-table
-- column ceiling. One row per enquiry that has had a quote sent.

CREATE TABLE IF NOT EXISTS followup_state (
  enquiry_reference TEXT PRIMARY KEY,
  quote_sent_at TEXT,
  followup_stage INTEGER NOT NULL DEFAULT 0,
  last_followup_at TEXT,
  followups_disabled INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (enquiry_reference) REFERENCES enquiries(reference)
);

CREATE INDEX IF NOT EXISTS idx_followup_state_stage
  ON followup_state(followup_stage, quote_sent_at);
