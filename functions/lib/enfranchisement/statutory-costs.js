// functions/lib/enfranchisement/statutory-costs.js
//
// Statutory fees and third-party cost estimates for enfranchisement
// matters. Every figure carries an `effectiveFrom` date and a source,
// matching the convention already used for the HM Land Registry scales
// in ../disbursement-constants.js.
//
// ═══════════════════════════════════════════════════════════════════
//  ⚠ WHY THIS MODULE DOES NOT REUSE getLandRegistryScale1Fee()
// ═══════════════════════════════════════════════════════════════════
//
// A statutory lease extension takes effect by SURRENDER AND REGRANT:
// the existing lease is surrendered and a new, longer lease is granted
// in its place. Registering that new lease is NOT the same fee event as
// registering a transfer of whole on a purchase, and the existing
// helper must not be reused for it. Three differences:
//
//   1. THE PORTAL DISCOUNT DOES NOT APPLY. Applications to register a
//      lease do not attract the reduced fee for electronic
//      applications, even when lodged through the portal or Business
//      Gateway. getLandRegistryScale1Fee() in
//      ../disbursement-constants.js implements the REDUCED electronic
//      column (£20 / £40 / £100 / £150 / £295 / £500). Using it for a
//      lease extension would under-quote by roughly half at most bands.
//
//   2. THE VALUE IS ASSESSED DIFFERENTLY. The fee is calculated on the
//      premium paid PLUS the annual rent — taking the highest rent
//      reserved in the first five years of the new lease. It is not
//      assessed on the value of the property.
//
//   3. NO SEPARATE FEE FOR THE SURRENDER. Where a scale fee is paid to
//      register the new lease of substantially the same property and
//      the registered proprietor is unchanged, no further fee is
//      payable to register the surrender of the old lease. So this is
//      ONE fee, not two.
//
// Source: Land Registration Fee Order 2021 (SI 2021/1226); HM Land
// Registry Registration Services fees guidance; HM Land Registry
// Practice Guide 28 (extension of leases).
//
// ⚠ BANDS REQUIRE SIGN-OFF before production use. These are statutory
//   figures that change by order. Verify against the current Fee Order
//   and update `effectiveFrom` when you do.
// ═══════════════════════════════════════════════════════════════════

export const LAND_REGISTRY_SCALE_1_FULL = {
  effectiveFrom: "2022-01-31",
  source: "Land Registration Fee Order 2021 (SI 2021/1226), Scale 1, full rate",
  requiresSignOff: true,
  bands: [
    { upTo: 80000, fee: 45 },
    { upTo: 100000, fee: 95 },
    { upTo: 200000, fee: 230 },
    { upTo: 500000, fee: 330 },
    { upTo: 1000000, fee: 655 },
    { upTo: Infinity, fee: 1105 },
  ],
};

/**
 * Full-rate Scale 1 fee for registering the new lease.
 *
 * @param {number} premium  the premium payable for the new lease
 * @param {number} annualRent  highest rent reserved in the first five
 *   years. On a statutory extension the rent is a peppercorn, so this
 *   is normally 0.
 * @returns {number}
 */
export function getNewLeaseRegistrationFee(premium, annualRent = 0) {
  const chargeable = (Number(premium) || 0) + (Number(annualRent) || 0);
  for (const band of LAND_REGISTRY_SCALE_1_FULL.bands) {
    if (chargeable <= band.upTo) return band.fee;
  }
  return LAND_REGISTRY_SCALE_1_FULL.bands[
    LAND_REGISTRY_SCALE_1_FULL.bands.length - 1
  ].fee;
}

// ── Third-party cost estimates ──────────────────────────────────────
//
// These are costs the CLIENT pays to SOMEONE ELSE. They are never our
// fees, never within our control, and never included in any total this
// engine presents as amounts payable to the firm. The engine enforces
// that structurally — see `withinFirmControl` below and the assertion
// in ../calculate-enfranchisement-quote.js.

export const THIRD_PARTY_COST_STATUS = {
  ESTIMATE: "estimate",   // a range, based on published market rates
  TBC: "tbc",             // cannot be calculated yet — a figure is missing
  NOT_INCLUDED: "not_included", // outside scope entirely
};

// The landlord's reasonable costs under s.60 of the 1993 Act. The
// leaseholder is liable for these in addition to the premium.
//
// CRITICAL, AND THE REASON s.60(3) IS SPELLED OUT ON EVERY QUOTE:
// liability SURVIVES withdrawal. Where the tenant's notice ceases to
// have effect or is deemed withdrawn, the tenant remains liable for the
// landlord's costs incurred DOWN TO THAT TIME (subject to the
// exceptions in s.47(1) and s.55(2)). A client who walks away at
// counter-notice stage can still owe the freeholder four figures. Our
// no-completion-no-fee arrangement covers OUR fee and cannot and does
// not touch this.
export const LANDLORD_SECTION_60_COSTS = {
  label: "Landlord's legal and valuation costs",
  statutoryRef: "s.60 Leasehold Reform, Housing and Urban Development Act 1993",
  amountLow: 1200,
  amountHigh: 2200,
  status: THIRD_PARTY_COST_STATUS.ESTIMATE,
  withinFirmControl: false,
  payableTo: "The landlord (freeholder)",
  note:
    "This is an ESTIMATE ONLY and is NOT a cost we control, set or receive. " +
    "The landlord instructs their own solicitor and their own valuer, and you are " +
    "liable for their reasonable costs under s.60 of the 1993 Act. The actual figure " +
    "is set by the landlord's advisers and may be higher or lower than the range shown. " +
    "If the amount claimed is unreasonable it can be challenged before the First-tier " +
    "Tribunal, but we cannot fix or guarantee it.",
  survivesWithdrawalNote:
    "If your claim is withdrawn or is deemed withdrawn, you remain liable for the " +
    "landlord's costs incurred up to that point under s.60(3) of the 1993 Act. This " +
    "liability is unaffected by our no-completion-no-fee arrangement.",
};

// The client's own valuer. Instructed by the client, not by us.
export const LEASEHOLDER_VALUER_FEE = {
  label: "Your valuer's fee",
  amountLow: 600,
  amountHigh: 900,
  status: THIRD_PARTY_COST_STATUS.ESTIMATE,
  withinFirmControl: false,
  payableTo: "Your surveyor / valuer",
  note:
    "This is an ESTIMATE ONLY and is NOT a cost we control or receive. A valuation by a " +
    "surveyor experienced in leasehold enfranchisement is essential — the premium is a " +
    "valuation question, not a legal one. You instruct the valuer directly and pay them " +
    "directly. This fee is payable whether or not the claim completes.",
};

// ── Fees we deliberately do NOT assert a figure for ─────────────────
//
// Each of these is a real cost, but quoting a number we have not
// verified against the current fee order would be worse than saying
// "we will confirm". Set `amount` and flip `verified` to true once the
// figure has been checked; the engine renders the amount automatically
// once it is present.

export const UNVERIFIED_STATUTORY_FEES = {
  tribunalApplication: {
    label: "First-tier Tribunal (Property Chamber) fees",
    amount: null,
    verified: false,
    withinFirmControl: false,
    note:
      "If the premium cannot be agreed, either party may apply to the First-tier " +
      "Tribunal to determine it. Tribunal fees and our costs of the tribunal " +
      "proceedings are not included in the quoted fee and will be confirmed separately.",
  },
  countyCourtVestingOrder: {
    label: "County court fee — vesting order application",
    amount: null,
    verified: false,
    withinFirmControl: false,
    note:
      "Where the landlord cannot be traced, an application to the county court for a " +
      "vesting order is required. The court fee will be confirmed when the application " +
      "is made.",
  },
  tracingAgent: {
    label: "Tracing agent's fee",
    amount: null,
    verified: false,
    withinFirmControl: false,
    note:
      "Where the landlord cannot be traced, evidence of a diligent search is required " +
      "before the court will make a vesting order. A tracing agent is normally " +
      "instructed and their fee is confirmed at the time.",
  },
};
