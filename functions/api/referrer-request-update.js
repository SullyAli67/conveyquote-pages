// functions/api/referrer-request-update.js
//
// Referrer "Request update" on an instructed case. The referrer writes a
// message; it is emailed to the assigned panel firm with ConveyQuote
// (info@) copied in. Replies go to both the referrer and ConveyQuote.
// If the firm has no email on file, the message goes to info@ only so it
// is never lost. Sample (SAMPLE-) cases show a confirmation and send nothing.
import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";
import { isSampleReference } from "../lib/sample-cases.js";

const MESSAGE_MAX_LENGTH = 1000;
const ADMIN_EMAIL = "info@conveyquote.uk";

const escapeHtml = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "referrer");
    if (!session) return unauthorised();

    const referrerId = session.user_id;
    const { reference, message } = await request.json();
    const text = String(message || "").trim();

    if (!reference) {
      return jsonResponse({ success: false, error: "reference required." }, 400);
    }
    if (!text) {
      return jsonResponse({ success: false, error: "Please write what you would like to know." }, 400);
    }
    if (text.length > MESSAGE_MAX_LENGTH) {
      return jsonResponse(
        { success: false, error: `Please keep your message to ${MESSAGE_MAX_LENGTH} characters or fewer.` },
        400
      );
    }

    // Verify enquiry belongs to this referrer
    const enquiry = await env.DB.prepare(
      `SELECT e.reference, e.client_name, e.property_address, e.assigned_firm_id, e.assigned_firm_name, e.case_status,
              p.contact_email as firm_email, p.firm_name
       FROM enquiries e
       LEFT JOIN panel_firms p ON p.id = e.assigned_firm_id
       WHERE e.reference = ? AND e.referrer_id = ?
       LIMIT 1`
    ).bind(reference, referrerId).first();

    if (!enquiry) {
      return jsonResponse({ success: false, error: "Enquiry not found." }, 404);
    }

    // Sample cases show the confirmation but never email anyone.
    if (isSampleReference(enquiry.reference)) {
      return jsonResponse({
        success: true,
        message: "✓ Message sent — the solicitor will reply to you by email. (Sample case: nothing was sent.)",
      });
    }

    if (!enquiry.assigned_firm_id) {
      return jsonResponse({ success: false, error: "No firm has been assigned to this matter yet." }, 400);
    }
    if (!env.RESEND_API_KEY) {
      return jsonResponse({ success: false, error: "Email is not configured. Please contact ConveyQuote." }, 503);
    }

    const referrer = await env.DB.prepare(
      `SELECT referrer_name, contact_email, portal_email FROM referrers WHERE id = ? LIMIT 1`
    ).bind(referrerId).first();
    const referrerName = referrer?.referrer_name || "A referrer";
    const referrerEmail = String(referrer?.contact_email || referrer?.portal_email || "").trim();

    const firmEmail = String(enquiry.firm_email || "").trim();
    const firmName = enquiry.firm_name || enquiry.assigned_firm_name || "the assigned firm";
    const portalUrl = "https://conveyquote.uk/firm-portal/";

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
        <div style="background:#0f2747;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:18px;">Update requested by ${escapeHtml(referrerName)}</h2>
        </div>
        <div style="padding:20px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;font-size:14px;line-height:1.6;">
          ${firmEmail ? "" : `<p style="background:#fef3c7;padding:8px 12px;border-radius:6px;">${escapeHtml(firmName)} has no email address on file, so this was sent to ConveyQuote only. Please pass it on.</p>`}
          <table style="border-collapse:collapse;width:100%;margin:0 0 12px;">
            <tr><td style="padding:6px 0;color:#6b7280;width:40%;">Reference</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(reference)}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Property</td><td style="padding:6px 0;">${escapeHtml(enquiry.property_address || "Not provided")}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Client</td><td style="padding:6px 0;">${escapeHtml(enquiry.client_name || "Not provided")}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Current status</td><td style="padding:6px 0;">${escapeHtml(enquiry.case_status || "Not yet updated")}</td></tr>
          </table>
          <p style="margin:0 0 6px;font-weight:600;">Message from ${escapeHtml(referrerName)}:</p>
          <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;padding:12px 14px;white-space:pre-wrap;">${escapeHtml(text)}</div>
          <p style="margin:16px 0 0;">Reply to this email to answer ${escapeHtml(referrerName)} directly (ConveyQuote is copied in), and please update the case status in your firm portal.</p>
          <p style="margin:16px 0 0;">
            <a href="${portalUrl}" style="background:#0f2747;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Log in to Firm Portal →</a>
          </p>
          <p style="margin-top:20px;font-size:12px;color:#9ca3af;">Sent via ConveyQuote · conveyquote.uk</p>
        </div>
      </div>`;

    const payload = {
      from: "ConveyQuote <noreply@conveyquote.uk>",
      to: [firmEmail || ADMIN_EMAIL],
      reply_to: referrerEmail ? [referrerEmail, ADMIN_EMAIL] : [ADMIN_EMAIL],
      subject: `Update requested – ${reference}${enquiry.property_address ? ` – ${enquiry.property_address}` : ""}`,
      html,
    };
    if (firmEmail) payload.cc = [ADMIN_EMAIL];

    const sendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.RESEND_API_KEY}` },
      body: JSON.stringify(payload),
    }).catch((e) => {
      console.error("referrer-request-update: email threw:", e);
      return null;
    });
    if (!sendResp || !sendResp.ok) {
      const body = sendResp ? await sendResp.text().catch(() => "") : "";
      console.error(`referrer-request-update: email failed for ${reference}: ${sendResp?.status} ${body}`);
      return jsonResponse(
        { success: false, error: "Your message couldn't be sent. Please try again, or email info@conveyquote.uk." },
        502
      );
    }

    // Keep a record of the request on the case history.
    try {
      await env.DB.prepare(
        `INSERT INTO audit_log (action, reference, firm_id, firm_name, actor, details)
         VALUES ('referrer_update_request', ?, ?, ?, 'referrer', ?)`
      ).bind(reference, enquiry.assigned_firm_id, firmName, `${referrerName}: ${text}`).run();
    } catch (logErr) {
      console.error("referrer-request-update: audit log failed:", logErr);
    }

    return jsonResponse({
      success: true,
      message: firmEmail
        ? `✓ Message sent to ${firmName}. ConveyQuote is copied in, and replies will come to you by email.`
        : "✓ Message sent to ConveyQuote, who will pass it to the solicitor.",
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
