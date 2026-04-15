// functions/api/firm-update-case-status.js
// Firms update the status of a referred matter
// Triggers email to info@conveyquote.uk on every change
// Sets ETA on first acceptance, allows pushing forward when expired

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";

const VALID_STATUSES = [
  "accepted",
  "client_care_sent",
  "id_requested",
  "id_received",
  "searches_ordered",
  "searches_received",
  "enquiries_raised",
  "enquiries_replied",
  "report_on_title",
  "exchange_ready",
  "exchanged",
  "completion_ready",
  "completed",
  "on_hold",
  "withdrawn",
];

const STATUS_LABELS = {
  accepted: "Accepted",
  client_care_sent: "Client Care Sent",
  id_requested: "ID Requested",
  id_received: "ID Received",
  searches_ordered: "Searches Ordered",
  searches_received: "Searches Received",
  enquiries_raised: "Enquiries Raised",
  enquiries_replied: "Enquiries Replied",
  report_on_title: "Report on Title Sent",
  exchange_ready: "Ready to Exchange",
  exchanged: "Exchanged",
  completion_ready: "Ready to Complete",
  completed: "Completed",
  on_hold: "On Hold",
  withdrawn: "Withdrawn",
};

// Returns next weekday 2 months from now
function calcEta() {
  const d = new Date();
  d.setMonth(d.getMonth() + 2);
  // Push to next Monday if weekend
  const day = d.getDay();
  if (day === 0) d.setDate(d.getDate() + 1);
  if (day === 6) d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
}

const escapeHtml = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "firm");
    if (!session) return unauthorised();

    const firmId = session.user_id;
    const { reference, status, notes } = await request.json();

    if (!reference || !status) {
      return jsonResponse({ success: false, error: "reference and status required." }, 400);
    }

    if (!VALID_STATUSES.includes(status)) {
      return jsonResponse({ success: false, error: "Invalid status." }, 400);
    }

    // Verify enquiry belongs to this firm
    const enquiry = await env.DB.prepare(
      `SELECT id, reference, client_name, transaction_type, assigned_firm_name,
              firm_response, case_status, eta_date
       FROM enquiries WHERE reference = ? AND assigned_firm_id = ? LIMIT 1`
    ).bind(reference, firmId).first();

    if (!enquiry) {
      return jsonResponse({ success: false, error: "Enquiry not found or not assigned to your firm." }, 404);
    }

    // Determine ETA: set on first acceptance, can be pushed forward if expired
    let etaDate = enquiry.eta_date || null;

    if (status === "accepted" && !etaDate) {
      etaDate = calcEta();
    }

    // Allow pushing ETA forward if current date has passed it
    if (etaDate && new Date() > new Date(etaDate)) {
      etaDate = calcEta();
    }

    // Update the enquiry
    await env.DB.prepare(
      `UPDATE enquiries
       SET case_status = ?,
           case_notes = COALESCE(?, case_notes),
           eta_date = ?,
           firm_response = CASE WHEN ? = 'accepted' AND firm_response IS NULL THEN 'accepted' ELSE firm_response END,
           updated_at = datetime('now')
       WHERE reference = ?`
    ).bind(status, notes || null, etaDate, status, reference).run();

    // Audit log
    try {
      await env.DB.prepare(
        `INSERT INTO audit_log (action, reference, firm_id, firm_name, actor, details)
         VALUES ('case_status_changed', ?, ?, ?, 'firm', ?)`
      ).bind(reference, firmId, firm?.firm_name || null, `Status changed to: ${statusLabel}${notes ? ` — ${notes}` : ''}`).run();
    } catch (e) { console.error("Audit log error:", e); }

    // Load firm name
    const firm = await env.DB.prepare(
      `SELECT firm_name, contact_email FROM panel_firms WHERE id = ? LIMIT 1`
    ).bind(firmId).first();

    const firmName = firm?.firm_name || "Unknown Firm";
    const statusLabel = STATUS_LABELS[status] || status;

    // Email info@conveyquote.uk
    if (env.RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "ConveyQuote <noreply@conveyquote.uk>",
          to: ["info@conveyquote.uk"],
          subject: `Case Update: ${statusLabel} — ${reference}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
              <div style="background:#0f2747;padding:20px 24px;border-radius:8px 8px 0 0;">
                <h2 style="color:#fff;margin:0;font-size:18px;">Case Status Update</h2>
              </div>
              <div style="padding:20px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                <table style="border-collapse:collapse;width:100%;">
                  <tr><td style="padding:8px 0;color:#6b7280;width:40%;">Reference</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(reference)}</td></tr>
                  <tr><td style="padding:8px 0;color:#6b7280;">Firm</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(firmName)}</td></tr>
                  <tr><td style="padding:8px 0;color:#6b7280;">Client</td><td style="padding:8px 0;">${escapeHtml(enquiry.client_name || "Not provided")}</td></tr>
                  <tr><td style="padding:8px 0;color:#6b7280;">New status</td><td style="padding:8px 0;"><strong style="color:#0f2747;">${escapeHtml(statusLabel)}</strong></td></tr>
                  ${etaDate ? `<tr><td style="padding:8px 0;color:#6b7280;">ETA</td><td style="padding:8px 0;">${new Date(etaDate).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</td></tr>` : ""}
                  ${notes ? `<tr><td style="padding:8px 0;color:#6b7280;">Notes</td><td style="padding:8px 0;">${escapeHtml(notes)}</td></tr>` : ""}
                </table>
                <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">Powered by ConveyQuote</p>
              </div>
            </div>
          `,
        }),
      }).catch((e) => console.error("Status email error:", e));
    }

    return jsonResponse({ success: true, reference, status, eta_date: etaDate });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
