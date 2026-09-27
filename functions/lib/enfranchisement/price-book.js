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

// Fee figures in this file are APPROVED. The Land Registry bands in
// ./statutory-costs.js still carry a sign-off flag, because those are
// statutory amounts set by order rather than prices we choose.

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
  // Collective enfranchisement is NOT priced from this table — it is
  // per participant on the declining scale below. Deliberately absent
  // so a caller that reaches for a flat fee fails loudly.
};

// ── Collective enfranchisement: declining per-participant scale ──────
//
// A s.13 claim is one piece of work shared between the participants, so
// the per-flat cost falls as more of them join. Published market rates
// run at roughly £1,500 + VAT per flat where only two participate,
// down to about £500 + VAT per flat at twenty or more. The bands below
// sit at or below that range throughout.
//
// Charging a flat fee per flat would penalise small buildings and
// over-charge large ones; charging one matter fee divided equally would
// make a two-flat claim look absurdly expensive. The scale is the
// honest middle.
//
// `upTo` is inclusive. The amount is PER PARTICIPANT, excluding VAT.
export const COLLECTIVE_PER_PARTICIPANT_SCALE = [
  { upTo: 2, amount: 1400 },
  { upTo: 4, amount: 1100 },
  { upTo: 8, amount: 850 },
  { upTo: 14, amount: 650 },
  { upTo: Infinity, amount: 500 },
];

function rawBandAmount(n) {
  for (const band of COLLECTIVE_PER_PARTICIPANT_SCALE) {
    if (n <= band.upTo) return band.amount;
  }
  return COLLECTIVE_PER_PARTICIPANT_SCALE[
    COLLECTIVE_PER_PARTICIPANT_SCALE.length - 1
  ].amount;
}

// ── Why the matter total is computed, not just multiplied ────────────
//
// A plain banded scale is non-monotonic at the band edges: four
// participants at £1,100 each is £4,400, but five at £850 each is only
// £4,250. The firm would earn LESS on a larger claim that is plainly
// more work — five sets of identity checks, five sets of instructions,
// a bigger participation agreement.
//
// So the matter total is floored at the previous participant count's
// total. The per-participant figure still falls as the group grows,
// which is the point of the scale, but the total never goes backwards.
export function getCollectiveMatterFee(participantCount) {
  const n = Math.max(2, Math.floor(Number(participantCount) || 0));
  let total = 0;
  for (let i = 2; i <= n; i += 1) {
    total = Math.max(total, rawBandAmount(i) * i);
  }
  return Number(total.toFixed(2));
}

// The share each participant carries, derived from the matter total so
// the two can never disagree.
export function getCollectivePerParticipantFee(participantCount) {
  const n = Math.max(2, Math.floor(Number(participantCount) || 0));
  return Number((getCollectiveMatterFee(n) / n).toFixed(2));
}

// Work done once for the whole claim regardless of how many flats take
// part, so it is charged at matter level and shared between them rather
// than multiplied by the participant count.
export const COLLECTIVE_MATTER_FEES = {
  participationAgreement: {
    key: "participationAgreement",
    label: "Participation agreement",
    amount: 450,
    note:
      "The agreement between the participating leaseholders setting out who pays what, " +
      "what happens if someone drops out, and how the freehold will be held afterwards.",
  },
  nomineePurchaser: {
    key: "nomineePurchaser",
    label: "Nominee purchaser company — formation and advice",
    amount: 350,
    note:
      "Most claims use a company to hold the freehold on the participants' behalf. This " +
      "covers forming it and advising on its constitution. The Companies House " +
      "incorporation fee is a separate disbursement.",
  },
};

// ── Supplements ─────────────────────────────────────────────────────
//
// `excludedFromNoCompletionNoFee` marks work that cannot sit inside the
// no-completion-no-fee arrangement. A vesting order application runs to
// a court timetable outside anyone's control and cannot be underwritten
// on a contingent basis.
export const SUPPLEMENTS = {
  // ── absentLandlord REMOVED ────────────────────────────────────────
  // A claim against an untraceable landlord proceeds by application to
  // the county court for a vesting order. The firm does not undertake
  // court or tribunal work, so these claims are declined at the
  // qualification stage and referred out rather than priced. Quoting a
  // fixed fee for proceedings we would not be running would be worse
  // than declining.
  //
  // See DECLINED_SCOPE below and the absent-landlord handling in
  // ../calculate-enfranchisement-quote.js.

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
  preservedRightToBuy: {
    key: "preservedRightToBuy",
    label: "Right to Buy / Preserved Right to Buy supplement",
    amount: 175,
    excludedFromNoCompletionNoFee: false,
    triggeredBy:
      "The flat was bought under the Right to Buy, the Preserved Right to Buy or the " +
      "Right to Acquire",
    note:
      "A flat acquired under one of these schemes normally carries a charge securing " +
      "repayment of the discount, and a restriction on the title requiring the former " +
      "landlord's consent to a disposal within a set period. Both have to be dealt with " +
      "before a new lease or a transfer can be registered, and the former landlord has to " +
      "be approached for consent.",
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

// ── Work outside the firm's scope ───────────────────────────────────
//
// Stated as a refusal to act, not as a fee to be confirmed later. The
// distinction matters: "we will confirm the tribunal fee" implies we
// would run the tribunal proceedings, and we would not.
export const DECLINED_SCOPE = {
  tribunal: {
    key: "tribunal",
    label: "First-tier Tribunal proceedings",
    note:
      "If the premium cannot be agreed, either party may apply to the First-tier Tribunal " +
      "to determine it. We do not undertake tribunal work. If your claim reaches that " +
      "point we will tell you promptly and refer you to a specialist, and our fee for the " +
      "conveyancing remains as quoted.",
  },
  court: {
    key: "court",
    label: "County court proceedings",
    note:
      "We do not undertake court work of any kind, including applications for a vesting " +
      "order where a landlord cannot be traced.",
  },
  absentLandlord: {
    key: "absentLandlord",
    label: "Claims against an untraceable landlord",
    declineMessage:
      "Where the landlord cannot be traced, the claim can only proceed by an application " +
      "to the county court for a vesting order. We do not undertake court work, so we are " +
      "not able to act on this claim. This is not a problem with your claim — the right " +
      "still exists, and a firm that handles enfranchisement litigation will be able to " +
      "pursue it for you. Please contact us and we will point you in the right direction.",
  },
};

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
  // The same carve-out on a collective claim, which is governed by s.33
  // rather than s.60. Citing the wrong section on a client-facing quote
  // is the kind of error a reader notices and a regulator would.
  thirdPartyDisclosureCollective:
    "Our no-completion-no-fee arrangement covers OUR fee only. It does not affect any " +
    "amount the participants owe to anyone else. In particular, if the claim is withdrawn " +
    "or deemed withdrawn you remain liable for the freeholder's costs incurred up to that " +
    "point under s.33 of the 1993 Act, and your valuer's fee remains payable. Neither is " +
    "within our control.",
  excludedSupplements: Object.values(SUPPLEMENTS)
    .filter((s) => s.excludedFromNoCompletionNoFee)
    .map((s) => s.key),

  // ── Which matter types carry the arrangement ─────────────────────
  // Individual lease extensions only. A collective claim runs for a
  // long time across many parties and can abort for reasons none of
  // them control; staircasing turns on a valuation and a housing
  // provider's timetable. Neither is a sensible thing to underwrite on
  // a contingent basis.
  appliesToTypes: [
    ENFRANCHISEMENT_TYPES.LEASE_EXTENSION_STATUTORY,
    ENFRANCHISEMENT_TYPES.LEASE_EXTENSION_INFORMAL,
  ],
};

export function getBaseFee(type) {
  const fee = BASE_FEES[String(type || "").trim()];
  return typeof fee === "number" ? fee : null;
}

export function getSupplement(key) {
  return SUPPLEMENTS[String(key || "").trim()] || null;
}
