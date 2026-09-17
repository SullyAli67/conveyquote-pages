// functions/lib/enfranchisement/types.js
//
// Single source of truth for the enfranchisement matter family's type
// vocabulary and display labels.
//
// Why this module exists
// ----------------------
// The conveyancing family's six transaction types are declared in at
// least eight places across this repo (two SUPPORTED_TRANSACTION_TYPES
// sets, the TransactionType union in src/buildQuoteData.ts, the
// FirmIssueTransactionType union and the <select> in src/App.tsx, three
// separate getTransactionLabel() functions, and TRANSACTION_LABELS in
// functions/lib/firm-quote-pdf-core.js). Every new type has to be added
// to all of them by hand.
//
// The enfranchisement family does not repeat that mistake. Every rail —
// central JS engine, the TS client, the firm engine, the referrer
// engine, the PDF renderer and the email templates — imports its labels
// and its membership test from here.
//
// Matter families
// ---------------
// "conveyancing"    — every transaction type that existed before this
//                     module. Untouched; behaviour is identical.
// "enfranchisement" — statutory and informal lease extension work under
//                     the Leasehold Reform, Housing and Urban
//                     Development Act 1993 ("the 1993 Act").
//
// Keeping these as separate families (rather than bolting a seventh and
// eighth member onto the existing transaction-type enum) means no
// existing quote changes by a penny, and the engine-consistency harness
// in scripts/verify-engine-consistency.js stays meaningful.

export const MATTER_FAMILY = {
  CONVEYANCING: "conveyancing",
  ENFRANCHISEMENT: "enfranchisement",
};

// ── Live enfranchisement matter types (Phase 1) ─────────────────────
//
// LEASE_EXTENSION_STATUTORY
//   A claim under s.42 of the 1993 Act. The leaseholder of a flat has a
//   statutory right to a new lease at a premium determined by the Act's
//   valuation rules. Under the regime currently in force that is the
//   unexpired term plus 90 years, at a peppercorn (nil) ground rent.
//   The landlord cannot refuse. If the premium is not agreed the
//   First-tier Tribunal (Property Chamber) determines it.
//
// LEASE_EXTENSION_INFORMAL
//   A voluntary extension negotiated with the freeholder outside the
//   Act. No statutory timetable, no price protection and no tribunal
//   backstop; the term, the ground rent and the lease terms are
//   whatever the parties agree. Priced separately because the work
//   profile genuinely differs — see price-book.js.
export const ENFRANCHISEMENT_TYPES = {
  LEASE_EXTENSION_STATUTORY: "lease_extension_statutory",
  LEASE_EXTENSION_INFORMAL: "lease_extension_informal",
};

// Planned for later phases, deliberately NOT declared as live values so
// no rail can accidentally accept a type the engine cannot price:
//
//   collective_enfranchisement  — s.13 of the 1993 Act. Phase 2. Note
//                                 that market pricing for these is per
//                                 participant on a DECLINING scale
//                                 (roughly £1,500 + VAT per flat at two
//                                 participants, falling to about £500 +
//                                 VAT per flat at twenty or more), so
//                                 the apportionment model needs banding
//                                 rather than a flat division.
//   house_enfranchisement       — freehold purchase, Leasehold Reform
//                                 Act 1967. Phase 3.
//   house_lease_extension       — 50-year extension, 1967 Act. Phase 3.
//   right_to_manage             — Commonhold and Leasehold Reform Act
//                                 2002. Phase 3.
//   lease_variation             — deed of variation. Phase 3.

const ENFRANCHISEMENT_TYPE_SET = new Set(Object.values(ENFRANCHISEMENT_TYPES));

// Full display labels — used on the quote document, the PDF and the
// admin screens.
const ENFRANCHISEMENT_LABELS = {
  [ENFRANCHISEMENT_TYPES.LEASE_EXTENSION_STATUTORY]:
    "Statutory lease extension (flat)",
  [ENFRANCHISEMENT_TYPES.LEASE_EXTENSION_INFORMAL]:
    "Informal lease extension (flat)",
};

// Short labels for constrained UI — dropdowns, table cells, the firm
// portal's quote list.
const ENFRANCHISEMENT_SHORT_LABELS = {
  [ENFRANCHISEMENT_TYPES.LEASE_EXTENSION_STATUTORY]: "Lease extension (statutory)",
  [ENFRANCHISEMENT_TYPES.LEASE_EXTENSION_INFORMAL]: "Lease extension (informal)",
};

// The statutory authority for each route. Rendered on the quote so the
// client can see which right is being exercised, and so the file shows
// what the fee was quoted against.
const ENFRANCHISEMENT_STATUTORY_BASIS = {
  [ENFRANCHISEMENT_TYPES.LEASE_EXTENSION_STATUTORY]:
    "Section 42, Leasehold Reform, Housing and Urban Development Act 1993",
  [ENFRANCHISEMENT_TYPES.LEASE_EXTENSION_INFORMAL]:
    "Negotiated with the freeholder outside the statutory scheme",
};

// True when `type` belongs to the enfranchisement family. Every rail
// uses this to decide whether to route to the enfranchisement engine,
// so there is exactly one definition of "is this an enfranchisement
// matter" in the codebase.
export function isEnfranchisementType(type) {
  return ENFRANCHISEMENT_TYPE_SET.has(String(type || "").trim());
}

// Resolves any transaction type to its matter family. Unknown types
// resolve to "conveyancing" so existing behaviour is preserved — the
// conveyancing engines already have their own validation and error
// messages for genuinely unsupported types, and this function must not
// pre-empt them.
export function getMatterFamily(type) {
  return isEnfranchisementType(type)
    ? MATTER_FAMILY.ENFRANCHISEMENT
    : MATTER_FAMILY.CONVEYANCING;
}

// Display label for an enfranchisement type. Returns "" for anything
// outside the family so callers can fall back to their own
// conveyancing label functions without a special case.
export function getEnfranchisementLabel(type, { short = false } = {}) {
  const key = String(type || "").trim();
  if (!ENFRANCHISEMENT_TYPE_SET.has(key)) return "";
  return short
    ? ENFRANCHISEMENT_SHORT_LABELS[key]
    : ENFRANCHISEMENT_LABELS[key];
}

export function getStatutoryBasis(type) {
  const key = String(type || "").trim();
  return ENFRANCHISEMENT_STATUTORY_BASIS[key] || "";
}

// Every live enfranchisement type, for populating dropdowns and for
// seeding per-firm / per-referrer fee configuration.
export function listEnfranchisementTypes() {
  return Object.values(ENFRANCHISEMENT_TYPES).map((value) => ({
    value,
    label: ENFRANCHISEMENT_LABELS[value],
    shortLabel: ENFRANCHISEMENT_SHORT_LABELS[value],
    statutoryBasis: ENFRANCHISEMENT_STATUTORY_BASIS[value],
  }));
}
