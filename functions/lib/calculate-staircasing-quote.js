// functions/lib/calculate-staircasing-quote.js
//
// The staircasing engine.
//
// Written once and imported by every rail, for the same reason as the
// enfranchisement engine: the conveyancing price book is implemented
// twice and drifted for years without anyone noticing. This family does
// not repeat that.
//
// ═══════════════════════════════════════════════════════════════════
//  THE CENTRAL RULE, UNCHANGED ACROSS FAMILIES
//  `grandTotal` means OUR fees plus the disbursements WE CAN FIX.
//  The price of the share, the provider's administration fee and the
//  valuation never enter it. Enforced by assertNoThirdPartyLeakage().
// ═══════════════════════════════════════════════════════════════════

import { ID_CHECKS_PER_BUYER } from "./pass-through-costs.js";
import {
  getOfficeCopyEntriesAmount,
  getLandRegistryScale1Fee,
} from "./disbursement-constants.js";
import { MATTER_FAMILY } from "./matter-families.js";
import {
  SHARED_OWNERSHIP_TYPES,
  getSharedOwnershipLabel,
  getSharedOwnershipBasis,
  isSharedOwnershipType,
} from "./shared-ownership/types.js";
import {
  assessStaircasingSdlt,
  STAIRCASING_SDLT_OUTCOME,
} from "./shared-ownership/sdlt.js";
import {
  getBaseFee,
  getSupplement,
  PROVIDER_ADMIN_FEE,
  STAIRCASING_VALUATION_FEE,
  ABORTIVE_POLICY,
} from "./shared-ownership/price-book.js";

const VAT_RATE = 0.2;
const THIRD_PARTY_STATUS = { ESTIMATE: "estimate", TBC: "tbc", NOT_INCLUDED: "not_included" };

const round2 = (n) => Number((Number(n) || 0).toFixed(2));
const formatMoney = (v) => `£${Number(v || 0).toFixed(2)}`;
const formatRange = (a, b) => `${formatMoney(a)} – ${formatMoney(b)}`;
const sumAmounts = (items) => items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

function toOptionalNumber(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).replace(/[%,\s]/g, "");
  if (str === "") return null;
  const n = Number(str);
  return Number.isFinite(n) ? n : null;
}

function isYes(value) {
  if (value === true) return true;
  return ["yes", "true"].includes(String(value ?? "").trim().toLowerCase());
}

function assertNoThirdPartyLeakage(legalFees, disbursements) {
  for (const item of [...legalFees, ...disbursements]) {
    if (item && item.withinFirmControl === false) {
      throw new Error(
        `calculate-staircasing-quote: third-party cost "${item.label}" leaked into the ` +
          "billable totals. Third-party costs belong in thirdPartyCosts and must never " +
          "be included in grandTotal."
      );
    }
  }
}

// ── Qualification ───────────────────────────────────────────────────
//
// Lighter than the enfranchisement gate, because staircasing is a
// contractual right under the lease rather than a statutory one — but
// the arithmetic still has to make sense, and some leases restrict how
// far or how often you may staircase.
function assessStaircasingQualification(input) {
  const reasons = [];
  let outcome = "qualifies";

  const fail = (code, message) => {
    outcome = "does_not_qualify";
    reasons.push({ code, severity: "bar", message, statutoryRef: null });
  };
  const review = (code, message) => {
    if (outcome !== "does_not_qualify") outcome = "needs_review";
    reasons.push({ code, severity: "review", message, statutoryRef: null });
  };
  const note = (code, message) => {
    reasons.push({ code, severity: "note", message, statutoryRef: null });
  };

  const current = toOptionalNumber(input.currentSharePercent);
  const additional = toOptionalNumber(input.additionalSharePercent);

  if (current === null) {
    review("current_share_unknown", "We need to know what share of your home you own now.");
  } else if (current <= 0 || current >= 100) {
    fail(
      "current_share_out_of_range",
      `You have told us you own ${current}%. Staircasing applies where you own a share of ` +
        "between 1% and 99% — if you already own the whole property there is nothing to " +
        "staircase."
    );
  }

  if (additional === null) {
    review("additional_share_unknown", "We need to know what further share you want to buy.");
  } else if (additional <= 0) {
    fail("additional_share_invalid", "The further share you are buying must be more than 0%.");
  }

  if (current !== null && additional !== null) {
    const resulting = current + additional;
    if (resulting > 100) {
      fail(
        "exceeds_full_ownership",
        `Owning ${current}% and buying a further ${additional}% comes to ${resulting}%, ` +
          "which is more than the whole property. Please check the figures."
      );
    } else if (resulting === 100) {
      note(
        "final_staircasing",
        "This purchase takes you to 100% ownership. Once you own the whole property you " +
          "will generally be able to extend your lease under the 1993 Act in the ordinary " +
          "way, and we can quote for that separately."
      );
    }
  }

  // Many leases set a minimum share per step, and some older ones cap
  // the number of steps or stop short of 100%.
  if (isYes(input.leaseRestrictsStaircasing)) {
    review(
      "lease_restricts",
      "You have told us your lease restricts staircasing — for example a minimum share per " +
        "step, a limit on the number of steps, or a cap below 100%. We need to read the " +
        "lease before confirming this quote."
    );
  }

  if (isYes(input.providerConsentRefused)) {
    review(
      "provider_issue",
      "You have told us there is an outstanding issue with your provider. We need to " +
        "understand it before quoting."
    );
  }

  return { outcome, reasons, statutoryRefs: [], flags: {} };
}

function buildThirdPartyCosts({ sharePrice }) {
  return [
    {
      label: "Price of the further share",
      status: THIRD_PARTY_STATUS.NOT_INCLUDED,
      amountLow: sharePrice ?? null,
      amountHigh: sharePrice ?? null,
      withinFirmControl: false,
      payableTo: "Your housing association or provider",
      valuerRequired: true,
      note:
        sharePrice != null
          ? "Based on the figure you have given us. The price is set by the RICS " +
            "valuation and your provider's calculation, and may change."
          : "The price of the further share is NOT included in this quote and is not " +
            "something we calculate. It is set by a RICS valuation of the whole property, " +
            "applied to the share you are buying. Your provider will confirm it.",
    },
    {
      label: PROVIDER_ADMIN_FEE.label,
      status: THIRD_PARTY_STATUS.ESTIMATE,
      amountLow: PROVIDER_ADMIN_FEE.amountLow,
      amountHigh: PROVIDER_ADMIN_FEE.amountHigh,
      withinFirmControl: false,
      payableTo: PROVIDER_ADMIN_FEE.payableTo,
      note: PROVIDER_ADMIN_FEE.note,
    },
    {
      label: STAIRCASING_VALUATION_FEE.label,
      status: THIRD_PARTY_STATUS.ESTIMATE,
      amountLow: STAIRCASING_VALUATION_FEE.amountLow,
      amountHigh: STAIRCASING_VALUATION_FEE.amountHigh,
      withinFirmControl: false,
      payableTo: STAIRCASING_VALUATION_FEE.payableTo,
      note: STAIRCASING_VALUATION_FEE.note,
    },
  ];
}

function buildExclusions(sdlt) {
  const exclusions = [
    {
      label: "Extending your lease",
      note:
        "If you reach 100% and then want to extend your lease, that is separate work and " +
        "we will quote for it separately.",
      amount: null,
    },
    {
      label: "Remortgaging at the same time",
      note:
        "Moving to a new lender alongside the staircasing is a separate transaction. Tell " +
        "us if you intend to and we will quote for both together.",
      amount: null,
    },
  ];

  if (sdlt.outcome === STAIRCASING_SDLT_OUTCOME.MANUAL_REVIEW) {
    exclusions.push({
      label: "Stamp Duty Land Tax",
      note: sdlt.note,
      amount: null,
    });
  }

  return exclusions;
}

/**
 * Build a staircasing quote.
 * @param {object} input
 * @param {Array}  [input.legalFeeOverrides] supplied by the firm and
 *   referrer rails so this engine never reads central legal pricing on
 *   their behalf — the same isolation rule the other families follow.
 */
export function buildStaircasingQuote(input = {}) {
  const transactionType = String(input.type || "").trim();
  if (!isSharedOwnershipType(transactionType)) {
    throw new Error(
      `buildStaircasingQuote: '${transactionType}' is not a shared ownership matter type.`
    );
  }

  const quotedAsOf =
    input.quotedAsOf ? String(input.quotedAsOf) : new Date().toISOString().slice(0, 10);

  // ── 1. Qualify, then assess the tax position ──────────────────────
  const qualification = assessStaircasingQualification(input);
  const sdlt = assessStaircasingSdlt(input);
  const current = toOptionalNumber(input.currentSharePercent);
  const additional = toOptionalNumber(input.additionalSharePercent);
  const resultingShare = current != null && additional != null ? current + additional : null;

  if (qualification.outcome === "does_not_qualify") {
    return {
      matterFamily: MATTER_FAMILY.SHARED_OWNERSHIP,
      transactionType,
      transactionLabel: getSharedOwnershipLabel(transactionType),
      statutoryBasis: getSharedOwnershipBasis(transactionType),
      priced: false,
      qualification,
      sdlt,
      legalFees: [],
      disbursements: [],
      legalFeesExVat: 0,
      vat: 0,
      legalTotalInclVat: 0,
      disbursementTotal: 0,
      grandTotal: 0,
      thirdPartyCosts: [],
      exclusions: [],
      regimeId: null,
      quotedAsOf,
      warnings: [],
      mayAutoIssue: false,
      feeBreakdown:
        "WE CANNOT QUOTE ON THIS INFORMATION\n\n" +
        qualification.reasons
          .filter((r) => r.severity !== "note")
          .map((r) => `• ${r.message}`)
          .join("\n"),
      disclaimerLines: [
        "Please check the figures and try again, or contact us and we will help.",
      ],
    };
  }

  // ── 2. Legal fees ─────────────────────────────────────────────────
  const legalFees = [];
  const warnings = [];
  const overrides = Array.isArray(input.legalFeeOverrides) ? input.legalFeeOverrides : null;

  // Supplements the matter attracts, computed for both pricing modes.
  const requested = new Set(
    Object.keys(input.supplements || {}).filter((k) => isYes(input.supplements[k]))
  );
  if (isYes(input.hasMortgage)) requested.add("mortgageOnStaircasing");
  if (resultingShare === 100) requested.add("finalStaircasing");

  const appliedSupplements = [];

  if (overrides) {
    for (const row of overrides) {
      legalFees.push({
        label: String(row.label || ""),
        amount: round2(row.amount),
        vatApplicable: row.vatApplicable !== false,
        supplementKey: row.supplementKey || null,
      });
    }
    if (legalFees.length === 0) {
      warnings.push(
        "No fee configuration found for staircasing. Please set up fees in Fee Settings " +
          "before issuing a quote."
      );
    }
    // PRICING ISOLATION: the rail's own rows are the whole price. The
    // central price book is not consulted, or the client is charged
    // twice for one supplement.
    for (const row of legalFees) {
      if (row.supplementKey) {
        appliedSupplements.push({ key: row.supplementKey, label: row.label, amount: row.amount });
      }
    }
    for (const key of requested) {
      if (appliedSupplements.some((s) => s.key === key)) continue;
      const supplement = getSupplement(key);
      if (!supplement) continue;
      warnings.push(
        `${supplement.triggeredBy} but no "${supplement.label}" is configured. The quote ` +
          "may be under-priced. Add it in Fee Settings."
      );
    }
  } else {
    const baseFee = getBaseFee(transactionType);
    legalFees.push({
      label: "Legal fee — staircasing",
      amount: round2(baseFee),
      vatApplicable: true,
    });
    for (const key of requested) {
      const supplement = getSupplement(key);
      if (!supplement) {
        warnings.push(`Unknown supplement '${key}' was requested and has been ignored.`);
        continue;
      }
      legalFees.push({
        label: supplement.label,
        amount: round2(supplement.amount),
        vatApplicable: true,
        supplementKey: supplement.key,
      });
      appliedSupplements.push({ key: supplement.key, label: supplement.label, amount: supplement.amount });
    }
  }

  // ── 3. Disbursements ──────────────────────────────────────────────
  const disbursements = [];
  const partyCount = Math.max(1, Math.floor(toOptionalNumber(input.partyCount) || 1));
  const sharePrice = toOptionalNumber(input.sharePrice);

  disbursements.push({
    label: "Office copy entries",
    amount: round2(getOfficeCopyEntriesAmount("leasehold")),
    note: "Your leasehold title, the freehold title and the filed lease.",
  });
  disbursements.push({
    label: partyCount > 1 ? `ID checks (${partyCount})` : "ID checks",
    amount: round2(ID_CHECKS_PER_BUYER * partyCount),
  });

  // Registering the staircasing is a transaction for value and is
  // lodged electronically, so the REDUCED Scale 1 rate applies — unlike
  // the grant of a new lease on an enfranchisement extension, which gets
  // no portal discount. Assessed on the price of the share, so it cannot
  // be computed until that price is known.
  if (sharePrice != null && sharePrice > 0) {
    disbursements.push({
      label: "Land Registry fee",
      amount: round2(getLandRegistryScale1Fee(sharePrice)),
      note:
        "Assessed on the price paid for the further share. Based on the figure supplied; " +
        "it will be recalculated if the price changes.",
    });
  } else {
    disbursements.push({
      label: "Land Registry fee",
      amount: 0,
      status: THIRD_PARTY_STATUS.TBC,
      note:
        "TO BE CONFIRMED. Assessed by HM Land Registry on the price paid for the further " +
        "share, which is not known until the valuation is done.",
    });
  }

  assertNoThirdPartyLeakage(legalFees, disbursements);

  // ── 4. Totals ─────────────────────────────────────────────────────
  const legalFeesExVat = round2(sumAmounts(legalFees));
  const vatBase = round2(sumAmounts(legalFees.filter((i) => i.vatApplicable !== false)));
  const vat = round2(vatBase * VAT_RATE);
  const legalTotalInclVat = round2(legalFeesExVat + vat);
  const disbursementTotal = round2(sumAmounts(disbursements));
  const grandTotal = round2(legalTotalInclVat + disbursementTotal);

  // ── 5. Everything payable to someone else ─────────────────────────
  const thirdPartyCosts = buildThirdPartyCosts({ sharePrice });
  const exclusions = buildExclusions(sdlt);
  const ranged = thirdPartyCosts.filter((c) => c.status === THIRD_PARTY_STATUS.ESTIMATE);
  const indicativeTotalExcludingPremium = {
    low: round2(grandTotal + ranged.reduce((s, c) => s + (c.amountLow || 0), 0)),
    high: round2(grandTotal + ranged.reduce((s, c) => s + (c.amountHigh || 0), 0)),
    excludesPremium: true,
    excludedItemLabel: "the price of the further share",
    note:
      "This range includes our fees and the estimated third-party costs shown above. It " +
      "does NOT include the price of the further share itself, which is set by the " +
      "valuation and is not something we calculate or control.",
  };

  const quote = {
    matterFamily: MATTER_FAMILY.SHARED_OWNERSHIP,
    transactionType,
    transactionLabel: getSharedOwnershipLabel(transactionType),
    statutoryBasis: getSharedOwnershipBasis(transactionType),
    priced: true,

    qualification,
    sdlt,
    currentSharePercent: current,
    additionalSharePercent: additional,
    resultingSharePercent: resultingShare,

    legalFees,
    disbursements,
    legalFeesExVat,
    vat,
    legalTotalInclVat,
    disbursementTotal,
    grandTotal,

    thirdPartyCosts,
    indicativeTotalExcludingPremium,
    premium: { status: sharePrice != null ? "supplied" : "not_included", amount: sharePrice ?? null, valuerRequired: true },
    exclusions,
    abortivePolicy: { ...ABORTIVE_POLICY, appliesToThisMatter: true, disapplicationReason: null },
    appliedSupplements,

    regimeId: null,
    quotedAsOf,
    warnings,
    mayAutoIssue: qualification.outcome === "qualifies",
  };

  quote.feeBreakdown = buildBreakdown(quote);
  quote.disclaimerLines = buildDisclaimers(quote);
  return quote;
}

function buildDisclaimers(quote) {
  const lines = [];
  if (quote.qualification.outcome === "needs_review") {
    lines.push(
      "This quote is provisional. Some of your answers need to be checked by a solicitor " +
        "before we can confirm it."
    );
  }
  if (quote.sdlt.outcome === STAIRCASING_SDLT_OUTCOME.MANUAL_REVIEW) {
    lines.push(`Stamp Duty Land Tax: ${quote.sdlt.note}`);
  } else if (quote.sdlt.outcome === STAIRCASING_SDLT_OUTCOME.NOT_PAYABLE) {
    lines.push(quote.sdlt.note);
  }
  lines.push(
    "This estimate is based on the information currently available and covers our fees only."
  );
  lines.push(
    "The price of the further share, your provider's administration fee and the valuation " +
      "are payable to others, are not within our control, and are not included in the total " +
      "payable to us."
  );
  return lines;
}

function buildBreakdown(quote) {
  const lines = [];
  lines.push(quote.transactionLabel.toUpperCase());
  if (quote.resultingSharePercent != null) {
    lines.push(
      `From ${quote.currentSharePercent}% to ${quote.resultingSharePercent}% ownership`
    );
  }
  lines.push("");

  lines.push("OUR FEES");
  quote.legalFees.forEach((i) => lines.push(`${i.label}: ${formatMoney(i.amount)}`));
  lines.push(`VAT: ${formatMoney(quote.vat)}`);
  lines.push(`Total our fees including VAT: ${formatMoney(quote.legalTotalInclVat)}`);

  lines.push("");
  lines.push("DISBURSEMENTS");
  quote.disbursements.forEach((i) =>
    lines.push(
      i.status === THIRD_PARTY_STATUS.TBC
        ? `${i.label}: TO BE CONFIRMED`
        : `${i.label}: ${formatMoney(i.amount)}`
    )
  );
  lines.push(`Total disbursements: ${formatMoney(quote.disbursementTotal)}`);

  lines.push("");
  lines.push(`TOTAL PAYABLE TO US: ${formatMoney(quote.grandTotal)}`);

  lines.push("");
  lines.push("STAMP DUTY LAND TAX");
  lines.push(quote.sdlt.note);

  lines.push("");
  lines.push("NOT INCLUDED — PAYABLE BY YOU TO OTHERS");
  lines.push("The following are NOT our fees. We do not set them, control them or receive them.");
  quote.thirdPartyCosts.forEach((c) => {
    if (c.amountLow == null) lines.push(`${c.label}: set by the valuation`);
    else if (c.amountLow === c.amountHigh) lines.push(`${c.label}: ${formatMoney(c.amountLow)}`);
    else lines.push(`${c.label}: ${formatRange(c.amountLow, c.amountHigh)} (estimate)`);
  });

  lines.push("");
  lines.push(
    `INDICATIVE TOTAL, EXCLUDING ${quote.indicativeTotalExcludingPremium.excludedItemLabel.toUpperCase()}: ` +
      formatRange(
        quote.indicativeTotalExcludingPremium.low,
        quote.indicativeTotalExcludingPremium.high
      )
  );

  lines.push("");
  lines.push("IF THE MATTER DOES NOT COMPLETE");
  lines.push(quote.abortivePolicy.summary);
  lines.push("Our fee does become payable if:");
  quote.abortivePolicy.faultConditions.forEach((c) => lines.push(`  • ${c}`));
  lines.push(quote.abortivePolicy.thirdPartyDisclosure);

  lines.push("");
  lines.push("ALSO NOT INCLUDED");
  quote.exclusions.forEach((e) => lines.push(`• ${e.label}`));

  return lines.join("\n");
}

export { SHARED_OWNERSHIP_TYPES };
