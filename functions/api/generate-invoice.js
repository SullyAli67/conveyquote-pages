// functions/api/generate-invoice.js
// Called when a firm marks a case as "completed"
// Calculates referral fee based on source (public vs referrer)
// Returns invoice data and stores it; emails the firm

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";

const escapeHtml = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const formatMoney = (v) =>
  `£${Number(v || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function generateInvoiceRef() {
  const d = new Date();
  const date = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${date}-${rand}`;
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "firm");
    if (!session) return unauthorised();

    const firmId = session.user_id;
    const { reference } = await request.json();

    if (!reference) {
      return jsonResponse({ success: false, error: "reference required." }, 400);
    }

    // Load the enquiry
    const enquiry = await env.DB.prepare(
      `SELECT e.*, r.referral_fee as referrer_fee, r.referrer_name,
              r.contact_email as referrer_email
       FROM enquiries e
       LEFT JOIN referrers r ON r.id = e.referrer_id
       WHERE e.reference = ? AND e.assigned_firm_id = ?
       LIMIT 1`
    ).bind(reference, firmId).first();

    if (!enquiry) {
      return jsonResponse({ success: false, error: "Enquiry not found." }, 404);
    }

    if (enquiry.invoice_ref) {
      // Already invoiced — return existing
      return jsonResponse({ success: true, invoice_ref: enquiry.invoice_ref, already_exists: true });
    }

    const firm = await env.DB.prepare(
      `SELECT firm_name, contact_email, portal_email FROM panel_firms WHERE id = ? LIMIT 1`
    ).bind(firmId).first();

    // Load bank details from admin settings
    const bankDetails = await env.DB.prepare(
      `SELECT setting_value FROM admin_settings WHERE setting_key = 'bank_details' LIMIT 1`
    ).first();

    const bankDetailsText = bankDetails?.setting_value ||
      "Bank: [Please contact info@conveyquote.uk for payment details]";

    const invoiceRef = generateInvoiceRef();
    const VAT_RATE = 0.2;

    // Calculate fees
    let lineItems = [];

    const hasReferrer = !!enquiry.referrer_id && !!enquiry.referrer_fee;
    const referrerFee = hasReferrer ? Number(enquiry.referrer_fee || 0) : 0;
    const referrerName = enquiry.referrer_name || "";

    if (hasReferrer) {
      // Referrer fee (passed through at cost, no markup)
      lineItems.push({
        label: `Referral fee — ${referrerName}`,
        net: referrerFee,
        vat: Number((referrerFee * VAT_RATE).toFixed(2)),
        gross: Number((referrerFee * (1 + VAT_RATE)).toFixed(2)),
      });
      // ConveyQuote marketing fee
      const mktFee = 50;
      lineItems.push({
        label: "ConveyQuote marketing fee",
        net: mktFee,
        vat: Number((mktFee * VAT_RATE).toFixed(2)),
        gross: Number((mktFee * (1 + VAT_RATE)).toFixed(2)),
      });
    } else {
      // Public enquiry — use admin-set referral_fee_amount if provided, otherwise default to £250
      const adminSetFee = Number(enquiry.referral_fee_amount || 0);
      const fee = adminSetFee > 0 ? adminSetFee : 250;
      lineItems.push({
        label: "ConveyQuote referral fee",
        net: fee,
        vat: Number((fee * VAT_RATE).toFixed(2)),
        gross: Number((fee * (1 + VAT_RATE)).toFixed(2)),
      });
    }

    const totalNet = lineItems.reduce((s, i) => s + i.net, 0);
    const totalVat = lineItems.reduce((s, i) => s + i.vat, 0);
    const totalGross = lineItems.reduce((s, i) => s + i.gross, 0);

    const invoiceData = {
      invoice_ref: invoiceRef,
      reference,
      firm_name: firm?.firm_name || "",
      firm_email: firm?.contact_email || firm?.portal_email || "",
      client_name: enquiry.client_name || "",
      transaction_type: enquiry.transaction_type || "",
      line_items: lineItems,
      total_net: totalNet,
      total_vat: totalVat,
      total_gross: totalGross,
      bank_details: bankDetailsText,
      issued_at: new Date().toISOString().slice(0, 10),
    };

    // Save invoice ref on the enquiry
    await env.DB.prepare(
      `UPDATE enquiries SET invoice_ref = ?, invoice_json = ?, invoice_status = 'issued', updated_at = datetime('now')
       WHERE reference = ?`
    ).bind(invoiceRef, JSON.stringify(invoiceData), reference).run();

    // Audit log
    try {
      await env.DB.prepare(
        `INSERT INTO audit_log (action, reference, firm_id, firm_name, actor, details)
         VALUES ('invoice_generated', ?, ?, ?, 'firm', ?)`
      ).bind(reference, firmId, firm?.firm_name || null, `Invoice ${invoiceRef} — £${totalGross.toFixed(2)}`).run();
    } catch (e) { console.error("Audit log error:", e); }

    // Build HTML invoice for email
    const lineRows = lineItems.map((l) => `
      <tr>
        <td style="padding:10px 14px;border:1px solid #e5e7eb;">${escapeHtml(l.label)}</td>
        <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:right;">${formatMoney(l.net)}</td>
        <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:right;">${formatMoney(l.vat)}</td>
        <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:right;">${formatMoney(l.gross)}</td>
      </tr>`).join("");

    const invoiceHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;color:#1a1a1a;background:#f4f6f9;margin:0;padding:24px;">
  <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#0f2747;padding:28px 32px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <h1 style="color:#fff;margin:0;font-size:22px;">TAX INVOICE</h1>
        <p style="color:#a0b4cc;margin:4px 0 0;font-size:13px;">ConveyQuote · Essentially Law Limited</p>
      </div>
      <div style="text-align:right;">
        <p style="color:#fff;margin:0;font-weight:700;">${escapeHtml(invoiceRef)}</p>
        <p style="color:#a0b4cc;margin:4px 0 0;font-size:13px;">${invoiceData.issued_at}</p>
      </div>
    </div>
    <div style="padding:28px 32px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;">
        <div>
          <p style="font-size:11px;text-transform:uppercase;color:#9ca3af;margin:0 0 6px;letter-spacing:0.08em;">From</p>
          <p style="margin:0;font-weight:700;">Essentially Law Limited</p>
          <p style="margin:2px 0;color:#6b7280;font-size:13px;">ConveyQuote</p>
          <p style="margin:2px 0;color:#6b7280;font-size:13px;">info@conveyquote.uk</p>
          <p style="margin:2px 0;color:#6b7280;font-size:13px;">Company No. 14625839</p>
        </div>
        <div>
          <p style="font-size:11px;text-transform:uppercase;color:#9ca3af;margin:0 0 6px;letter-spacing:0.08em;">To</p>
          <p style="margin:0;font-weight:700;">${escapeHtml(firm?.firm_name || "")}</p>
          <p style="margin:2px 0;color:#6b7280;font-size:13px;">${escapeHtml(firm?.contact_email || firm?.portal_email || "")}</p>
        </div>
      </div>

      <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
        <thead>
          <tr style="background:#f7f9fc;">
            <th style="padding:10px 14px;border:1px solid #e5e7eb;text-align:left;">Description</th>
            <th style="padding:10px 14px;border:1px solid #e5e7eb;text-align:right;">Net</th>
            <th style="padding:10px 14px;border:1px solid #e5e7eb;text-align:right;">VAT</th>
            <th style="padding:10px 14px;border:1px solid #e5e7eb;text-align:right;">Gross</th>
          </tr>
        </thead>
        <tbody>
          ${lineRows}
          <tr style="background:#0f2747;color:#fff;">
            <td style="padding:12px 14px;font-weight:700;" colspan="3">Total Due</td>
            <td style="padding:12px 14px;text-align:right;font-weight:700;">${formatMoney(totalGross)}</td>
          </tr>
        </tbody>
      </table>

      <div style="background:#f7f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0 0 8px;font-weight:700;font-size:13px;">Payment Details</p>
        <pre style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#374151;white-space:pre-wrap;">${escapeHtml(bankDetailsText)}</pre>
      </div>

      <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">
        Essentially Law Limited · Company No. 14625839 · ConveyQuote · conveyquote.uk
      </p>
    </div>
  </div>
</body>
</html>`;

    // Email the invoice to the firm
    const firmEmail = firm?.contact_email || firm?.portal_email;
    if (firmEmail && env.RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "ConveyQuote <noreply@conveyquote.uk>",
          to: [firmEmail],
          cc: ["info@conveyquote.uk"],
          subject: `Invoice ${invoiceRef} — ${reference}`,
          html: invoiceHtml,
        }),
      }).catch((e) => console.error("Invoice email error:", e));
    }

    return jsonResponse({ success: true, invoice_ref: invoiceRef, invoice: invoiceData });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
