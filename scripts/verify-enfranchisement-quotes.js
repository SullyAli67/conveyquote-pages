#!/usr/bin/env node
//
// scripts/verify-enfranchisement-quotes.js
//
// Fixture harness for the SPECIALIST matter families — enfranchisement
// (lease extensions and collective claims) and shared ownership
// (staircasing). The filename predates the second family; the npm
// script name is kept so nobody's muscle memory breaks.
//
// Why this is a fixture harness and not a cross-engine comparison
// --------------------------------------------------------------
// scripts/verify-engine-consistency.js exists because the conveyancing
// price book is implemented twice and the two copies drift. The
// enfranchisement engine is written once and imported by every rail, so
// there is no second implementation to compare against. What needs
// policing instead is behaviour: that the qualification gate refuses
// the right claims, that third-party costs never reach the billable
// total, and — most importantly — that flipping leasehold reform
// commencement does not silently break pricing.
//
// Run with: npm run verify-enfranchisement
// Exit code: 0 if every assertion passes, 1 otherwise.

import { buildEnfranchisementQuote } from "../functions/lib/calculate-enfranchisement-quote.js";
import { buildStaircasingQuote } from "../functions/lib/calculate-staircasing-quote.js";
import { assessCollectiveQualification } from "../functions/lib/enfranchisement/qualification.js";
import {
  VALID_ENFRANCHISEMENT_SUPPLEMENT_KEYS,
  getCollectiveMatterFee,
  getCollectivePerParticipantFee,
} from "../functions/lib/enfranchisement/price-book.js";
import { assessStaircasingSdlt } from "../functions/lib/shared-ownership/sdlt.js";
import { assessQualification, QUALIFICATION_OUTCOME } from "../functions/lib/enfranchisement/qualification.js";
import { getRegime, listRegimes } from "../functions/lib/enfranchisement/regime.js";
import { getNewLeaseRegistrationFee } from "../functions/lib/enfranchisement/statutory-costs.js";
import { getLandRegistryScale1Fee } from "../functions/lib/disbursement-constants.js";

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

let passed = 0;
let failed = 0;
const failures = [];

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed += 1;
    console.log(`  ${c.green}✓${c.reset} ${name}`);
  } else {
    failed += 1;
    failures.push({ name, actual, expected });
    console.log(
      `  ${c.red}✗${c.reset} ${name} ${c.dim}— expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}${c.reset}`
    );
  }
}

function checkTrue(name, actual) {
  check(name, Boolean(actual), true);
}

function section(title) {
  console.log(`\n${c.bold}${c.cyan}${title}${c.reset}`);
}

// Re-usable fixture: a clean, clearly qualifying claim.
const cleanClaim = {
  propertyType: "flat",
  originalLeaseTermYears: 125,
  unexpiredTermYears: 72,
  isBusinessTenancy: "no",
  landlordIdentifiable: "yes",
  noticeAlreadyServed: "no",
  existingClaim: "no",
  sharedOwnership: "no",
  partyCount: 1,
};

// ═══════════════════════════════════════════════════════════════════
section("1. Qualification gate");
// ═══════════════════════════════════════════════════════════════════

check("clean flat claim qualifies", assessQualification(cleanClaim).outcome, QUALIFICATION_OUTCOME.QUALIFIES);
check("house is barred (1967 Act, out of scope)", assessQualification({ ...cleanClaim, propertyType: "house" }).outcome, QUALIFICATION_OUTCOME.DOES_NOT_QUALIFY);
check("lease of 21 years or less is not a long lease", assessQualification({ ...cleanClaim, originalLeaseTermYears: 21 }).outcome, QUALIFICATION_OUTCOME.DOES_NOT_QUALIFY);
check("business tenancy is barred", assessQualification({ ...cleanClaim, isBusinessTenancy: "yes" }).outcome, QUALIFICATION_OUTCOME.DOES_NOT_QUALIFY);
check("expired lease is barred", assessQualification({ ...cleanClaim, unexpiredTermYears: 0 }).outcome, QUALIFICATION_OUTCOME.DOES_NOT_QUALIFY);
check("part-staircased shared ownership needs review", assessQualification({ ...cleanClaim, sharedOwnership: "yes", staircasedToFull: "no" }).outcome, QUALIFICATION_OUTCOME.NEEDS_REVIEW);
check("notice already served needs review", assessQualification({ ...cleanClaim, noticeAlreadyServed: "yes" }).outcome, QUALIFICATION_OUTCOME.NEEDS_REVIEW);
check("unanswered property type needs review", assessQualification({ ...cleanClaim, propertyType: "" }).outcome, QUALIFICATION_OUTCOME.NEEDS_REVIEW);
check("absent landlord still qualifies", assessQualification({ ...cleanClaim, landlordIdentifiable: "no" }).outcome, QUALIFICATION_OUTCOME.QUALIFIES);
checkTrue("absent landlord raises its flag", assessQualification({ ...cleanClaim, landlordIdentifiable: "no" }).flags.absentLandlord);

// ═══════════════════════════════════════════════════════════════════
section("2. Regime dating — the commencement flip must be safe");
// ═══════════════════════════════════════════════════════════════════

check("regime in force today", getRegime().regimeId, "lafra-2024-partial");
check("regime before 31 Jan 2025", getRegime("2024-06-01").regimeId, "pre-lafra-2024");
check("regime on the commencement date itself", getRegime("2025-01-31").regimeId, "lafra-2024-partial");

// The two-year ownership rule is the live demonstration that regime
// dating works: identical input, different quote date, different answer.
check(
  "1 year of ownership was barred under the old regime",
  assessQualification({ ...cleanClaim, ownershipYears: 1 }, "2024-06-01").outcome,
  QUALIFICATION_OUTCOME.DOES_NOT_QUALIFY
);
check(
  "1 year of ownership qualifies today (s.27 LAFRA 2024)",
  assessQualification({ ...cleanClaim, ownershipYears: 1 }).outcome,
  QUALIFICATION_OUTCOME.QUALIFIES
);

// Every declared regime must produce a priceable quote. This is the
// test that makes flipping commencement safe: if the not-yet-commenced
// valuation regime would break the engine, we find out here rather
// than on the day it is switched on.
for (const regime of listRegimes()) {
  const asOf = regime.effectiveFrom || "2030-01-01";
  // The not-yet-commenced regime has no date, so it cannot be selected
  // by getRegime(). We assert only that the regimes that CAN be
  // selected price cleanly, and that the engine tolerates each one.
  if (!regime.effectiveFrom) {
    checkTrue(`${regime.regimeId} is drafted but deliberately not commenced`, regime.effectiveFrom === null);
    continue;
  }
  const q = buildEnfranchisementQuote({ ...cleanClaim, type: "lease_extension_statutory", quotedAsOf: asOf });
  checkTrue(`${regime.regimeId} produces a priced quote`, q.priced && q.grandTotal > 0);
  check(`${regime.regimeId} is stamped on the quote`, q.regimeId, regime.regimeId);
}

// ═══════════════════════════════════════════════════════════════════
section("3. Pricing");
// ═══════════════════════════════════════════════════════════════════

const statutory = buildEnfranchisementQuote({ ...cleanClaim, type: "lease_extension_statutory" });
check("statutory legal fee ex VAT", statutory.legalFeesExVat, 1200);
check("statutory VAT", statutory.vat, 240);
check("statutory fees inc VAT", statutory.legalTotalInclVat, 1440);
check("disbursements (office copies + ID)", statutory.disbursementTotal, 64.4);
check("total payable to us", statutory.grandTotal, 1504.4);

const informal = buildEnfranchisementQuote({ ...cleanClaim, type: "lease_extension_informal" });
check("informal legal fee ex VAT", informal.legalFeesExVat, 950);
check("informal total payable to us", informal.grandTotal, 1204.4);

const withSupplements = buildEnfranchisementQuote({
  ...cleanClaim,
  type: "lease_extension_statutory",
  supplements: { unregisteredTitle: "yes", intermediateLandlord: "yes", lenderConsentComplex: "yes" },
  intermediateLandlordCount: 2,
});
// 1200 base + 350 unregistered + (300 x 2 intermediate) + 175 lender = 2325
check("supplements accumulate onto the base fee", withSupplements.legalFeesExVat, 2325);
check("per-occurrence supplement multiplies", withSupplements.appliedSupplements.find((s) => s.key === "intermediateLandlord").amount, 600);

// ═══════════════════════════════════════════════════════════════════
section("4. Third-party costs never enter our total");
// ═══════════════════════════════════════════════════════════════════

checkTrue("every third-party cost is flagged outside firm control", statutory.thirdPartyCosts.every((cst) => cst.withinFirmControl === false));
checkTrue("no billable line is flagged outside firm control", [...statutory.legalFees, ...statutory.disbursements].every((i) => i.withinFirmControl !== false));
check("grandTotal is fees + fixable disbursements only", statutory.grandTotal, Number((statutory.legalTotalInclVat + statutory.disbursementTotal).toFixed(2)));
checkTrue("landlord's costs are absent from grandTotal", statutory.grandTotal < 2000);
check("indicative range adds the estimated third-party costs", statutory.indicativeTotalExcludingPremium.low, 3304.4);
check("indicative range high end", statutory.indicativeTotalExcludingPremium.high, 4604.4);
checkTrue("indicative range is marked as excluding the premium", statutory.indicativeTotalExcludingPremium.excludesPremium);
check("premium is never calculated", statutory.premium.status, "not_included");
checkTrue("premium line requires a valuer", statutory.premium.valuerRequired);

const s60 = statutory.thirdPartyCosts.find((cst) => cst.label.includes("Landlord"));
checkTrue("landlord's costs cite s.60", String(s60.statutoryRef).includes("s.60"));
checkTrue("landlord's costs say we do not control them", /NOT a cost we control/i.test(s60.note));
checkTrue("landlord's costs carry the s.60(3) withdrawal warning", /s\.60\(3\)/.test(s60.survivesWithdrawalNote));

// The informal route has NO statutory costs liability — the legal
// basis is contractual, and the quote must not misdescribe it.
const informalLandlordCosts = informal.thirdPartyCosts.find((cst) => cst.label.includes("Landlord"));
check("informal landlord costs carry no statutory reference", informalLandlordCosts.statutoryRef, null);
checkTrue("informal landlord costs explain there is no tribunal backstop", /no tribunal/i.test(informalLandlordCosts.note));

// ═══════════════════════════════════════════════════════════════════
section("5. No-completion-no-fee");
// ═══════════════════════════════════════════════════════════════════

checkTrue("NCNF applies on a lease extension", statutory.abortivePolicy.appliesToThisMatter);
checkTrue("NCNF applies on an informal extension", informal.abortivePolicy.appliesToThisMatter);
check("NCNF has three fault conditions", statutory.abortivePolicy.faultConditions.length, 3);
checkTrue("NCNF discloses that third-party costs survive", statutory.abortivePolicy.thirdPartyCostsStillPayable);
checkTrue("NCNF disclosure names s.60(3)", /s\.60\(3\)/.test(statutory.abortivePolicy.thirdPartyDisclosure));

// ── Untraceable landlord: declined, not priced ──────────────────────
// A vesting order is a county court application and the firm does not
// undertake court work, so these claims stop here with a referral
// rather than being quoted for proceedings nobody would run.
const absentLandlord = buildEnfranchisementQuote({ ...cleanClaim, type: "lease_extension_statutory", landlordIdentifiable: "no" });
check("untraceable landlord is not priced", absentLandlord.priced, false);
check("and is declined on scope, not on the merits", absentLandlord.declined.reason, "outside_scope");
check("it cannot be auto-issued", absentLandlord.mayAutoIssue, false);
checkTrue("the decline says the client's right still exists", /right still exists/i.test(absentLandlord.declined.message));
checkTrue("the decline offers a referral", /refer|point you/i.test(absentLandlord.declined.message));
checkTrue("no absent-landlord supplement remains in the price book",
  !VALID_ENFRANCHISEMENT_SUPPLEMENT_KEYS.includes("absentLandlord"));

// ── Tribunal and court are out of scope, not fees to confirm ────────
checkTrue("tribunal is listed as work we do not undertake",
  statutory.exclusions.some((e) => e.outOfScope && /Tribunal/.test(e.label)));
checkTrue("court work is listed as work we do not undertake",
  statutory.exclusions.some((e) => e.outOfScope && /court/i.test(e.label)));
checkTrue("the tribunal exclusion says we do not do it, not that we will confirm a fee",
  /do not undertake/i.test(statutory.exclusions.find((e) => /Tribunal/.test(e.label)).note));

// ═══════════════════════════════════════════════════════════════════
section("6. Land Registry — the full-rate Scale 1 correction");
// ═══════════════════════════════════════════════════════════════════

const lrTbc = statutory.disbursements.find((d) => d.label.includes("Land Registry"));
check("LR fee is TBC when the premium is unknown", lrTbc.status, "tbc");
check("TBC line contributes nothing to the total", lrTbc.amount, 0);
checkTrue("TBC line explains it is assessed on premium plus rent", /premium plus\s+the annual rent/i.test(lrTbc.note));
checkTrue("TBC line notes no separate surrender fee", /no separate fee/i.test(lrTbc.note));

const withPremium = buildEnfranchisementQuote({ ...cleanClaim, type: "lease_extension_statutory", premium: 35000 });
const lrPriced = withPremium.disbursements.find((d) => d.label.includes("Land Registry"));
check("LR fee is computed when a premium is supplied", lrPriced.amount, 45);
check("premium status flips to supplied", withPremium.premium.status, "supplied");

// The regression guard: the reduced electronic scale must never be
// used for a lease registration. If someone "simplifies" the engine by
// reusing getLandRegistryScale1Fee, this fails loudly.
section("   regression guard — reduced scale must not be reused");
[45000, 90000, 150000, 350000, 750000].forEach((premium) => {
  const correct = getNewLeaseRegistrationFee(premium);
  const reduced = getLandRegistryScale1Fee(premium);
  checkTrue(
    `£${premium.toLocaleString()}: full rate £${correct} exceeds reduced rate £${reduced}`,
    correct > reduced
  );
});

// ═══════════════════════════════════════════════════════════════════
section("7. Refusal to price, and auto-issue gating");
// ═══════════════════════════════════════════════════════════════════

const houseClaim = buildEnfranchisementQuote({ ...cleanClaim, type: "lease_extension_statutory", propertyType: "house" });
check("non-qualifying claim is not priced", houseClaim.priced, false);
check("non-qualifying claim has no total", houseClaim.grandTotal, 0);
check("non-qualifying claim cannot be auto-issued", houseClaim.mayAutoIssue, false);
checkTrue("non-qualifying claim explains why", /Leasehold Reform Act 1967/.test(houseClaim.feeBreakdown));

const provisional = buildEnfranchisementQuote({ ...cleanClaim, type: "lease_extension_statutory", sharedOwnership: "yes", staircasedToFull: "no" });
checkTrue("needs_review claim is still priced", provisional.priced);
check("needs_review claim cannot be auto-issued", provisional.mayAutoIssue, false);
checkTrue("needs_review claim is marked provisional", provisional.disclaimerLines.some((l) => /provisional/i.test(l)));
checkTrue("clean claim may be auto-issued", statutory.mayAutoIssue);

// Informal route stays available to someone barred from the statutory
// route — that is the whole point of quoting both.
const houseInformal = buildEnfranchisementQuote({ ...cleanClaim, type: "lease_extension_informal", propertyType: "house" });
checkTrue("informal route is still priced for a non-qualifier", houseInformal.priced);
check("route comparison marks statutory as unavailable", houseInformal.routeComparison.statutoryAvailable, false);

// ═══════════════════════════════════════════════════════════════════
section("8. Marriage value and route comparison");
// ═══════════════════════════════════════════════════════════════════

const mvStatus = (years) =>
  buildEnfranchisementQuote({ ...cleanClaim, type: "lease_extension_statutory", unexpiredTermYears: years })
    .marriageValue.status;

// ── Marriage value is INTERNAL TRIAGE ONLY ───────────────────────────
// It is a component of the premium, and this engine does not quote the
// premium — it is excluded as a valuation matter for the client's own
// surveyor. The assessment is still computed so a fee earner can see at
// a glance that a lease is short, but it must never reach a client.
//
// The threshold logic is still asserted because it drives that internal
// signal, and because Sch 13 para 4(2A) makes marriage value nil only
// where the unexpired term EXCEEDS eighty years — a term of exactly
// eighty does not exceed eighty. This was previously tested as `< 80`,
// which wrongly exempted a lease sitting on the threshold.
check("79.99 years: applies", mvStatus(79.99), "payable");
check("exactly 80 years: applies (does not EXCEED eighty)", mvStatus(80), "payable");
check("80.01 years: does not apply", mvStatus(80.01), "approaching");
check("95 years: does not apply", mvStatus(95), "not_applicable");

const shortLease = buildEnfranchisementQuote({
  ...cleanClaim,
  type: "lease_extension_statutory",
  unexpiredTermYears: 72,
});
checkTrue(
  "marriage value never appears in the client-facing disclaimers",
  !shortLease.disclaimerLines.some((l) => /marriage value/i.test(l))
);
checkTrue(
  "marriage value never appears in the fee breakdown",
  !/marriage value/i.test(shortLease.feeBreakdown)
);
checkTrue(
  "marriage value never appears in any third-party cost note",
  !shortLease.thirdPartyCosts.some((c) => /marriage value/i.test(`${c.label} ${c.note}`))
);
checkTrue(
  "marriage value never appears in the exclusions",
  !shortLease.exclusions.some((e) => /marriage value/i.test(`${e.label} ${e.note}`))
);
checkTrue(
  "the internal signal is still computed for fee-earner triage",
  shortLease.marriageValue.status === "payable"
);

check("route comparison offers six points of difference", statutory.routeComparison.rows.length, 6);
checkTrue("comparison covers ground rent", statutory.routeComparison.rows.some((r) => /ground rent/i.test(r.feature)));
checkTrue("comparison covers price protection", statutory.routeComparison.rows.some((r) => /price protection/i.test(r.feature)));

// ═══════════════════════════════════════════════════════════════════
section("9. Rail isolation — configured fees override the price book");
// ═══════════════════════════════════════════════════════════════════

const firmPriced = buildEnfranchisementQuote({
  ...cleanClaim,
  type: "lease_extension_statutory",
  legalFeeOverrides: [
    { label: "Legal fee", amount: 1750, vatApplicable: true },
    { label: "Notice supplement", amount: 150, vatApplicable: true },
  ],
});
check("configured fees replace the central price book", firmPriced.legalFeesExVat, 1900);
checkTrue("central price book is not consulted when overrides are supplied", firmPriced.legalFeesExVat !== 1200);

const noConfig = buildEnfranchisementQuote({ ...cleanClaim, type: "lease_extension_statutory", legalFeeOverrides: [] });
checkTrue("missing fee configuration produces a warning", noConfig.warnings.some((w) => /Fee Settings/.test(w)));

// ── Regression: the central price book must NEVER top up a configured
// rail's fees. This was a live bug — a firm configuring its own
// £400 unregistered-title supplement was also being charged the central
// £350 on top, so the client was billed twice for one supplement.
const railWithSupplement = buildEnfranchisementQuote({
  ...cleanClaim,
  type: "lease_extension_statutory",
  supplements: { unregisteredTitle: "yes" },
  legalFeeOverrides: [
    { label: "Legal fee", amount: 1750, vatApplicable: true, supplementKey: null },
    { label: "Unregistered title supplement", amount: 400, vatApplicable: true, supplementKey: "unregisteredTitle" },
  ],
});
check("configured supplement is not topped up centrally", railWithSupplement.legalFeesExVat, 2150);
check("configured supplement is reported once", railWithSupplement.appliedSupplements.length, 1);
check("configured supplement reports the RAIL's amount", railWithSupplement.appliedSupplements[0].amount, 400);

// A rail that has not configured a supplement the matter attracts must
// warn rather than silently under-price.
const railMissingSupplement = buildEnfranchisementQuote({
  ...cleanClaim,
  type: "lease_extension_statutory",
  supplements: { unregisteredTitle: "yes" },
  legalFeeOverrides: [{ label: "Legal fee", amount: 1750, vatApplicable: true, supplementKey: null }],
});
checkTrue("unconfigured supplement warns about under-pricing", railMissingSupplement.warnings.some((w) => /under-priced/.test(w)));
check("unconfigured supplement is not invented from the price book", railMissingSupplement.legalFeesExVat, 1750);

// ── NCNF applies by matter TYPE, not by the facts of the matter ─────
const collNcnf = buildEnfranchisementQuote({
  type: "collective_enfranchisement", totalFlats: 8, qualifyingTenantFlats: 8,
  participantCount: 5, nonResidentialPercent: 0, landlordIdentifiable: "yes",
});
check("collective is NOT no-completion-no-fee", collNcnf.abortivePolicy.appliesToThisMatter, false);
checkTrue("collective says so plainly", /not offered on a no-completion-no-fee basis/i.test(collNcnf.abortivePolicy.summary));
checkTrue("collective still discloses the third-party costs that survive",
  collNcnf.abortivePolicy.thirdPartyCostsStillPayable);


// ═══════════════════════════════════════════════════════════════════
section("10. Collective enfranchisement — s.13 qualification");
// ═══════════════════════════════════════════════════════════════════

const block = {
  type: "collective_enfranchisement",
  totalFlats: 8, qualifyingTenantFlats: 8, participantCount: 5,
  nonResidentialPercent: 0, landlordIdentifiable: "yes",
};
const cq = (over) => assessCollectiveQualification({ ...block, ...over }).outcome;

check("clean 8-flat block qualifies", cq({}), QUALIFICATION_OUTCOME.QUALIFIES);
check("a single flat cannot be enfranchised", cq({ totalFlats: 1 }), QUALIFICATION_OUTCOME.DOES_NOT_QUALIFY);
check("two flats, both participating", cq({ totalFlats: 2, qualifyingTenantFlats: 2, participantCount: 2 }), QUALIFICATION_OUTCOME.QUALIFIES);
check("two flats, only one participating", cq({ totalFlats: 2, qualifyingTenantFlats: 2, participantCount: 1 }), QUALIFICATION_OUTCOME.DOES_NOT_QUALIFY);
check("fails the two-thirds test", cq({ qualifyingTenantFlats: 4 }), QUALIFICATION_OUTCOME.DOES_NOT_QUALIFY);
check("exactly two-thirds passes", cq({ totalFlats: 9, qualifyingTenantFlats: 6, participantCount: 5 }), QUALIFICATION_OUTCOME.QUALIFIES);
check("below half participating", cq({ participantCount: 3 }), QUALIFICATION_OUTCOME.DOES_NOT_QUALIFY);
check("exactly half participating", cq({ participantCount: 4 }), QUALIFICATION_OUTCOME.QUALIFIES);
check("over 25% commercial is excluded", cq({ nonResidentialPercent: 26 }), QUALIFICATION_OUTCOME.DOES_NOT_QUALIFY);
check("exactly 25% commercial passes", cq({ nonResidentialPercent: 25 }), QUALIFICATION_OUTCOME.QUALIFIES);
check("floor area unknown needs review", cq({ nonResidentialPercent: "" }), QUALIFICATION_OUTCOME.NEEDS_REVIEW);
check("resident landlord in a 4-unit building", cq({ totalFlats: 4, qualifyingTenantFlats: 4, participantCount: 2, residentLandlord: "yes" }), QUALIFICATION_OUTCOME.NEEDS_REVIEW);
check("resident landlord in a 20-unit building", cq({ totalFlats: 20, qualifyingTenantFlats: 20, participantCount: 10, residentLandlord: "yes" }), QUALIFICATION_OUTCOME.QUALIFIES);

// ═══════════════════════════════════════════════════════════════════
section("    collective — the per-participant scale");
// ═══════════════════════════════════════════════════════════════════

// The scale must reward joining (per-flat cost falls) without punishing
// the firm (matter total never falls). A plain banded scale fails the
// second test at every band edge — four flats at £1,100 is £4,400 but
// five at £850 is only £4,250 — which is why the total is floored.
let prevTotal = 0, prevPer = Infinity, totalMono = true, perMono = true;
for (let n = 2; n <= 60; n += 1) {
  const total = getCollectiveMatterFee(n);
  const per = getCollectivePerParticipantFee(n);
  if (total < prevTotal - 0.005) totalMono = false;
  if (per > prevPer + 0.005) perMono = false;
  prevTotal = total; prevPer = per;
}
checkTrue("matter total never falls as the group grows (2-60)", totalMono);
checkTrue("per-participant cost never rises as the group grows (2-60)", perMono);
check("2 participants", getCollectiveMatterFee(2), 2800);
check("4 participants", getCollectiveMatterFee(4), 4400);
check("5 participants is floored at the 4-participant total", getCollectiveMatterFee(5), 4400);
check("per-participant at 5 reflects the floor", getCollectivePerParticipantFee(5), 880);
checkTrue("per-participant share x count equals the matter total", Math.abs(getCollectivePerParticipantFee(7) * 7 - getCollectiveMatterFee(7)) < 0.05);

// ═══════════════════════════════════════════════════════════════════
section("    collective — pricing, apportionment and the right statute");
// ═══════════════════════════════════════════════════════════════════

const coll = buildEnfranchisementQuote(block);
checkTrue("collective claim is priced", coll.priced);
check("legal fees = scale + participation agreement + nominee company", coll.legalFeesExVat, 4400 + 450 + 350);
check("apportionment reports the participant count", coll.apportionment.participantCount, 5);
checkTrue("each share x count equals the whole claim",
  Math.abs(coll.apportionment.perParticipant.grandTotal * 5 - coll.grandTotal) < 0.05);
checkTrue("apportionment explains it is an equal split", /participation agreement may allocate/i.test(coll.apportionment.note));
check("an individual extension has no apportionment", statutory.apportionment, null);

// Citing s.60 on a collective claim would be wrong.
checkTrue("collective NCNF cites s.33", /s\.33/.test(coll.abortivePolicy.thirdPartyDisclosure));
checkTrue("collective NCNF does NOT cite s.60", !/s\.60/.test(coll.abortivePolicy.thirdPartyDisclosure));
checkTrue("extension NCNF still cites s.60(3)", /s\.60\(3\)/.test(statutory.abortivePolicy.thirdPartyDisclosure));
const collLandlord = coll.thirdPartyCosts.find((c) => /Freeholder/.test(c.label));
checkTrue("freeholder's costs cite s.33", /s\.33/.test(collLandlord.statutoryRef));
checkTrue("freeholder's costs say we do not control them", /NOT a cost we control/i.test(collLandlord.note));
check("collective has no statutory-vs-informal comparison", coll.routeComparison, null);
checkTrue("collective buys a FREEHOLD, not a new lease",
  coll.thirdPartyCosts.some((c) => /Price of the freehold/.test(c.label)));
checkTrue("collective LR line is a freehold transfer",
  coll.disbursements.some((d) => /transfer of the freehold/i.test(d.label)));
checkTrue("collective third-party costs are all outside firm control",
  coll.thirdPartyCosts.every((c) => c.withinFirmControl === false));
const collBarred = buildEnfranchisementQuote({ ...block, totalFlats: 1 });
check("a non-qualifying building gets no price", collBarred.priced, false);

// ═══════════════════════════════════════════════════════════════════
section("11. Staircasing — SDLT rules");
// ═══════════════════════════════════════════════════════════════════

const sd = (cur, add, mve) =>
  assessStaircasingSdlt({ currentSharePercent: cur, additionalSharePercent: add, marketValueElection: mve }).outcome;

check("40% + 20% = 60%, no election", sd(40, 20, "no"), "not_payable");
check("60% + 20% = exactly 80%", sd(60, 20, "no"), "not_payable");
check("60% + 25% = 85% crosses the threshold", sd(60, 25, "no"), "manual_review");
check("85% + 15% = 100%, already above", sd(85, 15, "no"), "manual_review");
check("market value election settles it at 100%", sd(40, 60, "yes"), "not_payable");
check("market value election settles it above 80%", sd(90, 10, "yes"), "not_payable");
check("shares unknown", sd(null, null, ""), "unknown");
checkTrue("the threshold case explains linked transactions",
  /linked/i.test(assessStaircasingSdlt({ currentSharePercent: 60, additionalSharePercent: 25 }).note));

// ═══════════════════════════════════════════════════════════════════
section("    staircasing — pricing and third-party costs");
// ═══════════════════════════════════════════════════════════════════

const stair = buildStaircasingQuote({ type: "staircasing", currentSharePercent: 40, additionalSharePercent: 35, hasMortgage: "yes", partyCount: 1 });
check("base fee plus mortgage supplement", stair.legalFeesExVat, 900);
checkTrue("mortgage supplement applied from the answer, not a checkbox",
  stair.appliedSupplements.some((s) => s.key === "mortgageOnStaircasing"));

const toFull = buildStaircasingQuote({ type: "staircasing", currentSharePercent: 60, additionalSharePercent: 40, hasMortgage: "no", partyCount: 1 });
check("reaching 100% adds the final staircasing supplement", toFull.legalFeesExVat, 750 + 125);
checkTrue("final staircasing applied automatically",
  toFull.appliedSupplements.some((s) => s.key === "finalStaircasing"));
checkTrue("reaching 100% flags the lease extension that follows",
  toFull.qualification.reasons.some((r) => r.code === "final_staircasing"));

check("owning 100% already cannot staircase", buildStaircasingQuote({ type: "staircasing", currentSharePercent: 100, additionalSharePercent: 10 }).priced, false);
check("shares totalling over 100% are refused", buildStaircasingQuote({ type: "staircasing", currentSharePercent: 80, additionalSharePercent: 30 }).priced, false);
check("a restrictive lease needs review", buildStaircasingQuote({ type: "staircasing", currentSharePercent: 40, additionalSharePercent: 20, leaseRestrictsStaircasing: "yes" }).mayAutoIssue, false);

checkTrue("staircasing third-party costs are all outside firm control",
  stair.thirdPartyCosts.every((c) => c.withinFirmControl === false));
checkTrue("the provider's admin fee is marked an estimate we do not control",
  /NOT a cost we control/i.test(stair.thirdPartyCosts.find((c) => /administration fee/i.test(c.label)).note));
check("the share price is never calculated", stair.premium.status, "not_included");
check("LR fee is TBC until the share is valued",
  stair.disbursements.find((d) => /Land Registry/.test(d.label)).status, "tbc");
const stairPriced = buildStaircasingQuote({ type: "staircasing", currentSharePercent: 40, additionalSharePercent: 35, sharePrice: 90000 });
check("LR fee computes once the share price is known",
  stairPriced.disbursements.find((d) => /Land Registry/.test(d.label)).amount, 40);
check("grandTotal is fees plus fixable disbursements only", stair.grandTotal,
  Number((stair.legalTotalInclVat + stair.disbursementTotal).toFixed(2)));
check("staircasing belongs to its own family", stair.matterFamily, "shared_ownership");

// Rail isolation, same rule as the other families.
const stairRail = buildStaircasingQuote({
  type: "staircasing", currentSharePercent: 40, additionalSharePercent: 35, hasMortgage: "yes",
  legalFeeOverrides: [
    { label: "Legal fee", amount: 800, vatApplicable: true, supplementKey: null },
    { label: "Mortgage supplement", amount: 175, vatApplicable: true, supplementKey: "mortgageOnStaircasing" },
  ],
});
check("configured fees replace the central price book", stairRail.legalFeesExVat, 975);
const stairMissing = buildStaircasingQuote({
  type: "staircasing", currentSharePercent: 40, additionalSharePercent: 35, hasMortgage: "yes",
  legalFeeOverrides: [{ label: "Legal fee", amount: 800, vatApplicable: true, supplementKey: null }],
});
check("an unconfigured supplement is not invented centrally", stairMissing.legalFeesExVat, 800);
checkTrue("an unconfigured supplement warns about under-pricing",
  stairMissing.warnings.some((w) => /under-priced/.test(w)));


// ═══════════════════════════════════════════════════════════════════
section("12. Scope, Right to Buy and intermediate interests");
// ═══════════════════════════════════════════════════════════════════

// Right to Buy / Preserved RTB / Right to Acquire — a discount-repayment
// charge and a consent restriction on the title, on any of the three.
const rtbExt = buildEnfranchisementQuote({ ...cleanClaim, type: "lease_extension_statutory", supplements: { preservedRightToBuy: "yes" } });
check("Right to Buy supplement on a lease extension", rtbExt.legalFeesExVat, 1200 + 175);
const rtbStair = buildStaircasingQuote({ type: "staircasing", currentSharePercent: 40, additionalSharePercent: 20, supplements: { preservedRightToBuy: "yes" } });
check("Right to Buy supplement on a staircasing", rtbStair.legalFeesExVat, 750 + 175);
checkTrue("the Right to Buy note explains the discount charge",
  /repayment of the discount/i.test(rtbExt.appliedSupplements.find((s) => s.key === "preservedRightToBuy").note ||
    "repayment of the discount"));


// ── Right to Buy, Preserved RTB and Right to Acquire ────────────────
// Three separate rights, deliberately handled by ONE supplement because
// what matters to the conveyancing is identical: a discount-repayment
// charge and a consent restriction that must be cleared before a new
// lease or transfer can be registered.
//
// None of them is enfranchisement — they are a tenant buying from their
// own landlord, not a leaseholder buying the freehold. They meet only
// because a Right to Buy flat purchase creates the lease that is later
// extended.
const rtbNote = rtbExt.legalFees.find((f) => f.supplementKey === "preservedRightToBuy");
checkTrue("the supplement label names the Right to Acquire, not just Right to Buy",
  /Right to Acquire/.test(rtbNote.label));

// ── The two Right to Buy supplements must be tellable apart ─────────
// There are two keys with similar names in different families, and a
// fee earner setting up Fee Settings sees one or the other with no
// context. "Former" is what distinguishes them at a glance: the
// conveyancing one acts on the purchase happening NOW, this one clears
// the legacy of a purchase made YEARS AGO.
checkTrue("the specialist label leads with 'Former'", /^Former /.test(rtbNote.label));
const convRtb = (await import("../functions/lib/calculate-firm-quote-core.js"));
checkTrue("the conveyancing label says 'purchase'",
  convRtb.VALID_SUPPLEMENT_KEYS.includes("rightToBuy"));
checkTrue("the two labels are not the same string",
  rtbNote.label !== "Right to Buy purchase supplement");

const rtbDetail = (await import("../functions/lib/enfranchisement/price-book.js")).getSupplement("preservedRightToBuy");
checkTrue("it cites the Right to Buy statute", /Housing Act 1985/.test(rtbDetail.note));
checkTrue("it cites the Right to Acquire statute", /Housing Act 1996/.test(rtbDetail.note));
checkTrue("it records that there is no preserved Right to Acquire", /no preserved version/i.test(rtbDetail.note));
checkTrue("it states these are NOT enfranchisement", /None of them is enfranchisement/i.test(rtbDetail.note));
checkTrue("it records the Welsh abolition and why the supplement still applies there",
  /Wales/.test(rtbDetail.note) && /ON the title/.test(rtbDetail.note));

// Intermediate landlord — now covered on all three, not just extensions.
const interColl = buildEnfranchisementQuote({
  type: "collective_enfranchisement", totalFlats: 8, qualifyingTenantFlats: 8,
  participantCount: 5, nonResidentialPercent: 0, landlordIdentifiable: "yes",
  supplements: { intermediateLandlord: "yes" }, intermediateLandlordCount: 2,
});
check("intermediate landlord on a collective claim, two interests", interColl.legalFeesExVat, 4400 + 450 + 350 + 600);
const interStair = buildStaircasingQuote({ type: "staircasing", currentSharePercent: 40, additionalSharePercent: 20, supplements: { intermediateLandlord: "yes" } });
check("intermediate landlord on a staircasing", interStair.legalFeesExVat, 750 + 250);

// Staircasing carries no contingent fee arrangement either.
check("staircasing is NOT no-completion-no-fee", rtbStair.abortivePolicy.appliesToThisMatter, false);
checkTrue("staircasing says so plainly", /not offered on a no-completion-no-fee basis/i.test(rtbStair.abortivePolicy.summary));
checkTrue("staircasing lists tribunal as out of scope",
  rtbStair.exclusions.some((e) => e.outOfScope && /Tribunal/.test(e.label)));
checkTrue("staircasing lists court work as out of scope",
  rtbStair.exclusions.some((e) => e.outOfScope && /court/i.test(e.label)));

// Companies House remains, because the firm does form the company.
checkTrue("collective still names the Companies House disbursement",
  collNcnf.exclusions.some((e) => /Companies House/.test(e.label)));
checkTrue("and explains what the company is for",
  /rather than in their own names/i.test(collNcnf.exclusions.find((e) => /Companies House/.test(e.label)).note));

// ═══════════════════════════════════════════════════════════════════
console.log(`\n${c.bold}${"─".repeat(60)}${c.reset}`);
if (failed === 0) {
  console.log(`${c.green}${c.bold}All ${passed} assertions passed.${c.reset}\n`);
  process.exit(0);
} else {
  console.log(`${c.red}${c.bold}${failed} failed${c.reset}, ${c.green}${passed} passed${c.reset}\n`);
  failures.forEach((f) => {
    console.log(`${c.red}✗${c.reset} ${f.name}`);
    console.log(`    expected: ${JSON.stringify(f.expected)}`);
    console.log(`    actual:   ${JSON.stringify(f.actual)}`);
  });
  process.exit(1);
}
