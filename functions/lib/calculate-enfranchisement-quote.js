// functions/lib/calculate-enfranchisement-quote.js
//
// The enfranchisement quoting engine.
//
// WRITTEN ONCE, CONSUMED BY EVERY RAIL.
// -------------------------------------
// The conveyancing price book is implemented twice — once in
// ./calculate-quote.js for the server and once in
// ../../src/buildQuoteData.ts for the client — and
// scripts/verify-engine-consistency.js exists to police the drift
// between them, with three divergences still outstanding at the time of
// writing.
//
// This engine does not repeat that. It is authored once, here, in
// JavaScript, and imported directly by the TypeScript client. The
// precedent already exists: src/buildQuoteData.ts imports
// ../functions/lib/disbursement-constants.js, tsconfig.json sets
// allowJs with Bundler resolution, and Vite compiles it without
// complaint.
//
// ═══════════════════════════════════════════════════════════════════
//  THE CENTRAL RULE OF THIS ENGINE
// ═══════════════════════════════════════════════════════════════════
//  `grandTotal` means: OUR fees, plus the disbursements WE CAN FIX.
//
//  The premium, the landlord's s.60 costs and the client's valuer's
//  fee NEVER enter it. They are third-party liabilities the firm
//  neither controls, sets nor receives, and blurring them into a
//  single headline number is how a client ends up believing a £1,440
//  quote is the cost of the claim when the real figure is four times
//  that.
//
//  This is enforced structurally by assertNoThirdPartyLeakage() below,
//  not by careful wording. Any attempt to push an item flagged
//  withinFirmControl: false into the billable arrays throws.
// ═══════════════════════════════════════════════════════════════════

import { ID_CHECKS_PER_BUYER } from "./calculate-quote.js";
import { getOfficeCopyEntriesAmount } from "./disbursement-constants.js";
import {
  ENFRANCHISEMENT_TYPES,
  getEnfranchisementLabel,
  getStatutoryBasis,
  isEnfranchisementType,
  MATTER_FAMILY,
} from "./enfranchisement/types.js";
import { getRegime, assessMarriageValue } from "./enfranchisement/regime.js";
import {
  assessQualification,
  QUALIFICATION_OUTCOME,
  mayAutoIssue,
} from "./enfranchisement/qualification.js";
import {
  getNewLeaseRegistrationFee,
  LANDLORD_SECTION_60_COSTS,
  LEASEHOLDER_VALUER_FEE,
  THIRD_PARTY_COST_STATUS,
  UNVERIFIED_STATUTORY_FEES,
} from "./enfranchisement/statutory-costs.js";
import {
  getBaseFee,
  getSupplement,
  SUPPLEMENTS,
  ABORTIVE_POLICY,
} from "./enfranchisement/price-book.js";

const VAT_RATE = 0.2;

function round2(n) {
  return Number((Number(n) || 0).toFixed(2));
}

function toOptionalNumber(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).replace(/,/g, "").trim();
  if (str === "") return null;
  const parsed = Number(str);
  return Number.isFinite(parsed) ? parsed : null;
}

function isYes(value) {
  if (value === true) return true;
  const str = String(value ?? "").trim().toLowerCase();
  return str === "yes" || str === "true";
}

function formatMoney(value) {
  return `£${Number(value || 0).toFixed(2)}`;
}

function formatRange(low, high) {
  return `${formatMoney(low)} – ${formatMoney(high)}`;
}

function sumAmounts(items) {
  return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

// Structural guarantee, not a comment. Anything the firm does not
// control must never reach a billable array; if it does, that is a
// programming error and the quote must not be produced at all.
function assertNoThirdPartyLeakage(legalFees, disbursements) {
  for (const item of [...legalFees, ...disbursements]) {
    if (item && item.withinFirmControl === false) {
      throw new Error(
        `calculate-enfranchisement-quote: third-party cost "${item.label}" leaked into ` +
          "the billable totals. Third-party costs belong in thirdPartyCosts and must " +
          "never be included in grandTotal."
      );
    }
  }
}

// ── Third-party cost block ──────────────────────────────────────────
//
// Every entry here is marked withinFirmControl: false and carries its
// own note explaining that we neither set nor receive it. The renderers
// use that flag to decide presentation; they do not have to know which
// particular costs are third-party.
function buildThirdPartyCosts(transactionType, { premium }) {
  const costs = [];
  const isStatutory =
    transactionType === ENFRANCHISEMENT_TYPES.LEASE_EXTENSION_STATUTORY;

  // The premium. Never calculated by this engine — it is a valuation
  // question, and the firm does not hold itself out as a valuer.
  costs.push({
    label: "Premium for the new lease",
    status: THIRD_PARTY_COST_STATUS.NOT_INCLUDED,
    amountLow: premium ?? null,
    amountHigh: premium ?? null,
    withinFirmControl: false,
    payableTo: "The landlord (freeholder)",
    valuerRequired: true,
    note:
      premium != null
        ? "Based on the figure supplied by your valuer. Until the premium is agreed " +
          "with the landlord or determined by the tribunal, this remains an estimate."
        : "The premium is NOT included in this quote and is not something we " +
          "calculate. It is a valuation question and must be assessed by a surveyor " +
          "experienced in leasehold enfranchisement. The Leasehold Advisory Service " +
          "publishes a free guide calculator at lease-advice.org, but it is an " +
          "indication only and cannot be used as a basis for negotiation.",
  });

  if (isStatutory) {
    costs.push({
      label: LANDLORD_SECTION_60_COSTS.label,
      status: LANDLORD_SECTION_60_COSTS.status,
      amountLow: LANDLORD_SECTION_60_COSTS.amountLow,
      amountHigh: LANDLORD_SECTION_60_COSTS.amountHigh,
      withinFirmControl: false,
      payableTo: LANDLORD_SECTION_60_COSTS.payableTo,
      statutoryRef: LANDLORD_SECTION_60_COSTS.statutoryRef,
      note: LANDLORD_SECTION_60_COSTS.note,
      survivesWithdrawalNote: LANDLORD_SECTION_60_COSTS.survivesWithdrawalNote,
    });
  } else {
    // On the informal route there is no s.60 liability, because there
    // is no statutory claim. The freeholder has no statutory right to
    // recover anything. In practice most freeholders make payment of
    // their costs a CONDITION of agreeing to extend, so the client
    // should still budget for it — but the legal basis is contractual,
    // not statutory, and the quote must not misdescribe it.
    costs.push({
      label: "Landlord's legal and valuation costs (by agreement)",
      status: THIRD_PARTY_COST_STATUS.ESTIMATE,
      amountLow: LANDLORD_SECTION_60_COSTS.amountLow,
      amountHigh: LANDLORD_SECTION_60_COSTS.amountHigh,
      withinFirmControl: false,
      payableTo: "The landlord (freeholder)",
      statutoryRef: null,
      note:
        "This is an ESTIMATE ONLY and is NOT a cost we control, set or receive. " +
        "On an informal extension there is no statutory liability for the landlord's " +
        "costs, because there is no statutory claim. In practice most freeholders " +
        "require their costs to be paid as a condition of agreeing to extend, and the " +
        "amount is a matter of negotiation rather than statute. Unlike a statutory " +
        "claim, there is no tribunal to which an unreasonable demand can be referred.",
    });
  }

  costs.push({
    label: LEASEHOLDER_VALUER_FEE.label,
    status: LEASEHOLDER_VALUER_FEE.status,
    amountLow: LEASEHOLDER_VALUER_FEE.amountLow,
    amountHigh: LEASEHOLDER_VALUER_FEE.amountHigh,
    withinFirmControl: false,
    payableTo: LEASEHOLDER_VALUER_FEE.payableTo,
    note: LEASEHOLDER_VALUER_FEE.note,
  });

  return costs;
}

// What the fixed fee does not buy. Rendered prominently, never as
// small print — the market universally carves these out and a client
// who discovers them late has a legitimate grievance.
function buildExclusions(transactionType, { absentLandlordSupplementApplied }) {
  const exclusions = [
    {
      label: UNVERIFIED_STATUTORY_FEES.tribunalApplication.label,
      note: UNVERIFIED_STATUTORY_FEES.tribunalApplication.note,
      amount: UNVERIFIED_STATUTORY_FEES.tribunalApplication.amount,
    },
    {
      label: "Deed of variation",
      note:
        "If the lease needs to be varied to correct a defect, that is separate work " +
        "and we will quote for it separately.",
      amount: null,
    },
  ];

  if (!absentLandlordSupplementApplied) {
    exclusions.push({
      label: "Absent landlord / vesting order proceedings",
      note:
        "If the landlord turns out to be untraceable, the claim proceeds by application " +
        "to the county court for a vesting order. That is charged as a supplement and " +
        "is not included in this fee.",
      amount: null,
    });
  }

  if (transactionType === ENFRANCHISEMENT_TYPES.LEASE_EXTENSION_INFORMAL) {
    exclusions.push({
      label: "Converting to a statutory claim",
      note:
        "If negotiations with the freeholder break down and you decide to proceed under " +
        "the 1993 Act instead, that is a different matter and we will re-quote for it.",
      amount: null,
    });
  }

  return exclusions;
}

// Side-by-side comparison of the two routes, shown whenever the client
// qualifies for the statutory route. The user approved quoting both so
// that a qualifying leaseholder is never steered into an informal deal
// without being told what they are giving up.
function buildRouteComparison(qualification, regime) {
  if (qualification.outcome === QUALIFICATION_OUTCOME.DOES_NOT_QUALIFY) {
    return {
      statutoryAvailable: false,
      note:
        "You do not appear to qualify for a statutory lease extension, so the informal " +
        "route negotiated with your freeholder may be the only option open to you.",
      rows: [],
    };
  }

  return {
    statutoryAvailable: true,
    note:
      "You appear to qualify for a statutory lease extension. We can act for you on " +
      "either route, but the statutory route gives you materially stronger protection.",
    rows: [
      {
        feature: "Additional term",
        statutory: `${regime.extensionTermAddedYears} years on top of what is left`,
        informal: "Whatever the freeholder agrees — often shorter",
      },
      {
        feature: "Ground rent",
        statutory: "Reduced to a peppercorn (nil)",
        informal:
          "May be retained, and may be an escalating rent that can affect " +
          "mortgageability",
      },
      {
        feature: "Can the landlord refuse?",
        statutory: "No — the right is statutory",
        informal: "Yes. There is no obligation to agree at all",
      },
      {
        feature: "Price protection",
        statutory:
          "Premium determined by the Act's valuation rules; the First-tier Tribunal " +
          "decides if it cannot be agreed",
        informal: "No formula and no tribunal backstop — whatever is negotiated",
      },
      {
        feature: "Lease terms",
        statutory: "Substantially the same terms as the existing lease",
        informal: "The freeholder may seek to introduce new or onerous terms",
      },
      {
        feature: "Landlord's costs",
        statutory: "Payable by you under s.60 of the 1993 Act",
        informal: "No statutory liability, but usually required by agreement",
      },
    ],
  };
}

/**
 * Build an enfranchisement quote.
 *
 * @param {object} input
 * @param {string} input.type  one of ENFRANCHISEMENT_TYPES
 * @param {object} [input.legalFeeOverrides]  when set, replaces the
 *   central price book entirely. The firm and referrer rails pass their
 *   own configured fees here so this engine never reads central legal
 *   pricing on their behalf — the same isolation rule the conveyancing
 *   firm engine follows.
 * @returns {object} quote
 */
export function buildEnfranchisementQuote(input = {}) {
  const transactionType = String(input.type || "").trim();

  if (!isEnfranchisementType(transactionType)) {
    throw new Error(
      `buildEnfranchisementQuote: '${transactionType}' is not an enfranchisement ` +
        "matter type."
    );
  }

  const quotedAsOf = input.quotedAsOf ? String(input.quotedAsOf) : new Date().toISOString().slice(0, 10);
  const regime = getRegime(quotedAsOf);

  // ── 1. Qualify before pricing ─────────────────────────────────────
  const qualification = assessQualification(input, quotedAsOf);
  const unexpiredTermYears = toOptionalNumber(input.unexpiredTermYears);
  const marriageValue = assessMarriageValue(unexpiredTermYears, regime);
  const routeComparison = buildRouteComparison(qualification, regime);

  // A hard statutory bar on the STATUTORY route returns no price at
  // all. The informal route remains open to anyone, so it is still
  // priced — but the client is told plainly why the statutory route is
  // closed to them.
  if (
    qualification.outcome === QUALIFICATION_OUTCOME.DOES_NOT_QUALIFY &&
    transactionType === ENFRANCHISEMENT_TYPES.LEASE_EXTENSION_STATUTORY
  ) {
    return {
      matterFamily: MATTER_FAMILY.ENFRANCHISEMENT,
      transactionType,
      transactionLabel: getEnfranchisementLabel(transactionType),
      statutoryBasis: getStatutoryBasis(transactionType),
      priced: false,
      qualification,
      marriageValue,
      routeComparison,
      regimeId: regime.regimeId,
      quotedAsOf,
      legalFees: [],
      disbursements: [],
      legalFeesExVat: 0,
      vat: 0,
      legalTotalInclVat: 0,
      disbursementTotal: 0,
      grandTotal: 0,
      thirdPartyCosts: [],
      exclusions: [],
      feeBreakdown: buildUnqualifiedBreakdown(qualification),
      disclaimerLines: [
        "We cannot quote for a statutory lease extension on this information.",
        "If you think any of the answers given were wrong, please contact us.",
      ],
      warnings: [],
      mayAutoIssue: false,
    };
  }

  // ── 2. Legal fees ─────────────────────────────────────────────────
  const legalFees = [];
  const warnings = [];
  const supplementsRequested = input.supplements || {};

  // The firm and referrer rails supply their own fee rows. The central
  // rail uses the price book.
  const overrides = Array.isArray(input.legalFeeOverrides)
    ? input.legalFeeOverrides
    : null;

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
        `No fee configuration found for ${getEnfranchisementLabel(transactionType)}. ` +
          "Please set up fees in Fee Settings before issuing a quote."
      );
    }
  } else {
    const baseFee = getBaseFee(transactionType);
    if (baseFee == null) {
      throw new Error(
        `buildEnfranchisementQuote: no base fee configured for '${transactionType}'.`
      );
    }
    legalFees.push({
      label: `Legal fee — ${getEnfranchisementLabel(transactionType).toLowerCase()}`,
      amount: round2(baseFee),
      vatApplicable: true,
    });
  }

  // Which supplements this matter attracts. Computed for BOTH pricing
  // modes because it drives more than money: an absent-landlord matter
  // falls outside the no-completion-no-fee arrangement whether the fee
  // came from the central price book or from a firm's own config.
  //
  // The absent-landlord supplement is added automatically when the
  // qualification gate flagged an untraceable landlord, so the quote
  // cannot silently omit it.
  const appliedSupplements = [];
  const requestedKeys = new Set(
    Object.keys(supplementsRequested).filter((k) => isYes(supplementsRequested[k]))
  );
  if (qualification.flags.absentLandlord) {
    requestedKeys.add("absentLandlord");
  }

  if (overrides) {
    // ── PRICING ISOLATION ──────────────────────────────────────────
    // A config-driven rail supplies its OWN supplement rows inside
    // `legalFeeOverrides`. The central price book must not be consulted
    // at all — topping the rail's fees up with central amounts would
    // charge the client twice and breach the rule that these rails
    // never read central legal pricing.
    for (const row of legalFees) {
      if (!row.supplementKey) continue;
      appliedSupplements.push({
        key: row.supplementKey,
        label: row.label,
        amount: row.amount,
        count: 1,
      });
    }
    // Warn where the matter attracts a supplement the rail has not
    // configured — the same under-pricing warning the conveyancing firm
    // engine already emits.
    for (const key of requestedKeys) {
      if (appliedSupplements.some((s) => s.key === key)) continue;
      const supplement = getSupplement(key);
      if (!supplement) continue;
      warnings.push(
        `${supplement.triggeredBy} applies but no "${supplement.label}" is configured. ` +
          "The quote may be under-priced. Add it in Fee Settings."
      );
    }
  } else {
    for (const key of requestedKeys) {
      const supplement = getSupplement(key);
      if (!supplement) {
        warnings.push(`Unknown supplement '${key}' was requested and has been ignored.`);
        continue;
      }
      // Per-occurrence supplements (currently only intermediate
      // landlords) multiply by the count supplied, defaulting to one.
      const count = supplement.perOccurrence
        ? Math.max(1, Math.floor(toOptionalNumber(input.intermediateLandlordCount) || 1))
        : 1;
      const amount = round2(supplement.amount * count);
      legalFees.push({
        label: count > 1 ? `${supplement.label} (${count})` : supplement.label,
        amount,
        vatApplicable: true,
        supplementKey: supplement.key,
      });
      appliedSupplements.push({ ...supplement, count, amount });
    }
  }

  // ── 3. Disbursements ──────────────────────────────────────────────
  //
  // Reuses the existing shared constants rather than introducing
  // enfranchisement-specific values. getOfficeCopyEntriesAmount
  // ("leasehold") already returns a conservative figure that covers the
  // leasehold title, the freehold title, the filed lease and any
  // intermediate interest at portal rates.
  const disbursements = [];
  const partyCount = Math.max(1, Math.floor(toOptionalNumber(input.partyCount) || 1));

  disbursements.push({
    label: "Office copy entries",
    amount: round2(getOfficeCopyEntriesAmount("leasehold")),
    note: "Leasehold title, freehold title, filed lease and any intervening interest.",
  });

  disbursements.push({
    label: partyCount > 1 ? `ID checks (${partyCount})` : "ID checks",
    amount: round2(ID_CHECKS_PER_BUYER * partyCount),
  });

  // ── Land Registry fee on the new lease ────────────────────────────
  //
  // This is the line that cannot be computed at quote time on the
  // default path. The fee is assessed on the premium plus the annual
  // rent, and we deliberately do not calculate the premium — so unless
  // a valuer's figure has been supplied, the honest answer is "to be
  // confirmed", not a guess.
  //
  // Note it uses the FULL Scale 1 rate, not the reduced electronic
  // rate: lease registrations do not attract the portal discount. See
  // ./enfranchisement/statutory-costs.js for why the existing
  // getLandRegistryScale1Fee() must not be used here.
  const premium = toOptionalNumber(input.premium);
  const annualRent = toOptionalNumber(input.newLeaseAnnualRent) || 0;

  if (premium != null && premium > 0) {
    disbursements.push({
      label: "Land Registry fee — registration of the new lease",
      amount: round2(getNewLeaseRegistrationFee(premium, annualRent)),
      note:
        "Assessed on the premium plus the annual rent. Based on the premium figure " +
        "supplied; it will be recalculated if the premium changes.",
    });
  } else {
    disbursements.push({
      label: "Land Registry fee — registration of the new lease",
      amount: 0,
      status: THIRD_PARTY_COST_STATUS.TBC,
      note:
        "TO BE CONFIRMED. This fee is assessed by HM Land Registry on the premium plus " +
        "the annual rent reserved by the new lease. It cannot be calculated until the " +
        "premium is agreed. No separate fee is payable to register the surrender of " +
        "your existing lease.",
    });
  }

  assertNoThirdPartyLeakage(legalFees, disbursements);

  // ── 4. Totals ─────────────────────────────────────────────────────
  const legalFeesExVat = round2(sumAmounts(legalFees));
  const vatBase = round2(
    sumAmounts(legalFees.filter((item) => item.vatApplicable !== false))
  );
  const vat = round2(vatBase * VAT_RATE);
  const legalTotalInclVat = round2(legalFeesExVat + vat);
  const disbursementTotal = round2(sumAmounts(disbursements));
  const grandTotal = round2(legalTotalInclVat + disbursementTotal);

  // ── 5. Third-party costs, exclusions, abortive policy ─────────────
  const thirdPartyCosts = buildThirdPartyCosts(transactionType, { premium });
  // Keyed off requestedKeys rather than appliedSupplements: a vesting
  // order matter is outside the no-completion-no-fee arrangement because
  // of what it IS, not because of whether a given rail has configured a
  // fee row for it.
  const absentLandlordApplied = requestedKeys.has("absentLandlord");
  const exclusions = buildExclusions(transactionType, {
    absentLandlordSupplementApplied: absentLandlordApplied,
  });

  const abortivePolicy = {
    ...ABORTIVE_POLICY,
    // A vesting order matter cannot sit inside a contingent fee, so the
    // headline promise is qualified the moment that supplement applies.
    appliesToThisMatter: !absentLandlordApplied,
    disapplicationReason: absentLandlordApplied
      ? "This matter includes an absent landlord (vesting order) supplement, which is " +
        "outside our no-completion-no-fee arrangement because it runs to a court " +
        "timetable outside our control."
      : null,
  };

  // Indicative total of the whole claim EXCLUDING the premium. Kept
  // strictly separate from grandTotal.
  const rangedThirdParty = thirdPartyCosts.filter(
    (c) => c.status === THIRD_PARTY_COST_STATUS.ESTIMATE
  );
  const indicativeTotalExcludingPremium = {
    low: round2(grandTotal + sumLow(rangedThirdParty)),
    high: round2(grandTotal + sumHigh(rangedThirdParty)),
    excludesPremium: true,
    note:
      "This range includes our fees and the estimated third-party costs shown above. " +
      "It does NOT include the premium for the new lease, which is a valuation matter " +
      "and is not something we calculate or control.",
  };

  const quote = {
    matterFamily: MATTER_FAMILY.ENFRANCHISEMENT,
    transactionType,
    transactionLabel: getEnfranchisementLabel(transactionType),
    statutoryBasis: getStatutoryBasis(transactionType),
    priced: true,

    qualification,
    marriageValue,
    routeComparison,

    legalFees,
    disbursements,
    legalFeesExVat,
    vat,
    legalTotalInclVat,
    disbursementTotal,
    grandTotal,

    thirdPartyCosts,
    indicativeTotalExcludingPremium,
    premium: {
      status: premium != null ? "supplied" : "not_included",
      amount: premium ?? null,
      valuerRequired: true,
    },
    exclusions,
    abortivePolicy,

    regimeId: regime.regimeId,
    quotedAsOf,
    warnings,
    mayAutoIssue: mayAutoIssue(qualification),
    appliedSupplements: appliedSupplements.map((s) => ({
      key: s.key,
      label: s.label,
      amount: s.amount,
    })),
  };

  quote.feeBreakdown = buildEnfranchisementBreakdown(quote);
  quote.disclaimerLines = buildDisclaimerLines(quote);

  return quote;
}

function sumLow(items) {
  return items.reduce((sum, i) => sum + (Number(i.amountLow) || 0), 0);
}

function sumHigh(items) {
  return items.reduce((sum, i) => sum + (Number(i.amountHigh) || 0), 0);
}

function buildUnqualifiedBreakdown(qualification) {
  const lines = ["WE CANNOT QUOTE FOR THIS CLAIM", ""];
  for (const reason of qualification.reasons) {
    if (reason.severity === "note") continue;
    lines.push(`• ${reason.message}`);
    if (reason.statutoryRef) lines.push(`  (${reason.statutoryRef})`);
  }
  lines.push("");
  lines.push(
    "An informal extension negotiated with your freeholder may still be possible. " +
      "Please contact us to discuss it."
  );
  return lines.join("\n");
}

function buildDisclaimerLines(quote) {
  const lines = [];

  // Stated plainly, using the assessment's own heading. Shouting in
  // capitals reads as alarmist on a professional document; the point is
  // made by saying it clearly and first.
  if (
    quote.marriageValue.status === "payable" ||
    quote.marriageValue.status === "approaching"
  ) {
    lines.push(`${quote.marriageValue.heading}. ${quote.marriageValue.reason}`);
    if (quote.marriageValue.reformNote) {
      lines.push(quote.marriageValue.reformNote);
    }
  }

  if (quote.qualification.outcome === QUALIFICATION_OUTCOME.NEEDS_REVIEW) {
    lines.push(
      "This quote is provisional. Some of your answers need to be checked by a " +
        "solicitor before we can confirm it."
    );
  }

  lines.push(
    "This estimate is based on the information currently available and covers our " +
      "fees only."
  );
  lines.push(
    "The premium, the landlord's costs and your valuer's fee are payable to others, " +
      "are not within our control, and are not included in the total payable to us."
  );

  return lines;
}

// Plain-text breakdown, matching the shape the existing email and PDF
// renderers already consume for conveyancing quotes.
function buildEnfranchisementBreakdown(quote) {
  const lines = [];

  lines.push(quote.transactionLabel.toUpperCase());
  if (quote.statutoryBasis) lines.push(quote.statutoryBasis);
  lines.push("");

  lines.push("OUR FEES");
  quote.legalFees.forEach((item) => {
    lines.push(`${item.label}: ${formatMoney(item.amount)}`);
  });
  lines.push(`VAT: ${formatMoney(quote.vat)}`);
  lines.push(`Total our fees including VAT: ${formatMoney(quote.legalTotalInclVat)}`);

  lines.push("");
  lines.push("DISBURSEMENTS");
  quote.disbursements.forEach((item) => {
    if (item.status === THIRD_PARTY_COST_STATUS.TBC) {
      lines.push(`${item.label}: TO BE CONFIRMED`);
    } else {
      lines.push(`${item.label}: ${formatMoney(item.amount)}`);
    }
  });
  lines.push(`Total disbursements: ${formatMoney(quote.disbursementTotal)}`);

  lines.push("");
  lines.push(`TOTAL PAYABLE TO US: ${formatMoney(quote.grandTotal)}`);

  lines.push("");
  lines.push("NOT INCLUDED — PAYABLE BY YOU TO OTHERS");
  lines.push(
    "The following are NOT our fees. We do not set them, control them or receive them."
  );
  quote.thirdPartyCosts.forEach((cost) => {
    if (cost.status === THIRD_PARTY_COST_STATUS.NOT_INCLUDED && cost.amountLow == null) {
      lines.push(`${cost.label}: a valuation is required`);
    } else if (cost.amountLow === cost.amountHigh) {
      lines.push(`${cost.label}: ${formatMoney(cost.amountLow)} (estimate)`);
    } else {
      lines.push(`${cost.label}: ${formatRange(cost.amountLow, cost.amountHigh)} (estimate)`);
    }
  });

  lines.push("");
  lines.push(
    `INDICATIVE TOTAL, EXCLUDING THE PREMIUM: ` +
      `${formatRange(
        quote.indicativeTotalExcludingPremium.low,
        quote.indicativeTotalExcludingPremium.high
      )}`
  );

  lines.push("");
  lines.push("IF THE MATTER DOES NOT COMPLETE");
  if (quote.abortivePolicy.appliesToThisMatter) {
    lines.push(quote.abortivePolicy.summary);
    lines.push("Our fee does become payable if:");
    quote.abortivePolicy.faultConditions.forEach((c) => lines.push(`  • ${c}`));
  } else {
    lines.push(quote.abortivePolicy.disapplicationReason);
  }
  lines.push(quote.abortivePolicy.thirdPartyDisclosure);

  lines.push("");
  lines.push("ALSO NOT INCLUDED");
  quote.exclusions.forEach((e) => lines.push(`• ${e.label}`));

  return lines.join("\n");
}

export { ENFRANCHISEMENT_TYPES, SUPPLEMENTS };
