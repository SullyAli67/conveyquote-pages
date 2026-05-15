// functions/api/referrer-decline-allocation.js
//
// Pattern B admin side of the dual-trigger allocation flow. Admin
// declines a referrer's allocation request, clearing
// allocation_requested_at so the referrer can re-request later. An
// email goes to the referrer with the decline reason supplied by admin.
//
// Auth: admin session.

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";

const escapeHtml = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const REASON_MAX_LENGTH = 500;

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "admin");
    if (!session) return unauthorised();

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse({ success: false, error: "Invalid request body." }, 400);
    }

    const reference = String(body.reference || "").trim();
    if (!reference) {
      return jsonResponse({ success: false, error: "reference is required." }, 400);
    }

    const reason = String(body.reason || "").trim();
    if (reason.length > REASON_MAX_LENGTH) {
      return jsonResponse(
        {
          success: false,
          error: `Reason must be ${REASON_MAX_LENGTH} characters or fewer.`,
        },
        400
      );
    }

    const enquiry = await env.DB.prepare(
      `SELECT id, reference, referrer_id, client_name, client_email,
              property_address, transaction_type, allocation_requested_at,
              allocated_at
         FROM enquiries
        WHERE reference = ?
        LIMIT 1`
    ).bind(reference).first();

    if (!enquiry) {
      return jsonResponse({ success: false, error: "Referral not found." }, 404);
    }

    if (!enquiry.allocation_requested_at) {
      return jsonResponse(
        { success: false, error: "No allocation request is pending on this referral." },
        409
      );
    }

    if (enquiry.allocated_at) {
      return jsonResponse(
        { success: false, error: "This referral has already been allocated and cannot be declined." },
        409
      );
    }

    await env.DB.prepare(
      `UPDATE enquiries SET allocation_requested_at = NULL, updated_at = datetime('now') WHERE id = ?`
    ).bind(enquiry.id).run();

    try {
      await env.DB.prepare(
        `INSERT INTO audit_log (action, reference, actor, details)
         VALUES ('allocation_declined', ?, 'admin', ?)`
      ).bind(reference, reason || null).run();
    } catch (e) {
      console.error("Audit log error:", e);
    }

    if (enquiry.referrer_id && env.RESEND_API_KEY) {
      const referrer = await env.DB.prepare(
        `SELECT referrer_name, contact_email, portal_email FROM referrers WHERE id = ? LIMIT 1`
      ).bind(enquiry.referrer_id).first();
      const referrerEmail = referrer?.contact_email || referrer?.portal_email;
      if (referrerEmail) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "ConveyQuote <quotes@conveyquote.uk>",
            to: [referrerEmail],
            subject: `Allocation request declined — ${reference}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
              <div style="background:#0f2747;padding:20px 24px;border-radius:8px 8px 0 0;">
                <h2 style="color:#fff;margin:0;font-size:18px;">Allocation request declined</h2>
              </div>
              <div style="padding:20px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                <p style="margin:0 0 12px;font-size:14px;">Hi ${escapeHtml(referrer?.referrer_name || "")},</p>
                <p style="margin:0 0 12px;font-size:14px;">Your allocation request for <strong>${escapeHtml(enquiry.client_name || enquiry.client_email || "")}</strong> (${escapeHtml(reference)}) has been declined.</p>
                ${reason ? `<div style="margin:14px 0;padding:12px 14px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;color:#334155;"><strong>Reason:</strong> ${escapeHtml(reason)}</div>` : ""}
                <p style="margin:0;font-size:13px;color:#6b7280;">You can request allocation again from your portal once any blocking points are resolved.</p>
              </div>
            </div>`,
          }),
        }).catch((err) => console.error("Decline allocation email error:", err));
      }
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
