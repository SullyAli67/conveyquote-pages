-- Adds optional decline-reason tracking to enquiries.
-- Both columns are nullable; existing rows are unaffected.
ALTER TABLE enquiries ADD COLUMN decline_reason TEXT;
ALTER TABLE enquiries ADD COLUMN decline_reason_text TEXT;
