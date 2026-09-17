// functions/lib/enfranchisement/regime.js
//
// The leasehold reform commencement switchboard.
//
// Why this module exists
// ----------------------
// The Leasehold and Freehold Reform Act 2024 ("LAFRA 2024") received
// Royal Assent in May 2024 but is being commenced piecemeal. Some of it
// is in force; the parts that change how a lease extension is valued
// and who pays whose costs are not. A quote issued today and a quote
// issued after the valuation provisions commence describe materially
// different transactions.
//
// Rather than scatter "is marriage value still payable?" checks through
// the engine, every regime-dependent fact lives here as a dated record.
// Each quote persists the `regimeId` it was priced under, so a quote
// pulled off the file in two years' time can still be explained.
//
// When a provision commences you edit ONE entry in this file. New
// quotes re-price; historic quotes keep their stored regimeId and
// remain intelligible.
//
// ── Commencement position as at the date this module was written ────
//
// IN FORCE
//   • Removal of the two-year ownership requirement. Section 27 LAFRA
//     2024, commenced by the Leasehold and Freehold Reform Act 2024
//     (Commencement No. 2 and Transitional Provision) Regulations 2025
//     (SI 2025/57), made 22 January 2025, in force 31 January 2025.
//     Applies to lease extension and freehold acquisition claims under
//     both the 1967 Act and the 1993 Act, and benefits existing
//     leaseholders as well as new ones.
//
// NOT IN FORCE
//   • Abolition of marriage value.
//   • 990-year extension terms.
//   • Prescribed capitalisation and deferment rates.
//   • The shift to each party bearing its own costs.
//
//     These require secondary legislation defining the new valuation
//     method. The Government consulted on the rates during 2026 and
//     commencement is not expected before 2027 at the earliest. In
//     October 2025 the High Court dismissed the challenge brought by
//     freeholders to the marriage value provisions, so the policy
//     stands — but standing and being in force are different things.
//
//     Marriage value therefore remains payable on every sub-80-year
//     extension completing under the current regime, and the leaseholder
//     remains liable for the landlord's reasonable costs under s.60 of
//     the 1993 Act.
//
// ⚠ VERIFY BEFORE RELYING ON THIS IN PRODUCTION. Commencement moves.
//   The point of this module is that updating it is a one-line change.

// Marriage value is the increase in the combined value of the landlord's
// and the tenant's interests brought about by the grant of the new
// lease. Under the regime currently in force, half of that increase is
// payable to the landlord as part of the premium, which is why crossing
// this threshold matters so much.
//
// ⚠ THE COMPARISON IS "EXCEEDS", NOT "IS BELOW".
// Paragraph 4(2A) of Schedule 13 to the 1993 Act provides that where, at
// the relevant date, the unexpired term of the existing lease EXCEEDS
// eighty years, the marriage value shall be taken to be nil. A term of
// exactly eighty years does not exceed eighty years, so marriage value
// IS payable at exactly 80. Use <= when testing, never <.
//
// The relevant date is the date the tenant's notice is served (s.39(8)),
// not the date of the quote — so a lease just above the threshold can
// fall below it while the client is still deciding.
export const MARRIAGE_VALUE_THRESHOLD_YEARS = 80;

// How far above the threshold we start warning the client that they
// should act. A claim takes months, and the valuation date is the date
// the s.42 notice is served — so a lease at 82 years can slip below 80
// while the client is still deciding.
export const MARRIAGE_VALUE_WARNING_BAND_YEARS = 5;

// Ordered oldest first. `effectiveFrom` is an ISO date, or null for a
// regime that is drafted but NOT yet commenced.
const REGIMES = [
  {
    regimeId: "pre-lafra-2024",
    label: "Pre-LAFRA 2024",
    effectiveFrom: "1993-11-01",
    twoYearOwnershipRequired: true,
    marriageValuePayable: true,
    extensionTermAddedYears: 90,
    groundRentReducedToPeppercorn: true,
    landlordCostsRecoverableFromTenant: true,
    landlordCostsStatutoryRef: "s.60 Leasehold Reform, Housing and Urban Development Act 1993",
  },
  {
    // The regime currently in force.
    regimeId: "lafra-2024-partial",
    label: "LAFRA 2024, partially commenced",
    effectiveFrom: "2025-01-31",
    twoYearOwnershipRequired: false,
    marriageValuePayable: true,
    extensionTermAddedYears: 90,
    groundRentReducedToPeppercorn: true,
    landlordCostsRecoverableFromTenant: true,
    landlordCostsStatutoryRef: "s.60 Leasehold Reform, Housing and Urban Development Act 1993",
  },
  {
    // ── NOT COMMENCED ────────────────────────────────────────────────
    // To bring this regime into force, set `effectiveFrom` to the
    // commencement date of the valuation provisions. Everything
    // downstream — the marriage value warning, the extension term shown
    // on the quote, and whether the landlord's costs block is rendered
    // at all — follows automatically.
    //
    // Do NOT guess a date. Leaving this null is the safe state: quotes
    // continue to be priced under the regime actually in force.
    regimeId: "lafra-2024-valuation",
    label: "LAFRA 2024, valuation provisions in force",
    effectiveFrom: null,
    twoYearOwnershipRequired: false,
    marriageValuePayable: false,
    extensionTermAddedYears: 990,
    groundRentReducedToPeppercorn: true,
    landlordCostsRecoverableFromTenant: false,
    landlordCostsStatutoryRef: "Each party bears its own costs (LAFRA 2024)",
  },
];

function toDate(value) {
  if (value instanceof Date) return value;
  const parsed = new Date(String(value || ""));
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

// Returns the regime in force on `asOfDate` (defaults to today).
// Commenced regimes only — an entry with effectiveFrom === null is
// never selected.
export function getRegime(asOfDate) {
  const when = toDate(asOfDate || new Date());

  let selected = REGIMES[0];
  for (const regime of REGIMES) {
    if (!regime.effectiveFrom) continue;
    if (toDate(regime.effectiveFrom) <= when) {
      selected = regime;
    }
  }

  return Object.freeze({ ...selected });
}

// Marriage value assessment for a given unexpired term, under the
// regime in force.
//
// ⚠ INTERNAL TRIAGE ONLY — NEVER SHOW THIS TO A CLIENT.
// Marriage value is a component of the PREMIUM. This engine does not
// quote the premium: it is excluded as a valuation matter for the
// client's own surveyor (see buildThirdPartyCosts in
// ../calculate-enfranchisement-quote.js). Explaining marriage value on a
// fee quote would be valuation commentary the firm does not hold itself
// out to give.
//
// The signal is retained so a fee earner reviewing an enquiry can see at
// a glance that a lease is short. The notes below are deliberately
// written as terse internal statements rather than client prose, so that
// rendering them to a client would look obviously wrong.
//
//   "payable"        — term is 80 years or less; in the premium
//   "approaching"    — within the warning band above the threshold
//   "not_applicable" — comfortably above, or abolished
//   "unknown"        — no term supplied
export function assessMarriageValue(unexpiredTermYears, regime) {
  const term = Number(unexpiredTermYears);
  const activeRegime = regime || getRegime();

  const SOURCE =
    "Sch 13 para 4(2A), Leasehold Reform, Housing and Urban Development Act 1993";

  if (!activeRegime.marriageValuePayable) {
    return {
      status: "not_applicable",
      note: "Abolished under the regime in force for this quote.",
      statutoryRef: null,
    };
  }

  if (!Number.isFinite(term) || term <= 0) {
    return {
      status: "unknown",
      note: "No unexpired term supplied — cannot assess.",
      statutoryRef: null,
    };
  }

  // "Exceeds eighty years" — so eighty years exactly is NOT exempt.
  if (term <= MARRIAGE_VALUE_THRESHOLD_YEARS) {
    return {
      status: "payable",
      note:
        `Unexpired term ${term}y is ${MARRIAGE_VALUE_THRESHOLD_YEARS}y or less, so marriage ` +
        "value forms part of the premium. Assessed at the date of service, not the date of " +
        "the quote. Flag for the fee earner; the valuer reports the figure.",
      statutoryRef: SOURCE,
    };
  }

  if (term <= MARRIAGE_VALUE_THRESHOLD_YEARS + MARRIAGE_VALUE_WARNING_BAND_YEARS) {
    return {
      status: "approaching",
      note:
        `Unexpired term ${term}y is within ${MARRIAGE_VALUE_WARNING_BAND_YEARS}y of the ` +
        `${MARRIAGE_VALUE_THRESHOLD_YEARS}y threshold. Assessed at the date of service, so ` +
        "the term may cross it before notice goes out. Flag for the fee earner.",
      statutoryRef: SOURCE,
    };
  }

  return {
    status: "not_applicable",
    note: `Unexpired term ${term}y exceeds ${MARRIAGE_VALUE_THRESHOLD_YEARS}y.`,
    statutoryRef: null,
  };
}

// Exported for the fixture harness, which asserts engine output against
// every regime — including the not-yet-commenced one — so that flipping
// commencement is provably safe before it is done for real.
export function getRegimeById(regimeId) {
  const found = REGIMES.find((r) => r.regimeId === regimeId);
  return found ? Object.freeze({ ...found }) : null;
}

export function listRegimes() {
  return REGIMES.map((r) => Object.freeze({ ...r }));
}
