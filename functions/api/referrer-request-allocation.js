// functions/api/referrer-request-allocation.js
//
// Pattern B referrer side of the dual-trigger allocation flow.
// Referrer asks admin to allocate the matter to a panel firm. Admin
// approves separately via /api/assign-panel-firm (existing flow), then
// the enquiry gets allocated_at + assigned_firm_id set.
//
// Auth: referrer session — and the enquiry must belong to the
// authenticated referrer.
//
// Once-only by design: the request flag (allocation_requested_at) is
// set the first time and the endpoint rejects with 409 on a repeat
// request. Admin clears the flag if they decline (see admin allocation
// approval flow).

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

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "referrer");
    if (!session) return unauthorised();

    const referrerId = session.user_id;
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse({ success: false, error: "Invalid request body." }, 400);
    }

    const enquiryId = Number(body.enquiry_id);
    if (!Number.isFinite(enquiryId) || enquiryId <= 0) {
      return jsonResponse({ success: false, error: "enquiry_id is required." }, 400);
    }

    const enquiry = await env.DB.prepare(
      `SELECT id, reference, referrer_id, client_name, client_email,
              property_address, transaction_type, allocation_requested_at,
              allocated_at, referrer_note
         FROM enquiries
        WHERE id = ?
        LIMIT 1`
    ).bind(enquiryId).first();

    if (!enquiry || Number(enquiry.referrer_id) !== Number(referrerId)) {
      return jsonResponse({ success: false, error: "Referral not found." }, 404);
    }

    if (enquiry.allocated_at) {
      return jsonResponse(
        { success: false, error: "This referral has already been allocated to a panel firm." },
        409
      );
    }

    if (enquiry.allocation_requested_at) {
      return jsonResponse(
        { success: false, error: "An allocation request is already pending for this referral." },
        409
      );
    }

    // Check the row hasn't been re-quoted (i.e. superseded) — admin
    // should be working from the latest active row.
    const successor = await env.DB.prepare(
      `SELECT reference FROM enquiries WHERE parent_enquiry_id = ? LIMIT 1`
    ).bind(enquiryId).first();
    if (successor && successor.reference) {
      return jsonResponse(
        {
          success: false,
          error: `This referral was re-quoted and is superseded by ${successor.reference}. Request allocation on the newer row instead.`,
        },
        409
      );
    }

    const requestedAt = new Date().toISOString();
    await env.DB.prepare(
      `UPDATE enquiries SET allocation_requested_at = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(requestedAt, enquiryId).run();

    const referrer = await env.DB.prepare(
      `SELECT referrer_name FROM referrers WHERE id = ? LIMIT 1`
    ).bind(referrerId).first();

    if (env.RESEND_API_KEY) {
      const referrerName = String(referrer?.referrer_name || "a referrer");
      const adminUrl = `https://conveyquote.uk/admin/?ref=${encodeURIComponent(String(enquiry.reference || ""))}`;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "ConveyQuote <quotes@conveyquote.uk>",
          to: ["info@conveyquote.uk"],
          subject: `Allocation requested — ${escapeHtml(referrerName)} — ${enquiry.reference}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
              <div style="background:#0f2747;padding:20px 24px;border-radius:8px 8px 0 0;">
                <h2 style="color:#fff;margin:0;font-size:18px;">Referrer requested allocation</h2>
              </div>
              <div style="padding:20px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                <p style="margin:0 0 12px;font-size:14px;">${escapeHtml(referrerName)} has requested that this matter is allocated to a panel firm.</p>
                <table style="border-collapse:collapse;width:100%;">
                  <tr><td style="padding:7px 0;color:#6b7280;width:40%;">Reference</td><td style="padding:7px 0;font-weight:600;">${escapeHtml(enquiry.reference)}</td></tr>
                  <tr><td style="padding:7px 0;color:#6b7280;">Client</td><td style="padding:7px 0;">${escapeHtml(enquiry.client_name || enquiry.client_email || "")}</td></tr>
                  <tr><td style="padding:7px 0;color:#6b7280;">Property</td><td style="padding:7px 0;">${escapeHtml(enquiry.property_address || "—")}</td></tr>
                  <tr><td style="padding:7px 0;color:#6b7280;">Transaction</td><td style="padding:7px 0;">${escapeHtml(String(enquiry.transaction_type || "").replace(/_/g, " "))}</td></tr>
                </table>
                ${enquiry.referrer_note ? `<div style="margin-top:14px;padding:12px 14px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;color:#334155;"><strong>Referrer note:</strong> ${escapeHtml(enquiry.referrer_note)}</div>` : ""}
                <div style="margin-top:16px;">
                  <a href="${adminUrl}" style="background:#0f2747;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">
                    Review and allocate →
                  </a>
                </div>
              </div>
            </div>
          `,
        }),
      }).catch((e) => console.error("Allocation request email error:", e));
    }

    return jsonResponse({ success: true, allocation_requested_at: requestedAt });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
