// functions/api/referrer-request-update.js
import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";

const escapeHtml = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "referrer");
    if (!session) return unauthorised();

    const referrerId = session.user_id;
    const { reference } = await request.json();

    if (!reference) {
      return jsonResponse({ success: false, error: "reference required." }, 400);
    }

    // Verify enquiry belongs to this referrer
    const enquiry = await env.DB.prepare(
      `SELECT e.reference, e.client_name, e.assigned_firm_id, e.assigned_firm_name, e.case_status,
              p.contact_email as firm_email, p.firm_name
       FROM enquiries e
       LEFT JOIN panel_firms p ON p.id = e.assigned_firm_id
       WHERE e.reference = ? AND e.referrer_id = ?
       LIMIT 1`
    ).bind(reference, referrerId).first();

    if (!enquiry) {
      return jsonResponse({ success: false, error: "Enquiry not found." }, 404);
    }

    if (!enquiry.assigned_firm_id) {
      return jsonResponse({ success: false, error: "No firm has been assigned to this matter yet." }, 400);
    }

    // Load referrer name
    const referrer = await env.DB.prepare(
      `SELECT referrer_name FROM referrers WHERE id = ? LIMIT 1`
    ).bind(referrerId).first();

    const firmEmail = enquiry.firm_email;
    const portalUrl = "https://conveyquote.uk/firm-portal/";

    // Email the firm
    if (firmEmail && env.RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "ConveyQuote <noreply@conveyquote.uk>",
          to: [firmEmail],
          cc: ["info@conveyquote.uk"],
          subject: `Status Update Requested – ${reference}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
              <div style="background:#0f2747;padding:20px 24px;border-radius:8px 8px 0 0;">
                <h2 style="color:#fff;margin:0;font-size:18px;">Status Update Requested</h2>
              </div>
              <div style="padding:20px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                <p><strong>${escapeHtml(referrer?.referrer_name || "A referrer")}</strong> has requested a status update on the following matter:</p>
                <table style="border-collapse:collapse;width:100%;margin:12px 0;">
                  <tr><td style="padding:7px 0;color:#6b7280;width:40%;">Reference</td><td style="padding:7px 0;font-weight:600;">${escapeHtml(reference)}</td></tr>
                  <tr><td style="padding:7px 0;color:#6b7280;">Client</td><td style="padding:7px 0;">${escapeHtml(enquiry.client_name || "Not provided")}</td></tr>
                  <tr><td style="padding:7px 0;color:#6b7280;">Current status</td><td style="padding:7px 0;">${escapeHtml(enquiry.case_status || "Not yet updated")}</td></tr>
                </table>
                <p>Please log in to your firm portal and update the case status at your earliest convenience.</p>
                <div style="margin-top:16px;">
                  <a href="${portalUrl}" style="background:#0f2747;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">
                    Log in to Firm Portal →
                  </a>
                </div>
                <p style="margin-top:20px;font-size:12px;color:#9ca3af;">Powered by ConveyQuote · conveyquote.uk</p>
              </div>
            </div>
          `,
        }),
      }).catch((e) => console.error("Update request email error:", e));
    }

    // Also email admin
    if (env.RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "ConveyQuote <noreply@conveyquote.uk>",
          to: ["info@conveyquote.uk"],
          subject: `Status update requested by referrer – ${reference}`,
          html: `<p style="font-family:sans-serif;"><strong>${escapeHtml(referrer?.referrer_name || "A referrer")}</strong> requested a status update for ${escapeHtml(reference)} from ${escapeHtml(enquiry.firm_name || "the assigned firm")}.</p>`,
        }),
      }).catch(() => {});
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
