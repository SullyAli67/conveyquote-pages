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
  ID_CHECKS_PER_BUYER,
  OS1_SEARCH_FEE,
  BANKRUPTCY_SEARCH_PER_BUYER,
  SDLT_SUBMISSION_FEE,
  AP1_SUBMISSION_FEE,
} from "./calculate-quote.js";
import {
  getOfficeCopyEntriesAmount,
  getLandRegistryFee,
} from "./disbursement-constants.js";

const VAT_RATE = 0.2;

const SUPPORTED_TRANSACTION_TYPES = new Set([
  "purchase",
  "sale",
  "remortgage",
  "transfer",
  "sale_purchase",
  "remortgage_transfer",
]);

// Canonical supplement keys. Each entry pairs the persisted
// firm_fee_configs.supplement_key value with the request flag that
// activates it and the human-readable label used in warnings. A row in
// firm_fee_configs with supplement_key = NULL is an unconditional base
// fee. A row with supplement_key matching one of these keys is included
// only when the request flag is true.
const SUPPLEMENT_KEYS = [
  {
    key: "leasehold",
    requestFlag: (req) => req.tenure === "leasehold",
    label: "Leasehold supplement",
    triggeredBy: "Leasehold tenure",
  },
  {
    key: "mortgagePresent",
    requestFlag: (req) => req.mortgageOrCash === "mortgage",
    label: "Acting for lender supplement",
    triggeredBy: "Mortgage",
  },
  {
    key: "newBuild",
    requestFlag: (req) => Boolean(req.supplements?.newBuild),
    label: "New build supplement",
    triggeredBy: "New build",
  },
  {
    key: "sharedOwnership",
    requestFlag: (req) => Boolean(req.supplements?.sharedOwnership),
    label: "Shared ownership supplement",
    triggeredBy: "Shared ownership",
  },
  {
    key: "helpToBuy",
    requestFlag: (req) => Boolean(req.supplements?.helpToBuy),
    label: "Help to Buy supplement",
    triggeredBy: "Help to Buy",
  },
  {
    key: "buyToLet",
    requestFlag: (req) => Boolean(req.supplements?.buyToLet),
    label: "Buy to let supplement",
    triggeredBy: "Buy to let",
  },
  {
    key: "companyBuyer",
    requestFlag: (req) => Boolean(req.supplements?.companyBuyer),
    label: "Buying via company supplement",
    triggeredBy: "Buying via company",
  },
  {
    key: "giftedDeposit",
    requestFlag: (req) => Boolean(req.supplements?.giftedDeposit),
    label: "Gifted deposit supplement",
    triggeredBy: "Gifted deposit",
  },
  {
    key: "lifetimeIsa",
    requestFlag: (req) => Boolean(req.supplements?.lifetimeIsa),
    label: "Lifetime ISA supplement",
    triggeredBy: "Lifetime ISA",
  },
  {
    key: "rightToBuy",
    requestFlag: (req) => Boolean(req.supplements?.rightToBuy),
    label: "Right to Buy supplement",
    triggeredBy: "Right to Buy",
  },
  {
    key: "additionalProperty",
    requestFlag: (req) => Boolean(req.supplements?.additionalProperty),
    label: "Additional property supplement",
    triggeredBy: "Additional property",
  },
];

// Exported so the firm-fee-config endpoint can validate supplement_key
// values sent by the frontend without re-declaring the list.
export const VALID_SUPPLEMENT_KEYS = SUPPLEMENT_KEYS.map((e) => e.key);

function round2(n) {
  return Number((Number(n) || 0).toFixed(2));
}

// Coerce request input to a number, preserving null for blank/missing
// so the LR helper can distinguish blank from £0.
function optionalNumber(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).replace(/,/g, "").trim();
  if (str === "") return null;
  const parsed = Number(str);
  return Number.isFinite(parsed) ? parsed : null;
}

function perPersonLabel(base, n) {
  return n > 1 ? `${base} (${n} buyers)` : base;
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
  const mortgageAmount = Number(body.mortgageAmount) || 0;
  const tenure = body.tenure === "leasehold" ? "leasehold" : "freehold";
  const buyerCount = Math.max(1, Math.floor(Number(body.buyerCount) || 1));
  const mortgageOrCash =
    body.mortgageOrCash === "mortgage" ? "mortgage" : "cash";
  const supplements = body.supplements || {};
  const sdltFlags = body.sdltFlags || {};
  // Optional transfer-of-equity refinements. Null when blank/missing so
  // the LR helper falls back to the conservative full-property estimate
  // rather than treating blank as zero.
  const sharePercent = optionalNumber(body.sharePercent);
  const continuingMortgage = optionalNumber(body.continuingMortgage);

  const reqCtx = { tenure, mortgageOrCash, supplements };

  // ── Load firm legal fees ───────────────────────────────────────────
  const feeConfigResult = await db
    .prepare(
      `SELECT id, label, amount, includes_vat, is_disbursement, sort_order, supplement_key
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
  // Rows with supplement_key = NULL are unconditional base fees and are
  // always included. Rows with a non-NULL supplement_key are included
  // only when the corresponding request flag is true. After the loop we
  // warn for every supplement the firm requested but didn't configure.
  const legalFees = [];
  const matchedSupplementKeys = new Set();
  const warnings = [];
  const supplementByKey = new Map(SUPPLEMENT_KEYS.map((e) => [e.key, e]));

  for (const row of rows) {
    const supplementKey = row.supplement_key || null;
    if (supplementKey) {
      const entry = supplementByKey.get(supplementKey);
      if (!entry) {
        // Unknown key persisted in the DB — skip the row and warn so the
        // firm notices. Shouldn't happen in normal use because the
        // endpoint validates keys against VALID_SUPPLEMENT_KEYS.
        warnings.push(
          `Fee row "${String(row.label || "")}" has an unknown supplement_key '${supplementKey}' and was skipped.`
        );
        continue;
      }
      if (!entry.requestFlag(reqCtx)) {
        // Conditional row whose flag is false — skip silently.
        continue;
      }
      matchedSupplementKeys.add(supplementKey);
    }
    legalFees.push({
      label: String(row.label || ""),
      amount: round2(Number(row.amount) || 0),
      vatApplicable: Number(row.includes_vat) === 1,
    });
  }

  for (const entry of SUPPLEMENT_KEYS) {
    if (!entry.requestFlag(reqCtx)) continue;
    if (matchedSupplementKeys.has(entry.key)) continue;
    warnings.push(
      `${entry.triggeredBy} was requested but no ${entry.label} is configured. The quote may be under-priced. Add a ${entry.label} in Fee Settings.`
    );
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

  // HMLR statutory sliding scale, no VAT. Single source of truth in
  // ./disbursement-constants.js (Scale 1 / Scale 2 / dispatcher). For
  // sale-only matters the helper returns 0 (no LR fee on a sale).
  const landRegistryFee = getLandRegistryFee({
    transactionType,
    purchasePrice: price,
    mortgageAmount,
    propertyValue: price,
    sharePercent,
    continuingMortgage,
  });
  if (landRegistryFee > 0) {
    disbursements.push({
      label: "Land Registry fee",
      amount: landRegistryFee,
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
