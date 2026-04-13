// functions/api/assign-panel-firm.js
import {
  getTokenFromRequest,
  validateSession,
  unauthorised,
} from "../lib/auth.js";

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const toFlag = (value) => (value ? 1 : 0);

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const getTransactionLabel = (type) => {
  if (type === "purchase") return "Purchase";
  if (type === "sale") return "Sale";
  if (type === "sale_purchase") return "Sale and Purchase";
  if (type === "remortgage") return "Remortgage";
  if (type === "transfer") return "Transfer of Equity";
  if (type === "remortgage_transfer") return "Remortgage and Transfer of Equity";
  return "Conveyancing Matter";
};

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "admin");
    if (!session) return unauthorised();

    const body = await request.json();
    const { reference, firm_id, firm_name, referral_fee_payable, referral_fee_amount, admin_notes } = body;

    if (!reference || !firm_id || !firm_name) {
      return jsonResponse({ success: false, error: "Reference, firm id and firm name are required." }, 400);
    }

    await env.DB.prepare(
      `UPDATE enquiries
       SET assigned_firm_id=?, assigned_firm_name=?, referral_fee_payable=?,
           referral_fee_amount=?, panel_status='panel_referred',
           referred_at=CURRENT_TIMESTAMP, admin_notes=COALESCE(?,admin_notes),
           updated_at=datetime('now')
       WHERE reference=?`
    ).bind(firm_id, firm_name, toFlag(referral_fee_payable), Number(referral_fee_amount||0), admin_notes||null, reference).run();

    const [firmRow, enquiryRow] = await Promise.all([
      env.DB.prepare(`SELECT firm_name,contact_name,contact_email,portal_email,portal_active FROM panel_firms WHERE id=? LIMIT 1`).bind(firm_id).first(),
      env.DB.prepare(`SELECT client_name,transaction_type,price,tenure,postcode FROM enquiries WHERE reference=? LIMIT 1`).bind(reference).first(),
    ]);

    const firmEmail = firmRow?.portal_email || firmRow?.contact_email;
    if (firmEmail && env.RESEND_API_KEY) {
      const portalUrl = "https://conveyquote.uk/firm-portal";
      const hasPortal = !!firmRow?.portal_active;
      const transactionLabel = getTransactionLabel(enquiryRow?.transaction_type);
      const price = enquiryRow?.price ? `£${Number(enquiryRow.price).toLocaleString("en-GB")}` : "Not provided";

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "ConveyQuote <quotes@conveyquote.uk>",
          to: [firmEmail],
          subject: `New Referral – ${transactionLabel} – ${reference}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#0f2747;padding:24px;"><h1 style="color:#fff;margin:0;font-size:20px;">New Referral from ConveyQuote</h1></div>
            <div style="padding:24px;">
              <p>Dear ${escapeHtml(firmRow?.contact_name || firm_name)},</p>
              <p>A new matter has been referred to <strong>${escapeHtml(firm_name)}</strong>.</p>
              <table style="border-collapse:collapse;width:100%;margin:16px 0;">
                <tr><td style="padding:8px 12px;border:1px solid #ddd;background:#f7f7f7;font-weight:bold;">Reference</td><td style="padding:8px 12px;border:1px solid #ddd;">${escapeHtml(reference)}</td></tr>
                <tr><td style="padding:8px 12px;border:1px solid #ddd;background:#f7f7f7;font-weight:bold;">Type</td><td style="padding:8px 12px;border:1px solid #ddd;">${escapeHtml(transactionLabel)}</td></tr>
                <tr><td style="padding:8px 12px;border:1px solid #ddd;background:#f7f7f7;font-weight:bold;">Value</td><td style="padding:8px 12px;border:1px solid #ddd;">${escapeHtml(price)}</td></tr>
                <tr><td style="padding:8px 12px;border:1px solid #ddd;background:#f7f7f7;font-weight:bold;">Postcode</td><td style="padding:8px 12px;border:1px solid #ddd;">${escapeHtml(enquiryRow?.postcode||"Not provided")}</td></tr>
                ${referral_fee_payable ? `<tr><td style="padding:8px 12px;border:1px solid #ddd;background:#f7f7f7;font-weight:bold;">Referral fee</td><td style="padding:8px 12px;border:1px solid #ddd;">£${Number(referral_fee_amount||0).toFixed(2)}</td></tr>` : ""}
              </table>
              ${admin_notes ? `<p style="background:#fffbeb;border:1px solid #f59e0b;padding:12px;border-radius:4px;"><strong>Note:</strong> ${escapeHtml(admin_notes)}</p>` : ""}
              ${hasPortal
                ? `<div style="text-align:center;margin:24px 0;"><a href="${portalUrl}" style="background:#0f2747;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Log in to Firm Portal →</a></div>`
                : `<p>Please contact <a href="mailto:info@conveyquote.uk">info@conveyquote.uk</a> to respond to this referral.</p>`}
            </div></div>`,
        }),
      }).catch((err) => console.error("Firm email error:", err));
    }

    return jsonResponse({ success: true, reference });
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
}
