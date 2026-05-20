-- 0018a_backfill_invoices.sql
--
-- Phase C backfill — copies every existing invoice off the enquiries
-- table into the new invoices table created by 0018.
--
-- Why this backfill exists
-- -----------------------
-- Migration 0018 introduces a 1:N invoices table. Until existing
-- data is copied over, the endpoints rewritten in commit 3 of this
-- PR will not see legacy invoices. This file copies them in two
-- passes: one for the live invoice (if any) and one for the (at
-- most one) voided invoice (if any) preserved on each enquiry.
--
-- Source → target mapping
-- -----------------------
-- For every enquiry e with e.invoice_ref IS NOT NULL:
--   INSERT INTO invoices (enquiry_id, invoice_ref, invoice_json,
--                         status, created_at, voided_at)
--   VALUES (e.id, e.invoice_ref, e.invoice_json,
--           COALESCE(NULLIF(e.invoice_status, ''), 'issued'),
--           e.created_at, NULL)
--
-- For every enquiry e with e.voided_invoice_ref IS NOT NULL:
--   INSERT INTO invoices (enquiry_id, invoice_ref, invoice_json,
--                         status, created_at, voided_at)
--   VALUES (e.id, e.voided_invoice_ref, e.voided_invoice_json,
--           'voided', e.created_at, datetime('now'))
--
-- The exact time of the void is not preserved on enquiries; we set
-- voided_at to the backfill time as the best available approximation.
-- created_at is inherited from the enquiry so the row sorts roughly
-- correctly against future invoices.
--
-- Idempotency
-- -----------
-- Each INSERT is guarded by NOT EXISTS on (enquiry_id, invoice_ref).
-- Re-running this file after it has been applied once is a no-op:
-- the existing invoices rows make the WHERE NOT EXISTS clauses false
-- and zero new rows are inserted.
--
-- Runbook
-- -------
-- 1. STEP 1 — Paste the two SELECTs and review. Confirm the counts
--    look sane and the sample shows real invoice refs.
-- 2. STEP 2 — Paste the two INSERTs. Each is idempotent.
-- 3. STEP 3 — Paste the post-check SELECTs. Confirm
--    invoices_row_count equals live_count + voided_count from STEP 1
--    and that totalPaid matches what get-firm-history previously
--    reported.


-- =================================================================
-- STEP 1 — DRY-RUN. Paste these SELECTs FIRST and review.
-- =================================================================

-- (1a) How many invoice rows will be inserted in total.
SELECT
  (SELECT COUNT(*) FROM enquiries WHERE invoice_ref        IS NOT NULL) AS live_count,
  (SELECT COUNT(*) FROM enquiries WHERE voided_invoice_ref IS NOT NULL) AS voided_count;

-- (1b) Sample 5 candidate live invoices and 5 voided invoices.
SELECT id, reference, invoice_ref, invoice_status,
       substr(invoice_json, 1, 80) AS invoice_json_preview
FROM enquiries
WHERE invoice_ref IS NOT NULL
ORDER BY id DESC
LIMIT 5;

SELECT id, reference, voided_invoice_ref,
       substr(voided_invoice_json, 1, 80) AS voided_invoice_json_preview
FROM enquiries
WHERE voided_invoice_ref IS NOT NULL
ORDER BY id DESC
LIMIT 5;


-- =================================================================
-- STEP 2 — APPLY. Two INSERTs, each idempotent.
-- =================================================================

-- (2/1) Live invoices — status comes from enquiries.invoice_status.
INSERT INTO invoices (enquiry_id, invoice_ref, invoice_json, status, created_at, voided_at)
SELECT
  e.id,
  e.invoice_ref,
  e.invoice_json,
  COALESCE(NULLIF(e.invoice_status, ''), 'issued'),
  e.created_at,
  NULL
FROM enquiries e
WHERE e.invoice_ref IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.enquiry_id = e.id AND i.invoice_ref = e.invoice_ref
  );

-- (2/2) Voided invoices — status hard-coded to 'voided', voided_at
-- set to backfill time (the original void time is not preserved on
-- the enquiries row).
INSERT INTO invoices (enquiry_id, invoice_ref, invoice_json, status, created_at, voided_at)
SELECT
  e.id,
  e.voided_invoice_ref,
  e.voided_invoice_json,
  'voided',
  e.created_at,
  datetime('now')
FROM enquiries e
WHERE e.voided_invoice_ref IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.enquiry_id = e.id AND i.invoice_ref = e.voided_invoice_ref
  );


-- =================================================================
-- STEP 3 — POST-CHECK. Paste these AFTER the INSERTs.
-- =================================================================

-- (3a) Total invoices row count should equal live_count + voided_count
-- from STEP 1 (assuming no new invoices arrived between the dry-run
-- and the apply).
SELECT COUNT(*)                                     AS invoices_row_count,
       SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) AS issued_count,
       SUM(CASE WHEN status = 'paid'   THEN 1 ELSE 0 END) AS paid_count,
       SUM(CASE WHEN status = 'voided' THEN 1 ELSE 0 END) AS voided_count
FROM invoices;

-- (3b) Spot-check: every live invoice on enquiries should now have a
-- matching non-voided row in invoices.
SELECT COUNT(*) AS unmigrated_live
FROM enquiries e
WHERE e.invoice_ref IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.enquiry_id = e.id AND i.invoice_ref = e.invoice_ref
  );

-- (3c) Same check for voided invoices.
SELECT COUNT(*) AS unmigrated_voided
FROM enquiries e
WHERE e.voided_invoice_ref IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.enquiry_id = e.id AND i.invoice_ref = e.voided_invoice_ref
  );
