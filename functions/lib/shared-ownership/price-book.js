// functions/lib/shared-ownership/price-book.js
//
// Central-rail fees for staircasing. All amounts EXCLUDE VAT.
//
// Positioning: published market rates for staircasing run at roughly
// £1,100–£1,700 all in, with an average near £1,500 — but those figures
// usually bundle the provider's administration fee, the valuation and
// disbursements alongside the solicitor's charge. The legal fee alone
// sits well below that.
//
// The base fee below is a cash staircasing with nothing unusual. The
// single biggest driver of extra work is a mortgage: a new or varied
// charge, the lender's own requirements and their consent to the
// transaction. That is charged as a supplement rather than assumed,
// because plenty of staircasing purchases are funded from savings.
//
// Consistent with the enfranchisement price book, a mortgaged final
// staircasing to 100% lands at £1,025 + VAT, which is below the
// published market band.

import { SHARED_OWNERSHIP_TYPES } from "./types.js";

export const BASE_FEES = {
  [SHARED_OWNERSHIP_TYPES.STAIRCASING]: 750,
};

export const SUPPLEMENTS = {
  mortgageOnStaircasing: {
    key: "mortgageOnStaircasing",
    label: "Mortgage supplement",
    amount: 150,
    excludedFromNoCompletionNoFee: false,
    triggeredBy: "The purchase is funded by a mortgage",
    note:
      "Covers acting for your lender: reporting on title, satisfying their conditions, " +
      "obtaining their consent to the staircasing and registering the new or varied " +
      "charge.",
  },
  finalStaircasing: {
    key: "finalStaircasing",
    label: "Final staircasing to 100% supplement",
    amount: 125,
    excludedFromNoCompletionNoFee: false,
    triggeredBy: "This purchase takes you to 100% ownership",
    note:
      "Reaching 100% usually means a deed of variation or a new lease removing the rent " +
      "and the shared ownership provisions, and dealing with the provider's requirements " +
      "on the final step. It is more work than an intermediate staircasing.",
  },
  leaseVariationRequired: {
    key: "leaseVariationRequired",
    label: "Lease variation supplement",
    amount: 250,
    excludedFromNoCompletionNoFee: false,
    triggeredBy: "The lease needs to be varied",
    note:
      "Where the lease has to be varied for a reason other than the final staircasing " +
      "step — correcting a defect, for example, or dealing with a lender requirement.",
  },
  intermediateLandlord: {
    key: "intermediateLandlord",
    label: "Intermediate landlord supplement",
    amount: 250,
    excludedFromNoCompletionNoFee: false,
    triggeredBy: "There is a head lease above your shared ownership lease",
    note:
      "Where a head lease sits between your provider and the freeholder there is further " +
      "title to investigate and an additional party whose consent or involvement may be " +
      "needed on the staircasing.",
  },
  preservedRightToBuy: {
    key: "preservedRightToBuy",
    label: "Right to Buy / Preserved Right to Buy supplement",
    amount: 175,
    excludedFromNoCompletionNoFee: false,
    triggeredBy:
      "The home was acquired under the Right to Buy, the Preserved Right to Buy or the " +
      "Right to Acquire",
    note:
      "Property acquired under one of these schemes normally carries a charge securing " +
      "repayment of the discount and a restriction on the title requiring the former " +
      "landlord's consent to a disposal within a set period. Both have to be dealt with " +
      "before the staircasing can be registered.",
  },
  unregisteredTitle: {
    key: "unregisteredTitle",
    label: "Unregistered title supplement",
    amount: 350,
    excludedFromNoCompletionNoFee: false,
    triggeredBy: "The title is unregistered",
    note:
      "Unregistered title requires title to be deduced from the deeds, an epitome to be " +
      "prepared and examined, and first registration to be dealt with.",
  },
};

export const VALID_STAIRCASING_SUPPLEMENT_KEYS = Object.keys(SUPPLEMENTS);

// ── Third-party costs ───────────────────────────────────────────────
//
// As on the enfranchisement rail, these are amounts the client pays to
// SOMEONE ELSE. They are marked withinFirmControl: false and never
// enter any total presented as payable to the firm.
//
// The provider's administration fee varies more than almost anything
// else in this product — some housing associations charge a couple of
// hundred pounds, others several hundred, and some add their own legal
// costs on top. The range is deliberately wide and clearly labelled.
export const PROVIDER_ADMIN_FEE = {
  label: "Your housing provider's administration fee",
  amountLow: 200,
  amountHigh: 600,
  withinFirmControl: false,
  payableTo: "Your housing association or provider",
  note:
    "This is an ESTIMATE ONLY and is NOT a cost we control, set or receive. Your provider " +
    "sets its own administration fee for processing a staircasing purchase, and some also " +
    "charge their own legal costs on top. The amount varies considerably between " +
    "providers. Your provider will confirm it in their staircasing pack.",
};

export const STAIRCASING_VALUATION_FEE = {
  label: "RICS valuation fee",
  amountLow: 250,
  amountHigh: 500,
  withinFirmControl: false,
  payableTo: "Your surveyor / valuer",
  note:
    "This is an ESTIMATE ONLY and is NOT a cost we control or receive. The price of the " +
    "additional share is set by a RICS valuation, which your provider will normally " +
    "require you to commission. Valuations are usually only valid for three months, which " +
    "is why staircasing purchases run to a deadline.",
};

// ── Abortive costs ──────────────────────────────────────────────────
//
// Staircasing does NOT carry a no-completion-no-fee arrangement. The
// timetable belongs to the housing provider and the valuation, both
// outside anyone's control here: valuations expire after around three
// months, providers withdraw offers, and a purchase can fall away
// through nobody's fault. Underwriting that on a contingent basis is
// not a sensible risk to take.
//
// Said plainly on the quote rather than left for the client to discover
// in the terms of business.
export const ABORTIVE_POLICY = {
  type: "chargeable_on_abort",
  headline: "If the purchase does not complete",
  summary:
    "This matter is not offered on a no-completion-no-fee basis. If the purchase does not " +
    "complete, we will charge for the work actually done up to that point, and we will " +
    "tell you what that is before it mounts up.",
  faultConditions: [],
  thirdPartyCostsStillPayable: true,
  thirdPartyDisclosure:
    "Your valuer's fee and your provider's administration fee are also payable whether or " +
    "not the purchase completes. Neither is within our control.",
  excludedSupplements: [],
  appliesToTypes: [],
};

export function getBaseFee(type) {
  const fee = BASE_FEES[String(type || "").trim()];
  return typeof fee === "number" ? fee : null;
}

export function getSupplement(key) {
  return SUPPLEMENTS[String(key || "").trim()] || null;
}
