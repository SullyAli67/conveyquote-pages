// functions/api/firm-update-case-status.js
// Firms update the status of a referred matter
// Phase 1 additions:
//   - fallen_through status with mandatory reason
//   - target_completion_date set when Exchanged
//   - automated milestone email to referrer

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
  "fallen_through",   // Phase 1 C
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
  fallen_through: "Fallen Through",
};

// Milestones worth emailing the referrer about
const REFERRER_MILESTONE_STATUSES = new Set([
  "id_received",
  "searches_received",
  "exchanged",
  "completed",
  "fallen_through",
]);

// Returns next weekday 2 months from now
function calcEta() {
  const d = new Date();
  d.setMonth(d.getMonth() + 2);
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
    const { reference, status, notes, fall_through_reason, target_completion_date } = await request.json();

    if (!reference || !status) {
      return jsonResponse({ success: false, error: "reference and status required." }, 400);
    }
    if (!VALID_STATUSES.includes(status)) {
      return jsonResponse({ success: false, error: "Invalid status." }, 400);
    }
    // Phase 1 C: fallen_through requires a reason
    if (status === "fallen_through" && !fall_through_reason) {
      return jsonResponse({ success: false, error: "A reason is required when marking a case as fallen through." }, 400);
    }

    // Fetch enquiry (including referrer info for emails)
    const enquiry = await env.DB.prepare(
      `SELECT e.id, e.reference, e.client_name, e.transaction_type, e.property_address,
              e.assigned_firm_name, e.firm_response, e.case_status, e.eta_date,
              e.referrer_id,
              r.referrer_name, r.portal_email AS referrer_portal_email, r.contact_email AS referrer_contact_email
       FROM enquiries e
       LEFT JOIN referrers r ON r.id = e.referrer_id
       WHERE e.reference = ? AND e.assigned_firm_id = ? LIMIT 1`
    ).bind(reference, firmId).first();

    if (!enquiry) {
      return jsonResponse({ success: false, error: "Enquiry not found or not assigned to your firm." }, 404);
    }

    // ETA: set on first acceptance, push forward if expired
    let etaDate = enquiry.eta_date || null;
    if (status === "accepted" && !etaDate) etaDate = calcEta();
    if (etaDate && new Date() > new Date(etaDate)) etaDate = calcEta();

    // Phase 1 D: target completion date — set when Exchanged (firm can supply it)
    let targetCompletionDate = null;
    if (status === "exchanged" && target_completion_date) {
      targetCompletionDate = target_completion_date;
    }

    // Update enquiry
    await env.DB.prepare(
      `UPDATE enquiries
       SET case_status = ?,
           case_notes = COALESCE(?, case_notes),
           eta_date = ?,
           fall_through_reason = CASE WHEN ? = 'fallen_through' THEN ? ELSE fall_through_reason END,
           target_completion_date = CASE WHEN ? IS NOT NULL THEN ? ELSE target_completion_date END,
           firm_response = CASE WHEN ? = 'accepted' AND firm_response IS NULL THEN 'accepted' ELSE firm_response END,
           updated_at = datetime('now')
       WHERE reference = ?`
    ).bind(
      status,
      notes || null,
      etaDate,
      status, fall_through_reason || null,
      targetCompletionDate, targetCompletionDate,
      status,
      reference
    ).run();

    // Load firm details
    const firm = await env.DB.prepare(
      `SELECT firm_name, contact_email FROM panel_firms WHERE id = ? LIMIT 1`
    ).bind(firmId).first();

    const firmName = firm?.firm_name || "Unknown Firm";
    const statusLabel = STATUS_LABELS[status] || status;

    // Email info@conveyquote.uk (existing behaviour)
    if (env.RESEND_API_KEY) {
      const propertyLine = enquiry.property_address
        ? `<tr><td style="padding:8px 0;color:#6b7280;width:40%;">Property</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(enquiry.property_address)}</td></tr>`
        : "";
      const fallThroughLine = status === "fallen_through" && fall_through_reason
        ? `<tr><td style="padding:8px 0;color:#6b7280;">Reason</td><td style="padding:8px 0;">${escapeHtml(fall_through_reason)}</td></tr>`
        : "";
      const targetLine = targetCompletionDate
        ? `<tr><td style="padding:8px 0;color:#6b7280;">Completion date</td><td style="padding:8px 0;font-weight:600;">${new Date(targetCompletionDate).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</td></tr>`
        : "";

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.RESEND_API_KEY}` },
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
                  ${propertyLine}
                  <tr><td style="padding:8px 0;color:#6b7280;">Firm</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(firmName)}</td></tr>
                  <tr><td style="padding:8px 0;color:#6b7280;">Client</td><td style="padding:8px 0;">${escapeHtml(enquiry.client_name || "Not provided")}</td></tr>
                  <tr><td style="padding:8px 0;color:#6b7280;">New status</td><td style="padding:8px 0;"><strong style="color:#0f2747;">${escapeHtml(statusLabel)}</strong></td></tr>
                  ${fallThroughLine}
                  ${etaDate ? `<tr><td style="padding:8px 0;color:#6b7280;">ETA</td><td style="padding:8px 0;">${new Date(etaDate).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</td></tr>` : ""}
                  ${targetLine}
                  ${notes ? `<tr><td style="padding:8px 0;color:#6b7280;">Notes</td><td style="padding:8px 0;">${escapeHtml(notes)}</td></tr>` : ""}
                </table>
                <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">Powered by ConveyQuote</p>
              </div>
            </div>
          `,
        }),
      }).catch((e) => console.error("Status email error:", e));

      // Phase 1 F: automated milestone email to the referrer
      if (enquiry.referrer_id && REFERRER_MILESTONE_STATUSES.has(status)) {
        const referrerEmail = enquiry.referrer_portal_email || enquiry.referrer_contact_email;
        if (referrerEmail) {
          const milestoneMessages = {
            id_received: "Great news — your client's ID has been received and verified. The case is progressing well.",
            searches_received: "Search results are back. The solicitor is now reviewing and raising any enquiries.",
            exchanged: `Contracts have been exchanged! ${targetCompletionDate ? `Completion is set for ${new Date(targetCompletionDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.` : "A completion date will be confirmed shortly."}`,
            completed: "Congratulations — this matter has completed! Thank you for the referral.",
            fallen_through: `Unfortunately this sale has fallen through${fall_through_reason ? ` (${fall_through_reason})` : ""}. Please contact us if you would like to discuss next steps.`,
          };

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.RESEND_API_KEY}` },
            body: JSON.stringify({
              from: "ConveyQuote <noreply@conveyquote.uk>",
              to: [referrerEmail],
              subject: `Update on ${enquiry.property_address || reference}: ${statusLabel}`,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
                  <div style="background:#0f2747;padding:20px 24px;border-radius:8px 8px 0 0;">
                    <h2 style="color:#fff;margin:0;font-size:18px;">Case Progress Update</h2>
                  </div>
                  <div style="padding:20px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                    <p>Hi ${escapeHtml(enquiry.referrer_name || "there")},</p>
                    <p>${milestoneMessages[status] || `The status on this matter has been updated to <strong>${escapeHtml(statusLabel)}</strong>.`}</p>
                    <table style="border-collapse:collapse;width:100%;margin-top:16px;">
                      ${enquiry.property_address ? `<tr><td style="padding:6px 0;color:#6b7280;width:40%;">Property</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(enquiry.property_address)}</td></tr>` : ""}
                      <tr><td style="padding:6px 0;color:#6b7280;">Client</td><td style="padding:6px 0;">${escapeHtml(enquiry.client_name || "Not provided")}</td></tr>
                      <tr><td style="padding:6px 0;color:#6b7280;">Reference</td><td style="padding:6px 0;">${escapeHtml(reference)}</td></tr>
                    </table>
                    <p style="margin:20px 0 0;"><a href="https://conveyquote.uk/referrer-portal/" style="background:#0f2747;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">View in your portal</a></p>
                    <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">ConveyQuote — if you have questions call us on 0800 XXX XXXX</p>
                  </div>
                </div>
              `,
            }),
          }).catch((e) => console.error("Referrer milestone email error:", e));
        }
      }
    }

    // Audit log
    try {
      await env.DB.prepare(
        `INSERT INTO audit_log (action, reference, firm_id, firm_name, actor, details)
         VALUES ('case_status_changed', ?, ?, ?, 'firm', ?)`
      ).bind(
        reference, firmId, firmName,
        `Status changed to: ${statusLabel}${fall_through_reason ? ` — ${fall_through_reason}` : ""}${notes ? ` — ${notes}` : ""}`
      ).run();
    } catch (e) { console.error("Audit log error:", e); }

    return jsonResponse({ success: true, reference, status, eta_date: etaDate, target_completion_date: targetCompletionDate });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
