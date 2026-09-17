// functions/lib/enfranchisement/config-rail.js
//
// Adapter between the config-driven rails (firm and referrer) and the
// enfranchisement engine.
//
// Why this is shared rather than copied
// ------------------------------------
// calculate-firm-quote-core.js and calculate-referrer-quote-core.js are
// near-verbatim copies of one another — the referrer file says so in its
// own header, and SUPPLEMENT_KEYS is duplicated between them by hand.
// The enfranchisement family does not add to that. Both rails call the
// one function below; the only thing that differs is which table the
// fee rows came out of.
//
// Pricing isolation, unchanged from Phase 1 rules:
//   • Legal fees come 100% from the rail's own fee config table.
//   • Disbursements come from the shared central constants.
//   • The qualification gate and third-party costs are statutory and
//     therefore central — a firm cannot configure who qualifies for a
//     statutory right, nor what the landlord is entitled to recover.

import { buildEnfranchisementQuote } from "../calculate-enfranchisement-quote.js";
import { VALID_ENFRANCHISEMENT_SUPPLEMENT_KEYS } from "./price-book.js";
import { getEnfranchisementLabel } from "./types.js";
import { assessQualification } from "./qualification.js";

function round2(n) {
  return Number((Number(n) || 0).toFixed(2));
}

/**
 * Build an enfranchisement quote for a config-driven rail.
 *
 * @param {object}  args
 * @param {Array}   args.feeRows      rows from firm_fee_configs /
 *                                    referrer_fee_configs, already
 *                                    filtered to is_disbursement = 0
 * @param {object}  args.body         the request body
 * @param {string}  args.transactionType
 * @param {string}  args.providerName firm or referrer display name
 * @param {string}  args.providerLabelKey  "firmName" | "referrerName"
 * @returns {{ ok: boolean, status: number, payload?: object, error?: string }}
 */
export function buildConfigRailEnfranchisementQuote({
  feeRows,
  body,
  transactionType,
  providerName,
  providerLabelKey = "firmName",
}) {
  const rows = Array.isArray(feeRows) ? feeRows : [];

  // Rows with supplement_key = NULL are unconditional base fees. Rows
  // with a key are included only when that supplement was requested —
  // the same NULL-is-unconditional semantics the conveyancing rails
  // already use, so Fee Settings behaves consistently across families.
  const requested = body?.supplements || {};

  // The absent-landlord supplement is triggered by the qualification
  // gate, not by a checkbox, so the gate is consulted here as well. Any
  // other route would let a rail silently omit a supplement the matter
  // plainly attracts.
  const gate = assessQualification(body || {}, body?.quotedAsOf);

  const isRequested = (key) => {
    if (key === "absentLandlord" && gate.flags.absentLandlord) return true;
    const value = requested[key];
    return value === true || String(value ?? "").toLowerCase() === "yes";
  };

  const legalFeeOverrides = [];
  const warnings = [];

  for (const row of rows) {
    const supplementKey = row.supplement_key || null;
    if (supplementKey) {
      if (!VALID_ENFRANCHISEMENT_SUPPLEMENT_KEYS.includes(supplementKey)) {
        warnings.push(
          `Fee row "${String(row.label || "")}" has an unknown supplement_key ` +
            `'${supplementKey}' and was skipped.`
        );
        continue;
      }
      if (!isRequested(supplementKey)) continue;
    }
    legalFeeOverrides.push({
      label: String(row.label || ""),
      amount: round2(row.amount),
      vatApplicable: Number(row.includes_vat) === 1,
      supplementKey,
    });
  }

  if (legalFeeOverrides.length === 0) {
    return {
      ok: false,
      status: 400,
      error:
        `No fee configuration found for ${getEnfranchisementLabel(transactionType)}. ` +
        "Please set up fees in Fee Settings before issuing a quote.",
    };
  }

  const quote = buildEnfranchisementQuote({
    ...body,
    type: transactionType,
    legalFeeOverrides,
  });

  // Map onto the payload shape these rails already return, so the
  // existing firm-portal and referrer-portal consumers keep working,
  // then attach the enfranchisement-only blocks alongside.
  return {
    ok: true,
    status: 200,
    payload: {
      success: true,
      matterFamily: quote.matterFamily,
      transactionType,
      transactionLabel: quote.transactionLabel,
      statutoryBasis: quote.statutoryBasis,
      [providerLabelKey]: String(providerName || ""),

      // Existing contract
      legalFees: quote.legalFees,
      legalFeesNet: quote.legalFeesExVat,
      vat: quote.vat,
      legalFeesGross: quote.legalTotalInclVat,
      disbursements: quote.disbursements,
      disbursementsTotal: quote.disbursementTotal,
      sdlt: 0,
      grandTotal: quote.grandTotal,
      warnings: [...warnings, ...quote.warnings],

      // Enfranchisement-only
      priced: quote.priced,
      qualification: quote.qualification,
      marriageValue: quote.marriageValue,
      routeComparison: quote.routeComparison,
      thirdPartyCosts: quote.thirdPartyCosts,
      indicativeTotalExcludingPremium: quote.indicativeTotalExcludingPremium,
      premium: quote.premium,
      exclusions: quote.exclusions,
      abortivePolicy: quote.abortivePolicy,
      regimeId: quote.regimeId,
      quotedAsOf: quote.quotedAsOf,
      mayAutoIssue: quote.mayAutoIssue,
      appliedSupplements: quote.appliedSupplements,
      feeBreakdown: quote.feeBreakdown,
      disclaimerLines: quote.disclaimerLines,
    },
  };
}

// Default fee rows seeded into Fee Settings when a firm or referrer
// first configures an enfranchisement matter type. Mirrors the shape of
// getDefaultFeeItems() in src/App.tsx.
export function getDefaultEnfranchisementFeeItems(transactionType) {
  const base =
    transactionType === "lease_extension_informal" ? 950 : 1200;

  return [
    { label: "Legal fee", amount: base, includes_vat: true, is_disbursement: false, supplement_key: null },
    { label: "Absent landlord supplement (vesting order)", amount: 1500, includes_vat: true, is_disbursement: false, supplement_key: "absentLandlord" },
    { label: "Intermediate landlord supplement", amount: 300, includes_vat: true, is_disbursement: false, supplement_key: "intermediateLandlord" },
    { label: "Unregistered title supplement", amount: 350, includes_vat: true, is_disbursement: false, supplement_key: "unregisteredTitle" },
    { label: "Missing or defective lease documentation supplement", amount: 250, includes_vat: true, is_disbursement: false, supplement_key: "missingLeaseDocuments" },
    { label: "Complex lender consent supplement", amount: 175, includes_vat: true, is_disbursement: false, supplement_key: "lenderConsentComplex" },
  ];
}
