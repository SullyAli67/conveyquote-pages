// functions/api/referrer-submit-enquiry.js
// Referrer (e.g. estate agent) submits an enquiry on behalf of a client
// Uses same logic as send-quote.js but ties to referrer_id.
//
// Optional referrer note
// ----------------------
// Referrers can attach a free-text note (≤ 500 chars) when submitting.
// Persisted to enquiries.referrer_note, included as a muted block above
// the firm signature in the client quote email, and shown read-only on
// the referrer's My Referrals expanded matter card.
//
// Re-quote (Pattern B)
// --------------------
// When parent_enquiry_id is present in the request body, this endpoint
// also acts as a "re-quote": it inserts a fresh enquiries row carrying
// parent_enquiry_id pointing to the immediate predecessor (chain, not
// star — each re-quote points to the row it was issued from). The
// active row in a chain is the leaf — the row no other row references
// as a parent. We validate the parent belongs to this referrer and is
// not already allocated; either failure rejects the request.
//
// Pricing path (Pattern B)
// ------------------------
// If the referrer has any rows in referrer_fee_configs for the
// requested transaction type, the per-referrer engine
// (calculateReferrerQuote) prices the quote. Otherwise we fall back to
// the legacy global price book + fee_markup so referrers that haven't
// been configured yet keep working unchanged. The fee_markup column on
// referrers is ignored when the per-referrer engine is in play — admin
// expresses pricing directly via the line items.

import { buildQuoteData } from "../lib/calculate-quote.js";
import { calculateReferrerQuote } from "../lib/calculate-referrer-quote-core.js";
import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";

const NOTE_MAX_LENGTH = 500;

// Map the referrer-submit form payload to the shape the per-referrer
// engine expects (mirrors firm Issue Quote's body shape — camelCase
// transactionType, supplements bag, sdltFlags bag, etc.). Returns null
// if the form's transaction type isn't supported.
const buildReferrerEngineBody = (form) => {
  const type = String(form.type || "").trim();
  if (!type) return null;
  const tenure = form.tenure === "leasehold" ? "leasehold" : "freehold";
  const mortgageOrCash = form.mortgage === "mortgage" ? "mortgage" : "cash";
  const buyerCount = form.ownershipType === "joint" ? 2 : 1;
  const supplements = {
    newBuild: form.newBuild === "yes",
    sharedOwnership: form.sharedOwnership === "yes",
    helpToBuy: form.helpToBuy === "yes",
    buyToLet: form.buyToLet === "yes",
    companyBuyer: form.isCompany === "yes",
    giftedDeposit: form.giftedDeposit === "yes",
    lifetimeIsa: form.lifetimeIsa === "yes",
    rightToBuy: form.rightToBuy === "yes",
    additionalProperty: form.additionalProperty === "yes",
  };
  const sdltFlags = {
    firstTimeBuyer: form.firstTimeBuyer === "yes",
    additionalProperty: form.additionalProperty === "yes",
    ukResident: form.ukResidentForSdlt !== "no",
  };
  return {
    transactionType: type,
    price: form.price,
    tenure,
    mortgageOrCash,
    buyerCount,
    supplements,
    sdltFlags,
  };
};

// Translate the per-referrer engine output into the buildQuoteData
// shape so the email rendering and quote_json columns stay identical
// between the two pricing paths.
const adaptReferrerQuoteToBuildShape = (engineQuote) => {
  const legalFees = (engineQuote.legalFees || []).map((row) => ({
    label: row.label,
    amount: row.amount,
  }));
  const disbursements = engineQuote.disbursements || [];
  const sdltAmount =
    typeof engineQuote.sdlt === "number" ? engineQuote.sdlt : undefined;
  const grandTotalNoSdlt = Number(
    (
      Number(engineQuote.legalFeesGross || 0) +
      Number(engineQuote.disbursementsTotal || 0)
    ).toFixed(2)
  );
  return {
    legalFees,
    legalFeesExVat: Number(engineQuote.legalFeesNet || 0),
    vat: Number(engineQuote.vat || 0),
    legalTotalInclVat: Number(engineQuote.legalFeesGross || 0),
    disbursements,
    disbursementTotal: Number(engineQuote.disbursementsTotal || 0),
    sdltAmount,
    grandTotal: grandTotalNoSdlt,
    totalIncludingSdlt:
      typeof sdltAmount === "number"
        ? Number((grandTotalNoSdlt + sdltAmount).toFixed(2))
        : undefined,
    warnings: engineQuote.warnings || [],
  };
};

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

const getExistingEnquiryColumns = async (db) => {
  const result = await db.prepare(`PRAGMA table_info(enquiries)`).all();
  const rows = Array.isArray(result?.results) ? result.results : [];
  return new Set(rows.map((row) => String(row.name)));
};

const insertEnquiryRow = async (db, row) => {
  const existingColumns = await getExistingEnquiryColumns(db);
  const entries = Object.entries(row).filter(([key]) => existingColumns.has(key));

  if (entries.length === 0) {
    throw new Error("The enquiries table could not be inspected or has no matching columns.");
  }

  const columns = entries.map(([key]) => key);
  const values = entries.map(([, value]) => value);
  const placeholders = entries.map(() => "?").join(",");

  await db
    .prepare(`INSERT INTO enquiries (${columns.join(", ")}) VALUES (${placeholders})`)
    .bind(...values)
    .run();
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
      rightToBuy,
      saleMortgage, managementCompany, tenanted, numberOfSellers,
      additionalBorrowing, remortgageTransfer, transferMortgage, ownersChanging,
      send_to_client,
      referrerNote,
      parent_enquiry_id,
    } = body;

    if (!email || !type) {
      return jsonResponse({ success: false, error: "Client email and transaction type are required." }, 400);
    }

    const trimmedNote = String(referrerNote || "").trim();
    if (trimmedNote.length > NOTE_MAX_LENGTH) {
      return jsonResponse(
        {
          success: false,
          error: `Note must be ${NOTE_MAX_LENGTH} characters or fewer (received ${trimmedNote.length}).`,
        },
        400
      );
    }

    // Re-quote validation: the parent must exist, belong to this
    // referrer, and not already be allocated to a panel firm.
    let validatedParentId = null;
    if (parent_enquiry_id != null && parent_enquiry_id !== "") {
      const parsedParentId = Number(parent_enquiry_id);
      if (!Number.isFinite(parsedParentId) || parsedParentId <= 0) {
        return jsonResponse(
          { success: false, error: "Invalid parent_enquiry_id." },
          400
        );
      }
      const parentRow = await env.DB.prepare(
        `SELECT e.id, e.referrer_id, w.allocated_at
           FROM enquiries e
           LEFT JOIN referrer_workflow w ON w.enquiry_id = e.id
          WHERE e.id = ?
          LIMIT 1`
      ).bind(parsedParentId).first();
      if (!parentRow || Number(parentRow.referrer_id) !== Number(referrerId)) {
        return jsonResponse(
          { success: false, error: "Original referral not found." },
          404
        );
      }
      if (parentRow.allocated_at) {
        return jsonResponse(
          {
            success: false,
            error: "This referral has already been allocated to a panel firm and can no longer be re-quoted.",
          },
          409
        );
      }
      validatedParentId = parsedParentId;
    }

    // Load referrer details — include fee_markup for referrer pricing
    const referrer = await env.DB.prepare(
      `SELECT referrer_name, referral_fee, contact_email, fee_markup FROM referrers WHERE id = ? LIMIT 1`
    ).bind(referrerId).first();

    if (!referrer) return unauthorised();

    const reference = generateReference();

    // Pricing path: prefer the per-referrer engine when admin has set
    // up referrer_fee_configs for this transaction type; otherwise fall
    // back to the legacy global engine + fee_markup so referrers that
    // haven't been migrated to Pattern B keep working unchanged.
    let quote;
    let usedReferrerEngine = false;
    const engineBody = buildReferrerEngineBody({
      type, price, tenure, mortgage, ownershipType, firstTimeBuyer,
      additionalProperty, ukResidentForSdlt, newBuild, sharedOwnership,
      helpToBuy, buyToLet, isCompany, giftedDeposit, lifetimeIsa, rightToBuy,
    });
    const referrerEngineResult = engineBody
      ? await calculateReferrerQuote({
          db: env.DB,
          referrerId,
          body: engineBody,
        })
      : null;

    if (referrerEngineResult && referrerEngineResult.ok) {
      quote = adaptReferrerQuoteToBuildShape(referrerEngineResult.payload);
      usedReferrerEngine = true;
    } else {
      // Legacy fallback: build via the global price book, then apply
      // the referrer's fee_markup as a single arrangement-fee line item.
      const baseQuote = buildQuoteData({
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

      const markup = Number(referrer.fee_markup) || 0;
      quote = baseQuote;
      if (markup > 0) {
        const markupFees = [...(baseQuote.legalFees || []), { label: "Referrer service arrangement fee", amount: markup }];
        const legalFeesExVat = Number(markupFees.reduce((s, f) => s + Number(f.amount || 0), 0).toFixed(2));
        const vat = Number((legalFeesExVat * 0.2).toFixed(2));
        const legalTotalInclVat = Number((legalFeesExVat + vat).toFixed(2));
        const disbursementTotal = baseQuote.disbursementTotal;
        const grandTotal = Number((legalTotalInclVat + disbursementTotal).toFixed(2));
        const totalIncludingSdlt = typeof baseQuote.sdltAmount === "number"
          ? Number((grandTotal + baseQuote.sdltAmount).toFixed(2))
          : undefined;
        quote = {
          ...baseQuote,
          legalFees: markupFees,
          legalFeesExVat,
          vat,
          legalTotalInclVat,
          grandTotal,
          totalIncludingSdlt,
        };
      }
    }
    void usedReferrerEngine;

    await insertEnquiryRow(env.DB, {
      reference,
      client_name: name || null,
      client_email: email,
      client_phone: phone || null,
      transaction_type: type,
      tenure: tenure || null,
      price: price ? Number(price) : null,
      postcode: postcode || null,
      property_address: property_address || null,
      negotiator_name: negotiator_name || null,
      mortgage: mortgage || null,
      lender: lender || null,
      ownership_type: ownershipType || null,
      first_time_buyer: firstTimeBuyer || null,
      new_build: newBuild || null,
      shared_ownership: sharedOwnership || null,
      help_to_buy: helpToBuy || null,
      is_company: isCompany || null,
      buy_to_let: buyToLet || null,
      gifted_deposit: giftedDeposit || null,
      additional_property: additionalProperty || null,
      uk_resident_for_sdlt: ukResidentForSdlt || null,
      lifetime_isa: lifetimeIsa || null,
      right_to_buy: rightToBuy || null,
      management_company: managementCompany || null,
      tenanted: tenanted || null,
      number_of_sellers: numberOfSellers || null,
      additional_borrowing: additionalBorrowing || null,
      remortgage_transfer: remortgageTransfer || null,
      transfer_mortgage: transferMortgage || null,
      owners_changing: ownersChanging || null,
      quote_json: JSON.stringify({ ...body, ...quote }),
      status: "new",
      referrer_id: referrerId,
      referral_fee_payable: Number(referrer.referral_fee) > 0 ? 1 : 0,
      referral_fee_amount: Number(referrer.referral_fee) || 0,
    });

    // Persist workflow fields (referrer_note, parent_enquiry_id) in the
    // referrer_workflow side-table — they used to live on enquiries but
    // that table hit the D1 100-column cap. See migration 0013.
    if (trimmedNote || validatedParentId != null) {
      const inserted = await env.DB.prepare(
        `SELECT id FROM enquiries WHERE reference = ? LIMIT 1`
      ).bind(reference).first();
      if (inserted?.id) {
        await env.DB.prepare(
          `INSERT INTO referrer_workflow (enquiry_id, referrer_note, parent_enquiry_id)
           VALUES (?, ?, ?)
           ON CONFLICT (enquiry_id) DO UPDATE SET
             referrer_note = excluded.referrer_note,
             parent_enquiry_id = excluded.parent_enquiry_id`
        ).bind(inserted.id, trimmedNote || null, validatedParentId).run();
      }
    }

    const transactionLabel = getTransactionLabel(type);
    const adminUrl = `https://conveyquote.uk/admin/?ref=${encodeURIComponent(reference)}`;

    // Risk 1 — admin notification. Previously .catch(console.error)
    // silently swallowed any Resend failure. Now we check response.ok
    // and log with HTTP status + body snippet. The enquiry has already
    // been created above (the user-facing outcome), so an admin-email
    // failure is recorded as adminEmailError on the response and in
    // the tail log; it does not roll back the enquiry insert.
    let adminEmailError = null;
    if (env.RESEND_API_KEY) {
      try {
        const adminResp = await fetch("https://api.resend.com/emails", {
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
        });
        if (!adminResp.ok) {
          const errBody = await adminResp.text().catch(() => "");
          adminEmailError = `HTTP ${adminResp.status} ${errBody}`.slice(0, 240);
          console.error(
            `referrer-submit-enquiry: admin notification failed for ref=${reference}: ${adminEmailError}`
          );
        }
      } catch (e) {
        adminEmailError = String(e instanceof Error ? e.message : e).slice(0, 240);
        console.error("Referrer enquiry email error:", e);
      }
    }

    // Optionally email the calculated quote directly to the client
    let clientEmailed = false;
    if (send_to_client && email && env.RESEND_API_KEY) {
      const acceptUrl = `https://conveyquote.uk/api/accept-quote?ref=${encodeURIComponent(reference)}`;
      const fmt = (v) => `£${Number(v || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      // ── Helpers ──────────────────────────────────────────────────────────
      const prettifyTenure = (t) => t === "leasehold" ? "Leasehold" : t === "freehold" ? "Freehold" : (t || "Not provided");
      const prettifyType = (t) => {
        if (t === "purchase") return "Purchase";
        if (t === "sale") return "Sale";
        if (t === "sale_purchase") return "Sale &amp; Purchase";
        if (t === "remortgage") return "Remortgage";
        if (t === "transfer") return "Transfer of Equity";
        return t || "Conveyancing";
      };
      const prettifyMortgage = (m) => m === "mortgage" ? "Yes" : m === "cash" ? "No (cash)" : (m || "Not provided");

      // ── Fee rows ─────────────────────────────────────────────────────────
      const legalFeeRows = (quote.legalFees || []).map((f) =>
        `<tr>
          <td style="padding:9px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#374151;">${escapeHtml(f.label || "Legal fee")}</td>
          <td style="padding:9px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#111827;font-weight:600;text-align:right;">${fmt(f.amount)}</td>
        </tr>`
      ).join("");

      const vatRow = quote.vat > 0
        ? `<tr>
            <td style="padding:9px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#374151;">VAT (20%)</td>
            <td style="padding:9px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#111827;font-weight:600;text-align:right;">${fmt(quote.vat)}</td>
          </tr>`
        : "";

      const legalTotalRow = `<tr>
        <td style="padding:9px 0;border-bottom:2px solid #e5e7eb;font-size:14px;color:#0f2747;font-weight:700;">Total legal fees (inc. VAT)</td>
        <td style="padding:9px 0;border-bottom:2px solid #e5e7eb;font-size:14px;color:#0f2747;font-weight:700;text-align:right;">${fmt(quote.legalTotalInclVat)}</td>
      </tr>`;

      const disbursementRows = (quote.disbursements || []).map((d) =>
        `<tr>
          <td style="padding:9px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#6b7280;">${escapeHtml(d.label || "Disbursement")}${d.note ? ` <span style="font-size:12px;">(${escapeHtml(d.note)})</span>` : ""}</td>
          <td style="padding:9px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#374151;font-weight:600;text-align:right;">${fmt(d.amount)}</td>
        </tr>`
      ).join("");

      const disbTotalRow = quote.disbursementTotal > 0
        ? `<tr>
            <td style="padding:9px 0;border-bottom:2px solid #e5e7eb;font-size:14px;color:#0f2747;font-weight:700;">Total disbursements</td>
            <td style="padding:9px 0;border-bottom:2px solid #e5e7eb;font-size:14px;color:#0f2747;font-weight:700;text-align:right;">${fmt(quote.disbursementTotal)}</td>
          </tr>`
        : "";

      const sdltRow = typeof quote.sdltAmount === "number"
        ? `<tr>
            <td style="padding:9px 0;font-size:14px;color:#374151;">Estimated Stamp Duty (SDLT) <span style="font-size:12px;color:#9ca3af;">— paid to HMRC</span></td>
            <td style="padding:9px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${fmt(quote.sdltAmount)}</td>
          </tr>`
        : (quote.sdltNote
          ? `<tr>
              <td style="padding:9px 0;font-size:14px;color:#374151;">Stamp Duty (SDLT)</td>
              <td style="padding:9px 0;font-size:14px;color:#6b7280;text-align:right;">${escapeHtml(quote.sdltNote)}</td>
            </tr>`
          : "");

      const grandTotal = quote.totalIncludingSdlt ?? quote.grandTotal ?? 0;

      const clientHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Your Conveyancing Quote</title>
</head>
<body style="margin:0;padding:0;background:#f2f4f7;font-family:Arial,Helvetica,sans-serif;color:#222;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f7;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding:0 0 16px 0;">
              <img src="https://conveyquote.uk/logo.png" alt="ConveyQuote" width="100"
                style="display:block;width:100px;height:auto;border:0;" />
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

                <!-- Header -->
                <tr>
                  <td style="background:#0f2747;padding:28px 32px;">
                    <div style="font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:rgba(255,255,255,0.7);">ConveyQuote</div>
                    <h1 style="color:#ffffff;margin:8px 0 6px;font-size:26px;line-height:1.2;">Your Conveyancing Estimate</h1>
                    <p style="color:rgba(255,255,255,0.8);margin:0;font-size:14px;">Prepared by ${escapeHtml(referrer.referrer_name)} via ConveyQuote</p>
                  </td>
                </tr>

                <!-- Greeting -->
                <tr>
                  <td style="padding:24px 32px 0 32px;">
                    <p style="margin:0 0 10px;font-size:15px;color:#222;">Dear ${escapeHtml(name || "Client")},</p>
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#4b5563;">
                      Thank you for your enquiry. Please find your conveyancing estimate below.
                      This estimate is based on the information currently available and may be subject
                      to change if further details come to light.
                    </p>
                  </td>
                </tr>

                <!-- Matter Summary -->
                <tr>
                  <td style="padding:20px 32px 0 32px;">
                    <h2 style="margin:0 0 12px;font-size:16px;color:#0f2747;border-bottom:2px solid #0f2747;padding-bottom:6px;">Matter Summary</h2>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                      ${property_address ? `<tr>
                        <td style="padding:8px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#6b7280;width:40%;">Property address</td>
                        <td style="padding:8px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#111827;font-weight:600;">${escapeHtml(property_address)}</td>
                      </tr>` : ""}
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#6b7280;">Transaction type</td>
                        <td style="padding:8px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#111827;font-weight:600;">${prettifyType(type)}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#6b7280;">Tenure</td>
                        <td style="padding:8px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#111827;font-weight:600;">${prettifyTenure(tenure)}</td>
                      </tr>
                      ${price ? `<tr>
                        <td style="padding:8px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#6b7280;">Property price / value</td>
                        <td style="padding:8px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#111827;font-weight:600;">${fmt(price)}</td>
                      </tr>` : ""}
                      ${(type === "purchase" || type === "sale_purchase") ? `<tr>
                        <td style="padding:8px 0;font-size:14px;color:#6b7280;">Mortgage</td>
                        <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${prettifyMortgage(mortgage)}</td>
                      </tr>` : ""}
                    </table>
                  </td>
                </tr>

                <!-- Total highlight -->
                <tr>
                  <td style="padding:20px 32px 0 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                      style="background:#f8fafc;border:1px solid #d9e2ec;border-radius:8px;">
                      <tr>
                        <td style="padding:18px 20px;text-align:center;">
                          <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.4px;color:#486581;margin-bottom:6px;">Total Estimated Cost</div>
                          <div style="font-size:32px;font-weight:700;color:#0f2747;">${fmt(grandTotal)}</div>
                          <div style="font-size:13px;color:#52606d;margin-top:6px;">
                            ${typeof quote.sdltAmount === "number" ? "Including VAT, disbursements and estimated SDLT" : "Including VAT and disbursements"}
                          </div>
                          <div style="font-size:13px;color:#52606d;margin-top:4px;">Reference: <strong>${escapeHtml(reference)}</strong></div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Legal Fees -->
                <tr>
                  <td style="padding:20px 32px 0 32px;">
                    <h2 style="margin:0 0 12px;font-size:16px;color:#0f2747;border-bottom:2px solid #0f2747;padding-bottom:6px;">Legal Fees</h2>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${legalFeeRows}
                      ${vatRow}
                      ${legalTotalRow}
                    </table>
                  </td>
                </tr>

                <!-- Disbursements -->
                ${disbursementRows ? `<tr>
                  <td style="padding:20px 32px 0 32px;">
                    <h2 style="margin:0 0 6px;font-size:16px;color:#0f2747;border-bottom:2px solid #0f2747;padding-bottom:6px;">Disbursements</h2>
                    <p style="margin:0 0 10px;font-size:12px;color:#9ca3af;">Third-party costs paid during the transaction.</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${disbursementRows}
                      ${disbTotalRow}
                    </table>
                  </td>
                </tr>` : ""}

                <!-- SDLT -->
                ${sdltRow ? `<tr>
                  <td style="padding:16px 32px 0 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${sdltRow}
                    </table>
                  </td>
                </tr>` : ""}

                <!-- Grand total summary box -->
                <tr>
                  <td style="padding:20px 32px 0 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                      style="background:#0f2747;border-radius:8px;">
                      <tr>
                        <td style="padding:14px 20px;font-size:15px;color:#ffffff;font-weight:700;">Total Estimated Cost</td>
                        <td style="padding:14px 20px;font-size:18px;color:#ffffff;font-weight:700;text-align:right;">${fmt(grandTotal)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Optional note from the referrer -->
                ${trimmedNote ? `<tr>
                  <td style="padding:16px 32px 0 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                      style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;">
                      <tr>
                        <td style="padding:14px 16px;font-size:13px;line-height:1.7;color:#334155;">
                          <strong>Note from ${escapeHtml(referrer.referrer_name)}:</strong> ${escapeHtml(trimmedNote)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>` : ""}

                <!-- Important note -->
                <tr>
                  <td style="padding:16px 32px 0 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                      style="background:#fff8e6;border:1px solid #e2c275;border-radius:8px;">
                      <tr>
                        <td style="padding:14px 16px;font-size:13px;line-height:1.7;color:#7a4b00;">
                          <strong>Important:</strong> This is an indicative estimate based on the information currently provided.
                          Final costs will be confirmed by the instructed solicitor. If the matter proves more complex than anticipated,
                          any change in costs will be discussed with you before that additional work is carried out.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Accept button -->
                <tr>
                  <td align="center" style="padding:28px 32px 12px 32px;">
                    <a href="${acceptUrl}"
                      style="display:inline-block;background:#0f2747;color:#ffffff;text-decoration:none;
                             padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;">
                      Accept This Quote
                    </a>
                  </td>
                </tr>

                <!-- Contact -->
                <tr>
                  <td style="padding:0 32px 28px 32px;text-align:center;font-size:13px;color:#6b7280;">
                    Questions? Contact us at
                    <a href="mailto:info@conveyquote.uk" style="color:#0f2747;font-weight:600;">info@conveyquote.uk</a>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;
                             font-size:11px;color:#9ca3af;text-align:center;line-height:1.7;">
                    This estimate does not create a solicitor-client relationship until you are formally onboarded
                    and we confirm instructions. ConveyQuote is a trading name of Essentially Law Limited.
                  </td>
                </tr>

              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      // Risk 1 — client quote email already checked response.ok but
      // failure was logged only. We now also record the outcome on the
      // enquiry's email-tracking columns: sent_at + message_id on
      // success, last_error on failure. The enquiry row still exists
      // either way — the referrer's submission was the user-facing
      // action and must not roll back on a Resend hiccup.
      let clientEmailError = null;
      let clientEmailMessageId = null;
      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "ConveyQuote <quotes@conveyquote.uk>",
            to: [email],
            reply_to: "info@conveyquote.uk",
            subject: `Your Conveyancing Quote — ${reference}`,
            html: clientHtml,
          }),
        });

        if (!resendResponse.ok) {
          const resendErrorText = await resendResponse.text().catch(() => "");
          clientEmailError = `HTTP ${resendResponse.status} ${resendErrorText}`.slice(0, 240);
          console.error(
            `referrer-submit-enquiry: client quote email failed for ref=${reference}: ${clientEmailError}`
          );
        } else {
          const okJson = await resendResponse.json().catch(() => ({}));
          clientEmailMessageId = okJson?.id || null;
          clientEmailed = true;
        }
      } catch (sendErr) {
        clientEmailError = String(sendErr instanceof Error ? sendErr.message : sendErr).slice(0, 240);
        console.error(
          `referrer-submit-enquiry: client quote email threw for ref=${reference}:`,
          sendErr
        );
      }

      try {
        await env.DB.prepare(
          `UPDATE enquiries
              SET notification_email_sent_at    = COALESCE(?, notification_email_sent_at),
                  notification_email_message_id = COALESCE(?, notification_email_message_id),
                  notification_email_last_error = ?
            WHERE reference = ?`
        )
          .bind(
            clientEmailed ? new Date().toISOString() : null,
            clientEmailMessageId,
            clientEmailError,
            reference
          )
          .run();
      } catch (writeErr) {
        console.error(
          `referrer-submit-enquiry: failed to record client email outcome on enquiry ref=${reference}:`,
          writeErr
        );
      }

      // Surface client-email failure to the caller so the referrer's
      // UI can show "enquiry saved — quote email failed, please retry"
      // instead of "quote sent" when it wasn't.
      if (clientEmailError) {
        return jsonResponse({
          success: true,
          reference,
          quote,
          client_emailed: false,
          client_email_error: clientEmailError,
          admin_email_error: adminEmailError,
        });
      }
    }

    return jsonResponse({
      success: true,
      reference,
      quote,
      client_emailed: clientEmailed,
      admin_email_error: adminEmailError,
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
