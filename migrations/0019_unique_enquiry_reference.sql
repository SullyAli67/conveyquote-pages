-- 0019_unique_enquiry_reference.sql
--
-- Makes enquiries.reference unique.
--
-- Why
-- ---
-- References are CQ-<date>-<4 random digits>. Until this change they
-- were generated with no uniqueness check, so two enquiries on the same
-- day could share one. Sending a quote, the accept / decline links,
-- follow-ups and the referrer copy on approved quotes all identify an
-- enquiry by reference, so a duplicate could act on the wrong case.
--
-- The application now checks a new reference is free before saving
-- (functions/lib/enquiry-reference.js). This index is the hard
-- guarantee: the database refuses a second enquiry with the same
-- reference, and the application retries with a fresh one.
--
-- This adds an INDEX, not a column, so the enquiries 100-column cap is
-- unaffected. Existing rows are not changed.
--
-- How to apply (Cloudflare dashboard → D1 → conveyquote-db → Console)
-- -------------------------------------------------------------------
-- Paste ONE statement at a time.
--
-- STEP 1 — check for existing duplicates. Expect NO ROWS.
--   If any rows come back, STOP and do not run step 2: the index would
--   fail to create. Those cases need a decision about which keeps the
--   reference (a client may already hold an accept link for it).

SELECT reference, COUNT(*) AS copies
FROM enquiries
WHERE reference IS NOT NULL
GROUP BY reference
HAVING COUNT(*) > 1;

-- STEP 2 — create the unique index. Safe to re-run (IF NOT EXISTS).

CREATE UNIQUE INDEX IF NOT EXISTS idx_enquiries_reference_unique
  ON enquiries(reference);

-- STEP 3 — confirm. Expect one row naming idx_enquiries_reference_unique.

SELECT name, sql
FROM sqlite_master
WHERE type = 'index' AND name = 'idx_enquiries_reference_unique';
