// functions/api/referrer-submit-enquiry.js
// Referrer (e.g. estate agent) submits an enquiry on behalf of a client
// Uses same logic as send-quote.js but ties to referrer_id

import { buildQuoteData } from "../lib/calculate-quote.js";
import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";

function generateReference() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CQ-${date}-${rand}`;
}

const escapeHtml = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const formatMoney = (v) =>
  v !== undefined && v !== null
    ? `£${Number(v).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "Not provided";

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
    const session = await validateSession(env.DB, token, "referrer");
    if (!session) return unauthorised();

    const referrerId = session.user_id;
    const body = await request.json();

    const {
      name, email, phone,
      type, tenure, price, postcode,
      property_address, negotiator_name,
      mortgage, lender, ownershipType, firstTimeBuyer, newBuild,
      sharedOwnership, helpToBuy, isCompany, buyToLet, giftedDeposit,
      additionalProperty, ukResidentForSdlt, lifetimeIsa,
      saleMortgage, managementCompany, tenanted, numberOfSellers,
      additionalBorrowing, remortgageTransfer, transferMortgage, ownersChanging,
      send_to_client,
    } = body;

    if (!email || !type) {
      return jsonResponse({ success: false, error: "Client email and transaction type are required." }, 400);
    }

    // Load referrer details
    const referrer = await env.DB.prepare(
      `SELECT referrer_name, referral_fee, contact_email FROM referrers WHERE id = ? LIMIT 1`
    ).bind(referrerId).first();

    if (!referrer) return unauthorised();

    const reference = generateReference();

    // Build quote
    const quote = buildQuoteData({
      type, price: String(price || ""), tenure: tenure || "",
      mortgage: mortgage || "", lender: lender || "",
      ownershipType: ownershipType || "", firstTimeBuyer: firstTimeBuyer || "",
      additionalProperty: additionalProperty || "", ukResidentForSdlt: ukResidentForSdlt || "",
      giftedDeposit: giftedDeposit || "", newBuild: newBuild || "",
      sharedOwnership: sharedOwnership || "", helpToBuy: helpToBuy || "",
      isCompany: isCompany || "", buyToLet: buyToLet || "", lifetimeIsa: lifetimeIsa || "",
      saleMortgage: saleMortgage || "", managementCompany: managementCompany || "",
      tenanted: tenanted || "", numberOfSellers: numberOfSellers || "",
      additionalBorrowing: additionalBorrowing || "", remortgageTransfer: remortgageTransfer || "",
      transferMortgage: transferMortgage || "", ownersChanging: ownersChanging || "",
    });

    // Insert enquiry with referrer_id
    await env.DB.prepare(
      `INSERT INTO enquiries (
         reference, client_name, client_email, client_phone,
         transaction_type, tenure, price, postcode,
         property_address, negotiator_name,
         mortgage, lender, ownership_type, first_time_buyer, new_build,
         shared_ownership, help_to_buy, is_company, buy_to_let, gifted_deposit,
         additional_property, uk_resident_for_sdlt, lifetime_isa,
         sale_mortgage, management_company, tenanted, number_of_sellers,
         additional_borrowing, remortgage_transfer, transfer_mortgage, owners_changing,
         quote_json, status, referrer_id, referral_fee_payable, referral_fee_amount
       ) VALUES (
         ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
       )`
    ).bind(
      reference, name || null, email, phone || null,
      type, tenure || null, price ? Number(price) : null, postcode || null,
      property_address || null, negotiator_name || null,
      mortgage || null, lender || null, ownershipType || null, firstTimeBuyer || null, newBuild || null,
      sharedOwnership || null, helpToBuy || null, isCompany || null, buyToLet || null, giftedDeposit || null,
      additionalProperty || null, ukResidentForSdlt || null, lifetimeIsa || null,
      saleMortgage || null, managementCompany || null, tenanted || null, numberOfSellers || null,
      additionalBorrowing || null, remortgageTransfer || null, transferMortgage || null, ownersChanging || null,
      JSON.stringify(quote), "new",
      referrerId,
      Number(referrer.referral_fee) > 0 ? 1 : 0,
      Number(referrer.referral_fee) || 0
    ).run();

    const transactionLabel = getTransactionLabel(type);
    const adminUrl = `https://conveyquote.uk/admin/?ref=${encodeURIComponent(reference)}`;

    // Email admin
    if (env.RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "ConveyQuote <quotes@conveyquote.uk>",
          to: ["info@conveyquote.uk"],
          subject: `New Referrer Enquiry – ${transactionLabel} – ${reference}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
              <div style="background:#0f2747;padding:20px 24px;border-radius:8px 8px 0 0;">
                <h2 style="color:#fff;margin:0;font-size:18px;">New Referrer Enquiry</h2>
              </div>
              <div style="padding:20px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                <table style="border-collapse:collapse;width:100%;">
                  <tr><td style="padding:7px 0;color:#6b7280;width:40%;">Reference</td><td style="padding:7px 0;font-weight:600;">${escapeHtml(reference)}</td></tr>
                  <tr><td style="padding:7px 0;color:#6b7280;">Referred by</td><td style="padding:7px 0;">${escapeHtml(referrer.referrer_name)}</td></tr>
                  <tr><td style="padding:7px 0;color:#6b7280;">Client</td><td style="padding:7px 0;">${escapeHtml(name || email)}</td></tr>
                  <tr><td style="padding:7px 0;color:#6b7280;">Transaction</td><td style="padding:7px 0;">${escapeHtml(transactionLabel)}</td></tr>
                  <tr><td style="padding:7px 0;color:#6b7280;">Property value</td><td style="padding:7px 0;">${formatMoney(price)}</td></tr>
                  ${Number(referrer.referral_fee) > 0 ? `<tr><td style="padding:7px 0;color:#6b7280;">Referral fee</td><td style="padding:7px 0;color:#7c3aed;font-weight:600;">£${Number(referrer.referral_fee).toFixed(2)}</td></tr>` : ""}
                </table>
                <div style="margin-top:16px;">
                  <a href="${adminUrl}" style="background:#0f2747;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">
                    Review in Admin →
                  </a>
                </div>
              </div>
            </div>
          `,
        }),
      }).catch((e) => console.error("Referrer enquiry email error:", e));
    }

    // Optionally email the calculated quote directly to the client
    let clientEmailed = false;
    if (send_to_client && email && env.RESEND_API_KEY) {
      const acceptUrl = `https://conveyquote.uk/api/accept-quote?ref=${encodeURIComponent(reference)}`;
      const totalAmount = quote.grandTotal ?? quote.totalExcludingSdlt ?? 0;
      const formatMoney2 = (v) => `£${Number(v || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      // Build a simple fee breakdown for the client email
      const feeRows = [
        ...(quote.legalFees || []).map((f) =>
          `<tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(f.label || "Legal fee")}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatMoney2(f.amount)}${f.includesVat ? " (inc. VAT)" : ""}</td></tr>`
        ),
        ...(quote.disbursements || []).map((d) =>
          `<tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${escapeHtml(d.label || "Disbursement")}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#6b7280;">${formatMoney2(d.amount)}</td></tr>`
        ),
      ].join("");

      const clientHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;color:#1a1a1a;background:#f4f6f9;margin:0;padding:24px;">
  <div style="max-width:620px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#0f2747;padding:28px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">Your Conveyancing Quote</h1>
      <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px;">Reference: ${escapeHtml(reference)}</p>
    </div>
    <div style="padding:28px 32px;">
      <p>Dear ${escapeHtml(name || "Client")},</p>
      <p>Please find your conveyancing quote below, prepared by <strong>${escapeHtml(referrer.referrer_name)}</strong> via ConveyQuote.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:14px;">
        <thead><tr style="background:#f7f9fc;">
          <th style="padding:8px 12px;border-bottom:2px solid #e5e7eb;text-align:left;">Description</th>
          <th style="padding:8px 12px;border-bottom:2px solid #e5e7eb;text-align:right;">Amount</th>
        </tr></thead>
        <tbody>${feeRows}</tbody>
        <tfoot><tr style="background:#0f2747;color:#fff;">
          <td style="padding:12px;font-weight:700;">Total Estimate</td>
          <td style="padding:12px;text-align:right;font-weight:700;">${formatMoney2(totalAmount)}</td>
        </tr></tfoot>
      </table>
      <p style="font-size:13px;color:#6b7280;">This is an indicative estimate. Final costs will be confirmed by the instructed solicitor.</p>
      ${quote.sdltAmount ? `<p style="font-size:13px;color:#6b7280;">Stamp Duty (SDLT) of ${formatMoney2(quote.sdltAmount)} may also apply — this is paid to HMRC and not included above.</p>` : ""}
      <div style="text-align:center;margin:28px 0;">
        <a href="${acceptUrl}" style="background:#0f2747;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;">Accept This Quote →</a>
      </div>
      <p style="font-size:12px;color:#9ca3af;text-align:center;">Questions? Email <a href="mailto:info@conveyquote.uk" style="color:#0f2747;">info@conveyquote.uk</a></p>
    </div>
  </div>
</body></html>`;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "ConveyQuote <quotes@conveyquote.uk>",
          to: [email],
          reply_to: "info@conveyquote.uk",
          subject: `Your Conveyancing Quote — ${reference}`,
          html: clientHtml,
        }),
      }).then(() => { clientEmailed = true; }).catch((e) => console.error("Client quote email error:", e));
    }

    return jsonResponse({ success: true, reference, quote, client_emailed: clientEmailed });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
