-- scripts/demo/remove-sample-cases.sql
--
-- Deletes the sample cases created by seed-sample-cases.sql, and any
-- rows linked to them. Only rows whose enquiry reference starts with
-- "SAMPLE-" are touched. The referrer account itself is NOT deleted.
--
-- Paste ONE statement at a time, in order (linked rows first, the
-- cases last).

-- STEP 1 — preview. Shows the cases that will be removed.
SELECT id, reference, client_name, case_status
FROM enquiries
WHERE substr(reference, 1, 7) = 'SAMPLE-'
ORDER BY reference;

-- STEP 2 — linked rows.
DELETE FROM referrer_fee_payments
WHERE enquiry_id IN (SELECT id FROM enquiries WHERE substr(reference, 1, 7) = 'SAMPLE-');

DELETE FROM referrer_workflow
WHERE enquiry_id IN (SELECT id FROM enquiries WHERE substr(reference, 1, 7) = 'SAMPLE-');

-- The next four should delete nothing (samples never create these),
-- but are included in case anything was clicked during a demo.
DELETE FROM followup_state
WHERE substr(enquiry_reference, 1, 7) = 'SAMPLE-';

DELETE FROM admin_alerts
WHERE substr(enquiry_reference, 1, 7) = 'SAMPLE-';

DELETE FROM invoices
WHERE enquiry_id IN (SELECT id FROM enquiries WHERE substr(reference, 1, 7) = 'SAMPLE-');

DELETE FROM audit_log
WHERE substr(reference, 1, 7) = 'SAMPLE-';

-- STEP 3 — the cases themselves.
DELETE FROM enquiries
WHERE substr(reference, 1, 7) = 'SAMPLE-';

-- STEP 4 — confirm. Expect 0.
SELECT COUNT(*) AS remaining_samples
FROM enquiries
WHERE substr(reference, 1, 7) = 'SAMPLE-';
