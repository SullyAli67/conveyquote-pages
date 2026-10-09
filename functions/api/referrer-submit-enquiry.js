// functions/api/referrer-submit-enquiry.js
// Referrer (e.g. estate agent) submits an enquiry on behalf of a client
// Uses same logic as send-quote.js but ties to referrer_id.
//
// Optional referrer note
// ----------------------
// Referrers can attach a free-text note (≤ 500 chars) when submitting.
// Persisted to referrer_workflow.referrer_note, included in the admin
// notification email, and shown read-only on the referrer's My Referrals
// expanded matter card.
//
// No direct client email
// ----------------------
// Referrers cannot email a quote to the client from here. Every referral
// lands in the admin Quote Review queue (status 'new') and the client only
// receives a quote once admin approves it via send-approved-quote.js,
// which copies the referrer in.
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
import { getSpecialistMatterLabel } from "../lib/matter-families.js";
import { calculateReferrerQuote } from "../lib/calculate-referrer-quote-core.js";
import { insertEnquiryWithUniqueReference } from "../lib/enquiry-reference.js";
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

const escapeHtml = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const formatMoney = (v) =>
  v !== undefined && v !== null
    ? `£${Number(v).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "Not provided";

const getTransactionLabel = (type) => {
  // Enfranchisement labels live in functions/lib/enfranchisement/types.js
  // so they are defined exactly once across every rail.
  const specialistLabel = getSpecialistMatterLabel(type);
  if (specialistLabel) return specialistLabel;

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

    const reference = await insertEnquiryWithUniqueReference(env.DB, {
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
    }, insertEnquiryRow);

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
                    ${trimmedNote ? `<tr><td style="padding:7px 0;color:#6b7280;">Referrer note</td><td style="padding:7px 0;">${escapeHtml(trimmedNote)}</td></tr>` : ""}
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

    // The quote is NOT emailed to the client from here. It waits in the
    // admin Quote Review queue (status 'new') and only goes out when
    // admin presses Send Approved Quote — see send-approved-quote.js.
    return jsonResponse({
      success: true,
      reference,
      quote,
      admin_email_error: adminEmailError,
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
