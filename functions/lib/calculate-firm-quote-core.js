// functions/lib/calculate-firm-quote-core.js
//
// Shared calculation core for the Type 2 firm-quoting product. Used by
// both POST /api/calculate-firm-quote (which only computes and returns)
// and POST /api/save-firm-quote (which computes, then persists).
//
// Pricing isolation rules from Phase 1 still apply:
//   • Legal fees come 100% from `firm_fee_configs` for this firm.
//   • Disbursements come from central named constants (single source of
//     truth shared with the customer-facing rail — pass-through costs).
//   • Office copies come from the shared `disbursement-constants` module
//     (tenure-based; same function the customer-facing TS engine uses).
//   • SDLT comes from the central `calculateSdlt` (HMRC tax math).
//
// This module never reads central legal-fee pricing.

import {
  calculateSdlt,
  SEARCH_PACK_FEE,
  LAND_REGISTRY_FEE,
  ID_CHECKS_PER_BUYER,
  OS1_SEARCH_FEE,
  BANKRUPTCY_SEARCH_PER_BUYER,
  SDLT_SUBMISSION_FEE,
  AP1_SUBMISSION_FEE,
} from "./calculate-quote.js";
import { getOfficeCopyEntriesAmount } from "./disbursement-constants.js";

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

// Public entry point. Returns a tagged result so the caller can pick the
// HTTP status code without inspecting the payload.
//   { ok: true, status: 200, payload: {...quote breakdown...} }
//   { ok: false, status: 4xx, error: "..." }
//
// Caller is responsible for: validating the firm session, providing
// `firmId` from that session, and forwarding the result to the client.
export async function calculateFirmQuote({ db, firmId, body }) {
  // ── Firm role check ────────────────────────────────────────────────
  const firm = await db
    .prepare(
      `SELECT id, firm_name, is_saas_firm
         FROM panel_firms
        WHERE id = ?
        LIMIT 1`
    )
    .bind(firmId)
    .first();

  if (!firm) {
    return { ok: false, status: 404, error: "Firm not found." };
  }

  if (Number(firm.is_saas_firm) !== 1) {
    return {
      ok: false,
      status: 403,
      error: "This firm is not enabled for the quoting product.",
    };
  }

  // ── Body validation ────────────────────────────────────────────────
  if (!body || typeof body !== "object") {
    return { ok: false, status: 400, error: "Invalid request body." };
  }

  const transactionType = String(body.transactionType || "").trim();
  if (!SUPPORTED_TRANSACTION_TYPES.has(transactionType)) {
    return {
      ok: false,
      status: 400,
      error: `Unsupported transactionType '${transactionType}'.`,
    };
  }

  const price = Number(body.price) || 0;
  const tenure = body.tenure === "leasehold" ? "leasehold" : "freehold";
  const buyerCount = Math.max(1, Math.floor(Number(body.buyerCount) || 1));
  const mortgageOrCash =
    body.mortgageOrCash === "mortgage" ? "mortgage" : "cash";
  const supplements = body.supplements || {};
  const sdltFlags = body.sdltFlags || {};

  const reqCtx = { tenure, mortgageOrCash, supplements };

  // ── Load firm legal fees ───────────────────────────────────────────
  const feeConfigResult = await db
    .prepare(
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
    return {
      ok: false,
      status: 400,
      error: `No fee configuration found for ${transactionType}. Please set up fees in Fee Settings before issuing a quote.`,
    };
  }

  // ── Build legal fees ───────────────────────────────────────────────
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

  // ── Build disbursements (central defaults) ─────────────────────────
  const disbursements = [];

  if (transactionType === "purchase" || transactionType === "sale_purchase") {
    disbursements.push({ label: "Search pack", amount: SEARCH_PACK_FEE });
  }

  if (
    transactionType === "purchase" ||
    transactionType === "sale_purchase" ||
    transactionType === "transfer" ||
    transactionType === "remortgage" ||
    transactionType === "remortgage_transfer"
  ) {
    disbursements.push({
      label: "Land Registry fee",
      amount: LAND_REGISTRY_FEE,
    });
  }

  disbursements.push({
    label: perPersonLabel("ID checks", buyerCount),
    amount: round2(ID_CHECKS_PER_BUYER * buyerCount),
  });

  if (
    transactionType === "purchase" ||
    transactionType === "sale_purchase" ||
    transactionType === "remortgage" ||
    transactionType === "remortgage_transfer"
  ) {
    disbursements.push({ label: "OS1 search", amount: OS1_SEARCH_FEE });
  }

  if (transactionType !== "sale") {
    disbursements.push({
      label: perPersonLabel("Bankruptcy search", buyerCount),
      amount: round2(BANKRUPTCY_SEARCH_PER_BUYER * buyerCount),
    });
  }

  if (
    (transactionType === "purchase" ||
      transactionType === "sale_purchase" ||
      transactionType === "transfer") &&
    price > 0
  ) {
    disbursements.push({
      label: "SDLT submission",
      amount: SDLT_SUBMISSION_FEE,
    });
  }

  if (
    transactionType === "purchase" ||
    transactionType === "sale_purchase" ||
    transactionType === "transfer" ||
    transactionType === "remortgage" ||
    transactionType === "remortgage_transfer"
  ) {
    disbursements.push({
      label: "AP1 submission",
      amount: AP1_SUBMISSION_FEE,
    });
  }

  disbursements.push({
    label: "Office copy entries",
    amount: getOfficeCopyEntriesAmount(tenure),
  });

  const disbursementsTotal = round2(
    disbursements.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  );

  // ── SDLT (central calculator) ──────────────────────────────────────
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

  return {
    ok: true,
    status: 200,
    payload: {
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
    },
  };
}
