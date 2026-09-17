// functions/lib/enfranchisement/price-book.js
//
// Central-rail legal fees for enfranchisement matters.
//
// Scope of this file
// ------------------
// These are the CENTRAL price book figures — the ones used by the
// public customer rail. The firm rail reads firm_fee_configs and the
// referrer rail reads referrer_fee_configs; neither consults this file.
// That isolation is the same rule the conveyancing engines follow.
//
// All amounts are EXCLUDING VAT. VAT is applied by the engine at the
// rate in ../calculate-quote.js.
//
// Fee model: a single fixed fee to completion, plus supplements for
// genuinely abnormal work. Not staged. Tribunal work is excluded.

import { ENFRANCHISEMENT_TYPES } from "./types.js";

// ── Base fees ───────────────────────────────────────────────────────
//
// The statutory fee sits at the specialist end of the market rather
// than the commodity end (published benchmarks put straightforward
// statutory claims at roughly £800–£1,300, with specialist firms at
// £1,200–£1,500 plus VAT).
//
// On the informal fee being only £250 lower: the informal route
// genuinely involves less machinery — no s.42 notice, no statutory
// timetable, no counter-notice analysis, no s.60 undertaking, no
// tribunal exposure — but picks up work elsewhere, because the
// freeholder's solicitor drafts whatever they like and the lease review
// is bespoke rather than statutory-form.
//
// The gap is deliberately modest. If the informal route were markedly
// cheaper, the fee structure itself would push clients toward the worse
// outcome: a shorter term, a retained or escalating ground rent, no
// price protection and no tribunal backstop. Pricing should not create
// that incentive.
export const BASE_FEES = {
  [ENFRANCHISEMENT_TYPES.LEASE_EXTENSION_STATUTORY]: 1200,
  [ENFRANCHISEMENT_TYPES.LEASE_EXTENSION_INFORMAL]: 950,
};

// ── Supplements ─────────────────────────────────────────────────────
//
// `excludedFromNoCompletionNoFee` marks work that cannot sit inside the
// no-completion-no-fee arrangement. A vesting order application runs to
// a court timetable outside anyone's control and cannot be underwritten
// on a contingent basis.
export const SUPPLEMENTS = {
  absentLandlord: {
    key: "absentLandlord",
    label: "Absent landlord supplement (vesting order)",
    amount: 1500,
    excludedFromNoCompletionNoFee: true,
    triggeredBy: "The landlord cannot be identified or traced",
    note:
      "Where the landlord cannot be traced the claim proceeds by application to the " +
      "county court for a vesting order, supported by evidence of a diligent search, " +
      "with the premium determined by the First-tier Tribunal and paid into court. " +
      "This is substantially more work than a standard claim and is outside our " +
      "no-completion-no-fee arrangement.",
    statutoryRef: "s.50 Leasehold Reform, Housing and Urban Development Act 1993",
  },
  intermediateLandlord: {
    key: "intermediateLandlord",
    label: "Intermediate landlord supplement",
    amount: 300,
    perOccurrence: true,
    excludedFromNoCompletionNoFee: false,
    triggeredBy: "There is an intervening leasehold interest (a head lease)",
    note:
      "An intermediate landlord means additional parties to serve, further title to " +
      "investigate, additional parties to the new lease, and apportionment of the " +
      "premium between the landlords. Charged per additional interest.",
  },
  unregisteredTitle: {
    key: "unregisteredTitle",
    label: "Unregistered title supplement",
    amount: 350,
    excludedFromNoCompletionNoFee: false,
    triggeredBy: "The freehold or leasehold title is unregistered",
    note:
      "Unregistered title requires title to be deduced from the deeds, an epitome of " +
      "title to be prepared and examined, and first registration to be dealt with.",
  },
  missingLeaseDocuments: {
    key: "missingLeaseDocuments",
    label: "Missing or defective lease documentation supplement",
    amount: 250,
    excludedFromNoCompletionNoFee: false,
    triggeredBy: "The lease is lost, or the plan or demise is defective",
    note:
      "Covers reconstituting a lost lease or dealing with an inadequate plan. If the " +
      "defect requires a deed of variation to put right, that is separate work and we " +
      "will quote for it separately.",
  },
  // ── Note on lender consent ───────────────────────────────────────
  // Routine lender consent to the surrender and regrant is INSIDE the
  // base fee, not a supplement. Most flats are mortgaged; if routine
  // consent were chargeable then almost no client would ever pay the
  // headline fee and the advertised price would be misleading.
  //
  // This supplement applies only where the lender is obstructive or a
  // deed of substituted security is genuinely required.
  lenderConsentComplex: {
    key: "lenderConsentComplex",
    label: "Complex lender consent supplement",
    amount: 175,
    excludedFromNoCompletionNoFee: false,
    triggeredBy:
      "The lender is obstructive, or a deed of substituted security is required",
    note:
      "Routine lender consent to the surrender and regrant is included in our basic " +
      "fee. This supplement applies only where the lender requires a deed of " +
      "substituted security or materially delays the matter.",
  },
};

export const VALID_ENFRANCHISEMENT_SUPPLEMENT_KEYS = Object.keys(SUPPLEMENTS);

// ── No-completion-no-fee policy ─────────────────────────────────────
//
// We charge no fee where the matter does not complete through no fault
// of the client. The fee DOES become payable where the client withdraws
// instructions, goes unresponsive so that the notice is deemed
// withdrawn under the statutory timetable, or fails to pay the premium
// once it has been agreed or determined.
//
// The critical disclosure — enforced structurally by the engine, not
// left to small print — is that this covers OUR fee only. It cannot
// touch the client's liability to the landlord under s.60(3), nor the
// valuer's fee.
export const ABORTIVE_POLICY = {
  type: "ncnf_conditional",
  headline: "No completion, no fee",
  summary:
    "We charge no fee where the matter does not complete through no fault of your own.",
  faultConditions: [
    "You instruct us to withdraw the claim.",
    "You do not give us instructions when they are needed, so that the notice is " +
      "withdrawn or is deemed withdrawn under the statutory timetable.",
    "You do not pay the premium once it has been agreed or determined.",
  ],
  thirdPartyCostsStillPayable: true,
  thirdPartyDisclosure:
    "Our no-completion-no-fee arrangement covers OUR fee only. It does not affect any " +
    "amount you owe to anyone else. In particular, if the claim is withdrawn or deemed " +
    "withdrawn you remain liable for the landlord's costs incurred up to that point " +
    "under s.60(3) of the 1993 Act, and your valuer's fee remains payable. Neither is " +
    "within our control.",
  excludedSupplements: Object.values(SUPPLEMENTS)
    .filter((s) => s.excludedFromNoCompletionNoFee)
    .map((s) => s.key),
};

export function getBaseFee(type) {
  const fee = BASE_FEES[String(type || "").trim()];
  return typeof fee === "number" ? fee : null;
}

export function getSupplement(key) {
  return SUPPLEMENTS[String(key || "").trim()] || null;
}
