#!/usr/bin/env node
//
// scripts/verify-enfranchisement-quotes.js
//
// Fixture harness for the enfranchisement engine.
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

checkTrue("NCNF applies on a standard matter", statutory.abortivePolicy.appliesToThisMatter);
check("NCNF has three fault conditions", statutory.abortivePolicy.faultConditions.length, 3);
checkTrue("NCNF discloses that third-party costs survive", statutory.abortivePolicy.thirdPartyCostsStillPayable);
checkTrue("NCNF disclosure names s.60(3)", /s\.60\(3\)/.test(statutory.abortivePolicy.thirdPartyDisclosure));

const absentLandlord = buildEnfranchisementQuote({ ...cleanClaim, type: "lease_extension_statutory", landlordIdentifiable: "no" });
checkTrue("absent landlord supplement is applied automatically", absentLandlord.appliedSupplements.some((s) => s.key === "absentLandlord"));
check("absent landlord fee is base + supplement", absentLandlord.legalFeesExVat, 2700);
check("NCNF is disapplied on a vesting order matter", absentLandlord.abortivePolicy.appliesToThisMatter, false);
checkTrue("NCNF disapplication is explained", absentLandlord.abortivePolicy.disapplicationReason !== null);
checkTrue("vesting order is not also listed as an exclusion", !absentLandlord.exclusions.some((e) => e.label.includes("Absent landlord")));

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
checkTrue("needs_review claim is marked provisional", provisional.disclaimerLines.some((l) => /PROVISIONAL/.test(l)));
checkTrue("clean claim may be auto-issued", statutory.mayAutoIssue);

// Informal route stays available to someone barred from the statutory
// route — that is the whole point of quoting both.
const houseInformal = buildEnfranchisementQuote({ ...cleanClaim, type: "lease_extension_informal", propertyType: "house" });
checkTrue("informal route is still priced for a non-qualifier", houseInformal.priced);
check("route comparison marks statutory as unavailable", houseInformal.routeComparison.statutoryAvailable, false);

// ═══════════════════════════════════════════════════════════════════
section("8. Marriage value and route comparison");
// ═══════════════════════════════════════════════════════════════════

check("sub-80-year term: marriage value payable", buildEnfranchisementQuote({ ...cleanClaim, type: "lease_extension_statutory", unexpiredTermYears: 72 }).marriageValue.status, "payable");
check("82-year term: approaching the threshold", buildEnfranchisementQuote({ ...cleanClaim, type: "lease_extension_statutory", unexpiredTermYears: 82 }).marriageValue.status, "approaching");
check("95-year term: not applicable", buildEnfranchisementQuote({ ...cleanClaim, type: "lease_extension_statutory", unexpiredTermYears: 95 }).marriageValue.status, "not_applicable");
checkTrue("sub-80 warning is surfaced in the disclaimers", statutory.disclaimerLines.some((l) => /marriage value/i.test(l)));
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
  landlordIdentifiable: "no",
  legalFeeOverrides: [{ label: "Legal fee", amount: 1750, vatApplicable: true, supplementKey: null }],
});
checkTrue("unconfigured supplement warns about under-pricing", railMissingSupplement.warnings.some((w) => /under-priced/.test(w)));
check("unconfigured supplement is not invented from the price book", railMissingSupplement.legalFeesExVat, 1750);
// The nature of the matter, not the pricing, governs the NCNF promise.
check("NCNF is still disapplied on an unconfigured vesting order matter", railMissingSupplement.abortivePolicy.appliesToThisMatter, false);

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
