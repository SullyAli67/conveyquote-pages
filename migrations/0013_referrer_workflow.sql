-- Referrer workflow side-table — routes around the enquiries 100-column cap.
--
-- Background
-- ----------
-- Migration 0012 attempted to ADD four columns to the enquiries table
-- (allocation_requested_at, allocated_at, referrer_note,
-- parent_enquiry_id). All four ALTER TABLE statements failed in the D1
-- console with "too many columns on sqlite_altertab_enquiries:
-- SQLITE_ERROR" because enquiries is at the SQLite/D1 100-column cap
-- (confirmed via SELECT COUNT(*) FROM pragma_table_info('enquiries')).
-- The other half of migration 0012 (CREATE TABLE referrer_fee_configs)
-- succeeded, so per-referrer pricing already works in production.
--
-- Solution
-- --------
-- Hold the four workflow fields in a separate table keyed by enquiry_id.
-- PRIMARY KEY on enquiry_id enforces the 1:1 relationship — at most one
-- workflow row per enquiry. Workflow events (allocation request,
-- approval, referrer note, re-quote parent link) live here; the
-- enquiry itself stays in enquiries unchanged.
--
-- Endpoints touching the four fields read via LEFT JOIN
-- referrer_workflow ON referrer_workflow.enquiry_id = enquiries.id and
-- write via INSERT … ON CONFLICT (enquiry_id) DO UPDATE … (the UPSERT
-- pattern — creates the row on first touch, updates on subsequent
-- calls). Missing workflow rows behave like NULL fields, matching the
-- semantics the original ALTER TABLE columns would have had.
--
-- Note: migration 0012 has been edited to remove the four failed ALTER
-- TABLE lines. Only the CREATE TABLE for referrer_fee_configs remains.

CREATE TABLE IF NOT EXISTS referrer_workflow (
  enquiry_id INTEGER PRIMARY KEY,
  allocation_requested_at TEXT,
  allocated_at TEXT,
  referrer_note TEXT,
  parent_enquiry_id INTEGER
);
