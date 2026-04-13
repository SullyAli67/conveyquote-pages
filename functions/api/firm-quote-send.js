// functions/api/firm-quote-send.js
import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
  generateToken,
} from "../lib/auth.js";

const escapeHtml = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const formatMoney = (v) =>
  `£${Number(v || 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getTransactionLabel = (type) => {
  if (type === "purchase") return "Purchase";
  if (type === "sale") return "Sale";
  if (type === "remortgage") return "Remortgage";
  if (type === "transfer") return "Transfer of Equity";
  return "Conveyancing Matter";
};

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "firm");
    if (!session) return unauthorised();

    const firmId = session.user_id;
    const { internal_reference } = await request.json();

    if (!internal_reference) {
      return jsonResponse({ success: false, error: "internal_reference required." }, 400);
    }

    // Load the quote
    const quote = await env.DB.prepare(
      `SELECT * FROM firm_quotes WHERE internal_reference = ? AND firm_id = ? LIMIT 1`
    ).bind(internal_reference, firmId).first();

    if (!quote) return jsonResponse({ success: false, error: "Quote not found." }, 404);
    if (quote.status === "accepted") {
      return jsonResponse({ success: false, error: "Quote already accepted." }, 409);
    }
    if (!quote.client_email) {
      return jsonResponse({ success: false, error: "No client email on this quote." }, 400);
    }

    // Load firm details
    const firm = await env.DB.prepare(
      `SELECT firm_name, contact_email, portal_email FROM panel_firms WHERE id = ? LIMIT 1`
    ).bind(firmId).first();

    const firmName = firm?.firm_name || "Your Solicitor";
    const firmEmail = firm?.contact_email || firm?.portal_email || "";

    // Parse quote data
    let quoteData = {};
    try { quoteData = JSON.parse(quote.quote_json || "{}"); } catch {}

    // Generate accept token
    const acceptToken = generateToken();
    await env.DB.prepare(
      `INSERT INTO firm_quote_tokens (firm_quote_id, token) VALUES (?, ?)`
    ).bind(quote.id, acceptToken).run();

    const acceptUrl = `https://conveyquote.uk/firm-quote-accept/?token=${acceptToken}`;
    const transactionLabel = getTransactionLabel(quote.transaction_type);
    const ref = quote.firm_reference || quote.internal_reference;
    const signature = quote.email_signature || firmName;

    // Build fee table rows
    const legalFees = quoteData.legalFees || [];
    const disbursements = quoteData.disbursements || [];
    const vat = Number(quoteData.vat || 0);
    const grandTotal = Number(quoteData.grandTotal || 0);
    const sdltAmount = quoteData.sdltAmount;
    const totalIncludingSdlt = quoteData.totalIncludingSdlt;

    const feeRows = legalFees.map(
      (f) => `<tr>
        <td style="padding:8px 12px;border:1px solid #ddd;">${escapeHtml(f.label)}</td>
        <td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${formatMoney(f.amount)}</td>
      </tr>`
    ).join("");

    const disbRows = disbursements.map(
      (d) => `<tr>
        <td style="padding:8px 12px;border:1px solid #ddd;">${escapeHtml(d.label)}</td>
        <td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${d.note ? escapeHtml(d.note) : formatMoney(d.amount)}</td>
      </tr>`
    ).join("");

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;color:#1a1a1a;">
  <div style="max-width:620px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <div style="background:#0f2747;padding:28px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">${escapeHtml(firmName)}</h1>
      <p style="color:#a0b4cc;margin:6px 0 0;font-size:14px;">Conveyancing Quote</p>
    </div>

    <div style="padding:28px 32px;">
      <p>Dear ${escapeHtml(quote.client_name || "Client")},</p>
      <p>Please find below your conveyancing quote for your <strong>${escapeHtml(transactionLabel)}</strong>.</p>

      <table style="border-collapse:collapse;width:100%;margin:8px 0 20px;">
        <tr>
          <td style="padding:8px 12px;border:1px solid #ddd;background:#f7f7f7;font-weight:bold;width:40%;">Reference</td>
          <td style="padding:8px 12px;border:1px solid #ddd;">${escapeHtml(ref)}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid #ddd;background:#f7f7f7;font-weight:bold;">Transaction</td>
          <td style="padding:8px 12px;border:1px solid #ddd;">${escapeHtml(transactionLabel)}</td>
        </tr>
        ${quote.price ? `<tr>
          <td style="padding:8px 12px;border:1px solid #ddd;background:#f7f7f7;font-weight:bold;">Property value</td>
          <td style="padding:8px 12px;border:1px solid #ddd;">${formatMoney(quote.price)}</td>
        </tr>` : ""}
        ${quote.postcode ? `<tr>
          <td style="padding:8px 12px;border:1px solid #ddd;background:#f7f7f7;font-weight:bold;">Postcode</td>
          <td style="padding:8px 12px;border:1px solid #ddd;">${escapeHtml(quote.postcode)}</td>
        </tr>` : ""}
      </table>

      ${legalFees.length > 0 ? `
      <h3 style="color:#0f2747;margin:20px 0 8px;">Legal Fees</h3>
      <table style="border-collapse:collapse;width:100%;margin-bottom:8px;">
        ${feeRows}
        <tr style="background:#f7f7f7;">
          <td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;">VAT (20%)</td>
          <td style="padding:8px 12px;border:1px solid #ddd;text-align:right;font-weight:bold;">${formatMoney(vat)}</td>
        </tr>
      </table>` : ""}

      ${disbursements.length > 0 ? `
      <h3 style="color:#0f2747;margin:20px 0 8px;">Disbursements</h3>
      <table style="border-collapse:collapse;width:100%;margin-bottom:8px;">
        ${disbRows}
      </table>` : ""}

      <table style="border-collapse:collapse;width:100%;margin:16px 0;">
        <tr style="background:#0f2747;color:#fff;">
          <td style="padding:12px 14px;font-weight:bold;font-size:15px;">Total Estimated Cost</td>
          <td style="padding:12px 14px;text-align:right;font-weight:bold;font-size:15px;">${formatMoney(grandTotal)}</td>
        </tr>
        ${typeof sdltAmount === "number" ? `<tr>
          <td style="padding:8px 14px;border:1px solid #ddd;">Estimated SDLT</td>
          <td style="padding:8px 14px;border:1px solid #ddd;text-align:right;">${formatMoney(sdltAmount)}</td>
        </tr>` : ""}
        ${typeof totalIncludingSdlt === "number" ? `<tr style="background:#f0f7f0;">
          <td style="padding:10px 14px;border:1px solid #ddd;font-weight:bold;">Total Including SDLT</td>
          <td style="padding:10px 14px;border:1px solid #ddd;text-align:right;font-weight:bold;">${formatMoney(totalIncludingSdlt)}</td>
        </tr>` : ""}
      </table>

      <p style="font-size:13px;color:#6b7280;">This quote is based on the information provided and is subject to review. Some fees may vary if further information comes to light.</p>

      <div style="text-align:center;margin:28px 0;">
        <a href="${acceptUrl}" style="background:#0f2747;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
          Accept This Quote →
        </a>
      </div>

      <p>If you have any questions please do not hesitate to contact us.</p>
      <p>Kind regards,<br><strong>${escapeHtml(signature)}</strong></p>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:11px;text-align:center;">Powered by ConveyQuote &middot; conveyquote.uk</p>
    </div>
  </div>
</body>
</html>`;

    // Send to client
    const sendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${firmName} via ConveyQuote <noreply@conveyquote.uk>`,
        to: [quote.client_email],
        cc: firmEmail ? [firmEmail] : undefined,
        reply_to: firmEmail || undefined,
        subject: `Your Conveyancing Quote – ${ref}`,
        html,
      }),
    });

    if (!sendResponse.ok) {
      const err = await sendResponse.json();
      return jsonResponse({ success: false, error: "Email failed to send.", detail: err }, 500);
    }

    // Mark as sent
    await env.DB.prepare(
      `UPDATE firm_quotes SET status = 'sent', sent_at = datetime('now'), updated_at = datetime('now')
       WHERE internal_reference = ? AND firm_id = ?`
    ).bind(internal_reference, firmId).run();

    return jsonResponse({ success: true, internal_reference });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
