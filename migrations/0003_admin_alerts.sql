-- Records internal admin alert emails so we don't re-nag about the same
-- enquiry within a short window. Generic alert_type column so future alert
-- categories (stale follow-ups, unpaid invoices, etc.) can share the table.

CREATE TABLE IF NOT EXISTS admin_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enquiry_reference TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (enquiry_reference) REFERENCES enquiries(reference)
);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_lookup
  ON admin_alerts(enquiry_reference, alert_type, sent_at);
