// functions/lib/calculate-referrer-quote-core.js
//
// Pattern B per-referrer pricing engine. Mirrors
// functions/lib/calculate-firm-quote-core.js exactly — same supplement
// matching, same NULL=unconditional / non-NULL=conditional row
// semantics, same warnings — but reads from referrer_fee_configs keyed
// on referrer_id rather than firm_fee_configs keyed on firm_id.
//
// Pricing isolation rules
// -----------------------
//   • Legal fees come 100% from referrer_fee_configs for this referrer.
//   • Disbursements come from the same central named constants as the
//     firm engine (single source of truth shared with the customer rail).
//   • Office copies come from disbursement-constants (tenure-based).
//   • SDLT comes from the central calculateSdlt (HMRC tax math).
//
// Engine harness note
// -------------------
// scripts/verify-engine-consistency.js compares the customer engine
// (buildQuoteData) against the firm engine (calculate-firm-quote-core)
// and expects byte-identical output. This referrer engine is a third
// pricing path and is intentionally NOT covered by that harness because
// per-referrer pricing is, by design, not expected to match the global
// customer price book — the whole point of Pattern B is that referrers
// can be priced individually. Adding referrer scenarios to the harness
// would produce false positives. Keep the engine in its own lane.

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

// Canonical supplement keys — copied verbatim from
// functions/lib/calculate-firm-quote-core.js. Kept inline here rather
// than imported because the firm engine module is otherwise fully
// self-contained and exporting an internal mutable would couple the two
// rails more tightly than necessary. Any change to the canonical set
// must be applied in both places (and in the SUPPLEMENT_OPTIONS array
// in src/App.tsx).
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

// Exported so the referrer-fee-config endpoint can validate
// supplement_key values sent by the frontend without re-declaring the
// list. Same canonical set as the firm engine.
export const VALID_SUPPLEMENT_KEYS = SUPPLEMENT_KEYS.map((e) => e.key);

function round2(n) {
  return Number((Number(n) || 0).toFixed(2));
}

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

// Public entry point. Returns a tagged result so the caller can pick
// the HTTP status code without inspecting the payload — same shape as
// calculateFirmQuote.
//   { ok: true, status: 200, payload: {...quote breakdown...} }
//   { ok: false, status: 4xx, error: "..." }
export async function calculateReferrerQuote({ db, referrerId, body }) {
  const referrer = await db
    .prepare(
      `SELECT id, referrer_name FROM referrers WHERE id = ? LIMIT 1`
    )
    .bind(referrerId)
    .first();

  if (!referrer) {
    return { ok: false, status: 404, error: "Referrer not found." };
  }

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
  const sharePercent = optionalNumber(body.sharePercent);
  const continuingMortgage = optionalNumber(body.continuingMortgage);

  const reqCtx = { tenure, mortgageOrCash, supplements };

  const feeConfigResult = await db
    .prepare(
      `SELECT id, label, amount, includes_vat, is_disbursement, sort_order, supplement_key
         FROM referrer_fee_configs
        WHERE referrer_id = ?
          AND transaction_type = ?
        ORDER BY sort_order, id`
    )
    .bind(referrerId, transactionType)
    .all();

  const rows = (feeConfigResult.results || []).filter(
    (r) => Number(r.is_disbursement) === 0
  );

  if (rows.length === 0) {
    return {
      ok: false,
      status: 400,
      error: `No fee configuration found for ${transactionType}. Ask admin to set up referrer pricing for this transaction type before issuing a quote.`,
    };
  }

  const legalFees = [];
  const matchedSupplementKeys = new Set();
  const warnings = [];
  const supplementByKey = new Map(SUPPLEMENT_KEYS.map((e) => [e.key, e]));

  for (const row of rows) {
    const supplementKey = row.supplement_key || null;
    if (supplementKey) {
      const entry = supplementByKey.get(supplementKey);
      if (!entry) {
        warnings.push(
          `Fee row "${String(row.label || "")}" has an unknown supplement_key '${supplementKey}' and was skipped.`
        );
        continue;
      }
      if (!entry.requestFlag(reqCtx)) {
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
      `${entry.triggeredBy} was requested but no ${entry.label} is configured. The quote may be under-priced. Ask admin to add a ${entry.label} in the Pricing section of this referrer's profile.`
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

  const disbursements = [];

  if (transactionType === "purchase" || transactionType === "sale_purchase") {
    disbursements.push({ label: "Search pack", amount: SEARCH_PACK_FEE });
  }

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
      referrerName: String(referrer.referrer_name || ""),
      transactionType,
    },
  };
}
