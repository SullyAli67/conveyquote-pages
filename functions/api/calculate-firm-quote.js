// functions/api/calculate-firm-quote.js
//
// Phase 1 of Type 2 firm-quoting product.
//
// Generates a quote for an enquiry using a specific firm's own configured
// legal fees from `firm_fee_configs`. Disbursements are pass-through and
// always come from central defaults defined below. SDLT uses the same
// calculator the central Type 1 engine uses (single source of truth for
// HMRC tax math — reused via export from functions/lib/calculate-quote.js).
//
// This endpoint is fully independent of the customer-facing quote rail:
// it never reads central legal-fee pricing, and the customer-facing
// pipeline (send-quote.js / send-approved-quote.js / calculate-quote.js)
// is not modified by Phase 1. The two rails share only the SDLT helper,
// which is HMRC policy and is the same for both products.

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";
import { calculateSdlt } from "../lib/calculate-quote.js";

// ── Disbursement defaults (Phase 1 — central, not firm-configurable) ──
//
// Per the Phase 1 spec, disbursements are pass-through costs and not
// firm-configurable. These values match the central Type 1 engine where
// they overlap; Office Copy Entries differs (£6 here vs £12 in
// calculate-quote.js) — see PR description for the call.
const DEFAULTS = {
  searchPack: 350,
  landRegistryFee: 150,       // flat — neither rail implements an HMLR sliding scale yet
  idChecksPerBuyer: 14.4,
  os1Search: 8.8,
  bankruptcyPerBuyer: 7.6,
  sdltSubmission: 6,
  ap1Submission: 6,
  officeCopyEntries: 6,
};

const VAT_RATE = 0.2;

const SUPPORTED_TRANSACTION_TYPES = new Set([
  "purchase",
  "sale",
  "remortgage",
  "transfer",
  "sale_purchase",
  "remortgage_transfer",
]);

// Each entry maps a request condition to a case-insensitive label
// substring. When a firm_fee_configs row matches a pattern here, the
// row is included only if the corresponding condition is true. Rows
// that do not match any pattern are treated as unconditional base fees
// and are always included.
//
// `supplementKey` is set for entries that come from the request's
// `supplements` object — those are the ones that produce a warning when
// the flag is true but no matching row exists in firm_fee_configs.
const CONDITIONAL_PATTERNS = [
  { test: (req) => req.tenure === "leasehold", pattern: "leasehold", supplementKey: null },
  { test: (req) => req.mortgageOrCash === "mortgage", pattern: "acting for lender", supplementKey: null },
  { test: (req) => Boolean(req.supplements?.newBuild), pattern: "new build", supplementKey: "newBuild" },
  { test: (req) => Boolean(req.supplements?.sharedOwnership), pattern: "shared ownership", supplementKey: "sharedOwnership" },
  { test: (req) => Boolean(req.supplements?.helpToBuy), pattern: "help to buy", supplementKey: "helpToBuy" },
  { test: (req) => Boolean(req.supplements?.buyToLet), pattern: "buy to let", supplementKey: "buyToLet" },
  { test: (req) => Boolean(req.supplements?.companyBuyer), pattern: "company", supplementKey: "companyBuyer" },
  { test: (req) => Boolean(req.supplements?.giftedDeposit), pattern: "gifted", supplementKey: "giftedDeposit" },
  { test: (req) => Boolean(req.supplements?.lifetimeIsa), pattern: "lifetime isa", supplementKey: "lifetimeIsa" },
  { test: (req) => Boolean(req.supplements?.rightToBuy), pattern: "right to buy", supplementKey: "rightToBuy" },
  { test: (req) => Boolean(req.supplements?.additionalProperty), pattern: "additional property", supplementKey: "additionalProperty" },
];

// Human-readable labels for warnings.
const SUPPLEMENT_LABELS = {
  newBuild: "New build supplement",
  sharedOwnership: "Shared ownership supplement",
  helpToBuy: "Help to Buy supplement",
  buyToLet: "Buy to let supplement",
  companyBuyer: "Company buyer supplement",
  giftedDeposit: "Gifted deposit supplement",
  lifetimeIsa: "Lifetime ISA supplement",
  rightToBuy: "Right to Buy supplement",
  additionalProperty: "Additional property supplement",
};

function round2(n) {
  return Number((Number(n) || 0).toFixed(2));
}

function perPersonLabel(base, n) {
  return n > 1 ? `${base} (${n} buyers)` : base;
}

function classifyRow(row) {
  const label = String(row.label || "").toLowerCase();
  for (const entry of CONDITIONAL_PATTERNS) {
    if (label.includes(entry.pattern)) return entry;
  }
  return null;
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // ── Auth ──────────────────────────────────────────────────────────
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "firm");
    if (!session) return unauthorised();

    const firmId = session.user_id;

    // ── Firm role check ──────────────────────────────────────────────
    const firm = await env.DB.prepare(
      `SELECT id, firm_name, is_saas_firm
         FROM panel_firms
        WHERE id = ?
        LIMIT 1`
    )
      .bind(firmId)
      .first();

    if (!firm) {
      return jsonResponse(
        { success: false, error: "Firm not found." },
        404
      );
    }

    if (Number(firm.is_saas_firm) !== 1) {
      return jsonResponse(
        {
          success: false,
          error: "This firm is not enabled for the quoting product.",
        },
        403
      );
    }

    // ── Body validation ──────────────────────────────────────────────
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse(
        { success: false, error: "Invalid request body." },
        400
      );
    }

    const transactionType = String(body.transactionType || "").trim();
    if (!SUPPORTED_TRANSACTION_TYPES.has(transactionType)) {
      return jsonResponse(
        {
          success: false,
          error: `Unsupported transactionType '${transactionType}'.`,
        },
        400
      );
    }

    const price = Number(body.price) || 0;
    const salePrice = Number(body.salePrice) || 0;
    const tenure = body.tenure === "leasehold" ? "leasehold" : "freehold";
    const buyerCount = Math.max(1, Math.floor(Number(body.buyerCount) || 1));
    const mortgageOrCash =
      body.mortgageOrCash === "mortgage" ? "mortgage" : "cash";
    const supplements = body.supplements || {};
    const sdltFlags = body.sdltFlags || {};

    const reqCtx = { tenure, mortgageOrCash, supplements };

    // ── Load firm legal fees ─────────────────────────────────────────
    const feeConfigResult = await env.DB.prepare(
      `SELECT id, label, amount, includes_vat, is_disbursement, sort_order
         FROM firm_fee_configs
        WHERE firm_id = ?
          AND transaction_type = ?
        ORDER BY sort_order, id`
    )
      .bind(firmId, transactionType)
      .all();

    const rows = (feeConfigResult.results || []).filter(
      (r) => Number(r.is_disbursement) === 0
    );

    if (rows.length === 0) {
      return jsonResponse(
        {
          success: false,
          error: `No fee configuration found for ${transactionType}. Please set up fees in Fee Settings before issuing a quote.`,
        },
        400
      );
    }

    // ── Build legal fees ─────────────────────────────────────────────
    const legalFees = [];
    const matchedSupplementKeys = new Set();
    const warnings = [];

    for (const row of rows) {
      const classification = classifyRow(row);
      if (classification) {
        const conditionMet = classification.test(reqCtx);
        if (!conditionMet) {
          // Conditional row whose condition is false — skip silently.
          continue;
        }
        if (classification.supplementKey) {
          matchedSupplementKeys.add(classification.supplementKey);
        }
      }
      legalFees.push({
        label: String(row.label || ""),
        amount: round2(Number(row.amount) || 0),
        vatApplicable: Number(row.includes_vat) === 1,
      });
    }

    // Warn for any supplement the request asked for but no row matched.
    for (const entry of CONDITIONAL_PATTERNS) {
      if (!entry.supplementKey) continue;
      if (entry.test(reqCtx) && !matchedSupplementKeys.has(entry.supplementKey)) {
        const label = SUPPLEMENT_LABELS[entry.supplementKey];
        warnings.push(
          `${label} requested but no matching '${entry.pattern}' line configured in your fees.`
        );
      }
    }

    const legalFeesNet = round2(
      legalFees.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    );
    const vatBase = round2(
      legalFees
        .filter((item) => item.vatApplicable)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0)
    );
    const vat = round2(vatBase * VAT_RATE);
    const legalFeesGross = round2(legalFeesNet + vat);

    // ── Build disbursements (central defaults) ───────────────────────
    const disbursements = [];

    // Search pack applies to purchases (single or combined) where the
    // buyer is actually buying. Remortgages, sales, and transfers don't
    // typically need a search pack — match calculate-quote.js behaviour.
    if (transactionType === "purchase" || transactionType === "sale_purchase") {
      disbursements.push({ label: "Search pack", amount: DEFAULTS.searchPack });
    }

    // Land Registry registration fee — flat £150 (the central engine uses
    // the same flat value; HMLR sliding scale not currently modelled).
    if (
      transactionType === "purchase" ||
      transactionType === "sale_purchase" ||
      transactionType === "transfer" ||
      transactionType === "remortgage" ||
      transactionType === "remortgage_transfer"
    ) {
      disbursements.push({
        label: "Land Registry fee",
        amount: DEFAULTS.landRegistryFee,
      });
    }

    // ID checks scale with buyer count.
    disbursements.push({
      label: perPersonLabel("ID checks", buyerCount),
      amount: round2(DEFAULTS.idChecksPerBuyer * buyerCount),
    });

    // OS1 search applies only when there's a property acquisition / interest
    // being registered (purchase, sale_purchase, remortgage, remortgage_transfer).
    if (
      transactionType === "purchase" ||
      transactionType === "sale_purchase" ||
      transactionType === "remortgage" ||
      transactionType === "remortgage_transfer"
    ) {
      disbursements.push({ label: "OS1 search", amount: DEFAULTS.os1Search });
    }

    // Bankruptcy search scales with buyer count, required wherever there's
    // a new charge or new owner.
    if (transactionType !== "sale") {
      disbursements.push({
        label: perPersonLabel("Bankruptcy search", buyerCount),
        amount: round2(DEFAULTS.bankruptcyPerBuyer * buyerCount),
      });
    }

    // SDLT submission — only on transactions where consideration is paid
    // for an interest. Per the Phase 1 spec: purchase, sale_purchase, and
    // transfer with consideration. With no explicit consideration flag
    // in the request, we apply it when price > 0 for the listed types.
    if (
      (transactionType === "purchase" ||
        transactionType === "sale_purchase" ||
        transactionType === "transfer") &&
      price > 0
    ) {
      disbursements.push({
        label: "SDLT submission",
        amount: DEFAULTS.sdltSubmission,
      });
    }

    // AP1 submission — wherever a Land Registry change is being applied for.
    if (
      transactionType === "purchase" ||
      transactionType === "sale_purchase" ||
      transactionType === "transfer" ||
      transactionType === "remortgage" ||
      transactionType === "remortgage_transfer"
    ) {
      disbursements.push({
        label: "AP1 submission",
        amount: DEFAULTS.ap1Submission,
      });
    }

    // Office copy entries — always.
    disbursements.push({
      label: "Office copy entries",
      amount: DEFAULTS.officeCopyEntries,
    });

    const disbursementsTotal = round2(
      disbursements.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    );

    // ── SDLT (reused from central calculator) ────────────────────────
    // SDLT only applies to purchases (single or combined). For other
    // transaction types we return 0.
    let sdlt = 0;
    if (
      (transactionType === "purchase" || transactionType === "sale_purchase") &&
      price > 0
    ) {
      const sdltResult = calculateSdlt({
        price,
        firstTimeBuyer: sdltFlags.firstTimeBuyer ? "yes" : "no",
        additionalProperty:
          sdltFlags.additionalProperty || supplements.additionalProperty
            ? "yes"
            : "no",
        ukResidentForSdlt: sdltFlags.ukResident === false ? "no" : "yes",
        isCompany: supplements.companyBuyer ? "yes" : "no",
        sharedOwnership: supplements.sharedOwnership ? "yes" : "no",
      });
      if (typeof sdltResult.sdltAmount === "number") {
        sdlt = round2(sdltResult.sdltAmount);
      } else if (sdltResult.sdltNote) {
        warnings.push(`SDLT: ${sdltResult.sdltNote}`);
      }
    }

    const grandTotal = round2(legalFeesGross + disbursementsTotal + sdlt);

    // Note re: salePrice — Phase 1 does not synthesise a sale+purchase
    // combined quote from separate sale/purchase configs. The firm must
    // configure a `transaction_type = 'sale_purchase'` row set (or
    // `remortgage_transfer`) if they want to quote on those combined
    // matters. Documented in the PR description.
    void salePrice;

    return jsonResponse({
      success: true,
      legalFees,
      legalFeesNet,
      vat,
      legalFeesGross,
      disbursements,
      disbursementsTotal,
      sdlt,
      grandTotal,
      warnings,
      firmName: String(firm.firm_name || ""),
      transactionType,
    });
  } catch (error) {
    console.error("calculate-firm-quote error:", error);
    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}
