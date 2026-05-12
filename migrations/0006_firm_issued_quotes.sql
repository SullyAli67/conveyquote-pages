-- Phase 2 of Type 2 firm-quoting product.
-- Stores quotes that SaaS-enabled firms have issued to their own clients
-- via the new Issue Quote tab in the firm portal.
--
-- This is independent of the existing `firm_quotes` table (which is the
-- Type 1 firm-built quote rail referred from ConveyQuote). Different
-- product, different lifecycle, different auth scope.
--
-- No foreign key declared (matches existing repo conventions — soft refs
-- only). firm_id maps to panel_firms.id.

CREATE TABLE IF NOT EXISTS firm_issued_quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_id INTEGER NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL DEFAULT '',
  transaction_type TEXT NOT NULL,
  quote_inputs TEXT NOT NULL,
  quote_output TEXT NOT NULL,
  grand_total REAL NOT NULL,
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  notes TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_firm_issued_quotes_firm_id
  ON firm_issued_quotes(firm_id, issued_at DESC);
