// functions/lib/enfranchisement/qualification.js
//
// The qualification gate for flat lease extension claims.
//
// Why this runs before any price
// ------------------------------
// Every other matter type in this engine can be priced from a
// consideration figure. A lease extension cannot: the leaseholder must
// first have the statutory right. Quoting a fixed fee to someone who
// turns out not to qualify is the worst outcome this product can
// produce, so the gate runs first and can refuse to return a price at
// all.
//
// Three outcomes:
//
//   "qualifies"        — clean, clearly qualifying claim. Price it.
//   "does_not_qualify" — a hard statutory bar. Return reasons, NOT a
//                        price. The informal route may still be open,
//                        and the engine says so.
//   "needs_review"     — anything marginal. A provisional quote may be
//                        shown but MUST NOT be auto-issued; a fee
//                        earner decides.
//
// The gate is deliberately cautious. Routing a borderline case to a
// human costs a few minutes. Getting it wrong costs a client a matter
// they were told they could bring.
//
// Statutory framework
// -------------------
// The right to a new lease of a flat is conferred by s.39 of the
// Leasehold Reform, Housing and Urban Development Act 1993 ("the 1993
// Act") and exercised by notice under s.42. The claimant must be a
// qualifying tenant: broadly, the tenant of a flat under a long lease,
// meaning one originally granted for a term exceeding 21 years (s.7).
//
// The two-year ownership requirement was abolished by s.27 of the
// Leasehold and Freehold Reform Act 2024, in force 31 January 2025.
// That check is therefore regime-driven rather than hardcoded — see
// ./regime.js.

import { getRegime } from "./regime.js";

export const QUALIFICATION_OUTCOME = {
  QUALIFIES: "qualifies",
  DOES_NOT_QUALIFY: "does_not_qualify",
  NEEDS_REVIEW: "needs_review",
};

const LONG_LEASE_MINIMUM_TERM_YEARS = 21;

function toOptionalNumber(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).replace(/,/g, "").trim();
  if (str === "") return null;
  const parsed = Number(str);
  return Number.isFinite(parsed) ? parsed : null;
}

// Treats only an explicit "yes"/true as affirmative. Blank stays blank
// so the gate can distinguish "answered no" from "not answered", which
// matters on a public-facing form where a skipped question must not be
// read as a clean answer.
function isYes(value) {
  if (value === true) return true;
  const str = String(value ?? "").trim().toLowerCase();
  return str === "yes" || str === "true";
}

function isAnswered(value) {
  if (value === true || value === false) return true;
  return String(value ?? "").trim() !== "";
}

/**
 * Assess a flat lease extension claim.
 *
 * Input (all optional — unanswered questions produce needs_review
 * rather than a false pass):
 *   propertyType            "flat" | "house"
 *   originalLeaseTermYears  term the lease was ORIGINALLY granted for
 *   unexpiredTermYears      years left to run
 *   isBusinessTenancy       Part II Landlord and Tenant Act 1954 applies
 *   landlordIdentifiable    can the competent landlord be traced?
 *   noticeAlreadyServed     has a s.42 notice already gone out?
 *   existingClaim           is a claim already on foot on this flat?
 *   sharedOwnership         is this a shared ownership lease?
 *   staircasedToFull        has the tenant staircased to 100%?
 *   landlordIsNationalTrust / landlordIsCrown / landlordIsCharitableHousingTrust
 *   ownershipYears          how long the client has owned (regime-gated)
 *
 * @returns {{outcome: string, reasons: Array, statutoryRefs: string[],
 *            flags: object, regimeId: string}}
 */
export function assessQualification(input = {}, asOfDate) {
  const regime = getRegime(asOfDate);

  const reasons = [];
  const statutoryRefs = new Set();
  const flags = {
    absentLandlord: false,
    informalRouteAvailable: true,
  };

  let outcome = QUALIFICATION_OUTCOME.QUALIFIES;

  // Downgrade helper — an outcome can only ever get worse as checks
  // accumulate, never better.
  const fail = (code, message, ref) => {
    outcome = QUALIFICATION_OUTCOME.DOES_NOT_QUALIFY;
    reasons.push({ code, severity: "bar", message, statutoryRef: ref || null });
    if (ref) statutoryRefs.add(ref);
  };
  const review = (code, message, ref) => {
    if (outcome !== QUALIFICATION_OUTCOME.DOES_NOT_QUALIFY) {
      outcome = QUALIFICATION_OUTCOME.NEEDS_REVIEW;
    }
    reasons.push({ code, severity: "review", message, statutoryRef: ref || null });
    if (ref) statutoryRefs.add(ref);
  };
  const note = (code, message, ref) => {
    reasons.push({ code, severity: "note", message, statutoryRef: ref || null });
    if (ref) statutoryRefs.add(ref);
  };

  // ── Property type ──────────────────────────────────────────────────
  const propertyType = String(input.propertyType ?? "").trim().toLowerCase();
  if (propertyType === "house") {
    fail(
      "house_not_in_scope",
      "This is a house. The right to extend a lease of a house arises under the " +
        "Leasehold Reform Act 1967, not the 1993 Act, and is not yet supported by " +
        "this quoting service. Please contact us so we can quote for it directly.",
      "Leasehold Reform Act 1967"
    );
  } else if (propertyType !== "flat") {
    review(
      "property_type_unknown",
      "We need to know whether the property is a flat or a house before we can " +
        "confirm which statutory right applies."
    );
  }

  // ── Long lease test ────────────────────────────────────────────────
  const originalTerm = toOptionalNumber(input.originalLeaseTermYears);
  if (originalTerm === null) {
    review(
      "original_term_unknown",
      "We need the term the lease was originally granted for. The right to a new " +
        "lease only applies to a long lease — one originally granted for more than " +
        `${LONG_LEASE_MINIMUM_TERM_YEARS} years.`,
      "s.7 Leasehold Reform, Housing and Urban Development Act 1993"
    );
  } else if (originalTerm <= LONG_LEASE_MINIMUM_TERM_YEARS) {
    fail(
      "not_a_long_lease",
      `The lease was originally granted for ${originalTerm} years. The statutory right ` +
        `applies only to a long lease, originally granted for more than ` +
        `${LONG_LEASE_MINIMUM_TERM_YEARS} years, so this claim does not qualify.`,
      "s.7 Leasehold Reform, Housing and Urban Development Act 1993"
    );
  } else {
    statutoryRefs.add("s.39 Leasehold Reform, Housing and Urban Development Act 1993");
  }

  // ── Unexpired term ─────────────────────────────────────────────────
  const unexpired = toOptionalNumber(input.unexpiredTermYears);
  if (unexpired === null) {
    review(
      "unexpired_term_unknown",
      "We need the unexpired term of the lease. It drives both the premium and the " +
        "urgency of the claim."
    );
  } else if (unexpired <= 0) {
    fail(
      "lease_expired",
      "The lease appears to have expired. There is no subsisting lease to extend.",
      "s.39 Leasehold Reform, Housing and Urban Development Act 1993"
    );
  }

  // ── Business tenancy ───────────────────────────────────────────────
  if (isYes(input.isBusinessTenancy)) {
    fail(
      "business_tenancy",
      "Where Part II of the Landlord and Tenant Act 1954 applies to the tenancy, the " +
        "tenant is not a qualifying tenant and the statutory right does not arise.",
      "Part II Landlord and Tenant Act 1954"
    );
  }

  // ── Two-year ownership (regime-gated) ──────────────────────────────
  // Abolished with effect from 31 January 2025. Under the regime
  // currently in force this block does nothing — which is exactly what
  // ./regime.js exists to make safe.
  if (regime.twoYearOwnershipRequired) {
    const ownershipYears = toOptionalNumber(input.ownershipYears);
    if (ownershipYears === null) {
      review(
        "ownership_period_unknown",
        "Under the regime in force at the date of this quote, the tenant must have " +
          "owned the flat for at least two years. We need to know how long you have owned it."
      );
    } else if (ownershipYears < 2) {
      fail(
        "two_year_rule",
        "Under the regime in force at the date of this quote, the tenant must have owned " +
          "the flat for at least two years before serving notice.",
        "s.39(2) Leasehold Reform, Housing and Urban Development Act 1993"
      );
    }
  }

  // ── Excluded landlords and land ────────────────────────────────────
  if (isYes(input.landlordIsNationalTrust)) {
    review(
      "national_trust",
      "Land held inalienably by the National Trust is outside the statutory scheme. " +
        "This needs to be checked before we can advise.",
      "Leasehold Reform, Housing and Urban Development Act 1993"
    );
  }
  if (isYes(input.landlordIsCrown)) {
    review(
      "crown_land",
      "The Crown is not bound by the statutory scheme, although the Crown gives " +
        "voluntary undertakings to deal with claims as if it were. This needs to be " +
        "checked before we can advise."
    );
  }
  if (isYes(input.landlordIsCharitableHousingTrust)) {
    review(
      "charitable_housing_trust",
      "Where the landlord is a charitable housing trust and the flat is provided as part " +
        "of its charitable purposes, the statutory right may not arise. This needs checking."
    );
  }

  // ── Shared ownership ───────────────────────────────────────────────
  if (isYes(input.sharedOwnership)) {
    if (isYes(input.staircasedToFull)) {
      note(
        "shared_ownership_staircased",
        "This is a shared ownership lease that has been staircased to 100%. We will " +
          "confirm the position on the lease before serving notice."
      );
    } else {
      review(
        "shared_ownership_part",
        "This is a shared ownership lease that has not been staircased to 100%. The " +
          "statutory right generally does not arise until the tenant owns the full " +
          "equitable interest, so this needs to be reviewed before we can quote."
      );
    }
  }

  // ── Claim already under way ────────────────────────────────────────
  if (isYes(input.noticeAlreadyServed)) {
    review(
      "notice_already_served",
      "A notice has already been served. We need to see it, and check the statutory " +
        "timetable, before quoting — the work required depends on what stage the claim " +
        "has reached.",
      "s.42 Leasehold Reform, Housing and Urban Development Act 1993"
    );
  }
  if (isYes(input.existingClaim)) {
    review(
      "existing_claim",
      "There appears to be an existing claim on this flat. We need to review it before " +
        "quoting."
    );
  }

  // ── Absent landlord ────────────────────────────────────────────────
  // Not a bar. The claim proceeds by application to the county court
  // for a vesting order, which is materially more work — priced as a
  // supplement and carved out of the no-completion-no-fee promise.
  if (isAnswered(input.landlordIdentifiable) && !isYes(input.landlordIdentifiable)) {
    flags.absentLandlord = true;
    note(
      "absent_landlord",
      "The landlord cannot be identified or traced. The claim proceeds by application to " +
        "the county court for a vesting order, with the premium determined by the " +
        "First-tier Tribunal and paid into court. This is charged as a supplement and is " +
        "outside our no-completion-no-fee arrangement.",
      "s.50 Leasehold Reform, Housing and Urban Development Act 1993"
    );
  }

  return {
    outcome,
    reasons,
    statutoryRefs: Array.from(statutoryRefs),
    flags,
    regimeId: regime.regimeId,
  };
}

// Convenience predicate — a quote may only be issued automatically when
// the claim clearly qualifies. Anything else goes to a fee earner.
export function mayAutoIssue(qualification) {
  return qualification?.outcome === QUALIFICATION_OUTCOME.QUALIFIES;
}
