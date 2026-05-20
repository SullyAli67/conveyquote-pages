-- Phase C — move invoice data off the enquiries table into a
-- dedicated invoices table.
--
-- Why this migration exists
-- -------------------------
-- The pre-Phase-C invoice model lived in five columns on enquiries:
--   invoice_ref, invoice_json, invoice_status,
--   voided_invoice_ref, voided_invoice_json
--
-- void-invoice.js MOVED the live ref/json into the voided columns
-- and nulled the live ones. This worked for a single void per
-- enquiry, but the moment a re-invoice was then voided, the prior
-- voided values were OVERWRITTEN — only one void could ever survive
-- per enquiry. Audit-history was silently destroyed.
--
-- The one-to-many model below fixes that naturally:
--   • one row per invoice, multiple rows allowed per enquiry
--   • a voided invoice is just a row with status='voided' and
--     voided_at populated — not a separate column pair
--   • re-invoicing simply inserts another row; nothing is moved or
--     overwritten
--
-- The five old columns on enquiries are NOT dropped in this PR. A
-- follow-up cleanup PR drops them after a release cycle confirms
-- nothing still reads them.
--
-- Apply ONE STATEMENT AT A TIME in the D1 console.

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enquiry_id INTEGER NOT NULL,
  invoice_ref TEXT NOT NULL,
  invoice_json TEXT,
  status TEXT NOT NULL DEFAULT 'issued',
  created_at TEXT DEFAULT (datetime('now')),
  voided_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_invoices_enquiry_id ON invoices(enquiry_id);

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_ref ON invoices(invoice_ref);
