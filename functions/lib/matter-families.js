// functions/lib/matter-families.js
//
// The registry of matter families.
//
// A "family" is a group of matter types that share an output contract
// and a pricing model. Keeping them apart means adding a new kind of
// work never touches the engines for the existing kinds — no existing
// quote changes by a penny when a family is added.
//
//   conveyancing    — sale, purchase, remortgage, transfer of equity and
//                     the two combined matters. Priced from a bracket
//                     table driven by the consideration.
//
//   enfranchisement — statutory and informal lease extension, and
//                     collective enfranchisement under the Leasehold
//                     Reform, Housing and Urban Development Act 1993.
//                     Priced from fixed fees or a per-participant scale;
//                     the premium is excluded as a valuation matter.
//
//   shared_ownership — staircasing. Priced from a fixed fee; the price
//                     of the additional share is excluded as a valuation
//                     matter, and SDLT follows its own statutory rules.
//
// This lives in its own module rather than inside any one family's code
// so that no family has to import another just to name itself.
export const MATTER_FAMILY = {
  CONVEYANCING: "conveyancing",
  ENFRANCHISEMENT: "enfranchisement",
  SHARED_OWNERSHIP: "shared_ownership",
};

import {
  getEnfranchisementLabel,
  isEnfranchisementType,
} from "./enfranchisement/types.js";
import {
  getSharedOwnershipLabel,
  isSharedOwnershipType,
} from "./shared-ownership/types.js";

// ── One label resolver for every non-conveyancing family ────────────
//
// The conveyancing family's labels are still declared per endpoint,
// because that wording predates this module and clients already receive
// it. Everything else resolves here, so adding a fourth family means
// editing one file rather than the nine renderers that show a matter
// type to a human.
//
// Returns "" for a conveyancing type, so callers can fall through to
// their own branches without a special case.
export function getSpecialistMatterLabel(type, { short = false } = {}) {
  return (
    getEnfranchisementLabel(type, { short }) ||
    getSharedOwnershipLabel(type, { short }) ||
    ""
  );
}

// True for any matter type outside the conveyancing family.
export function isSpecialistMatterType(type) {
  return isEnfranchisementType(type) || isSharedOwnershipType(type);
}

export function resolveMatterFamily(type) {
  if (isEnfranchisementType(type)) return MATTER_FAMILY.ENFRANCHISEMENT;
  if (isSharedOwnershipType(type)) return MATTER_FAMILY.SHARED_OWNERSHIP;
  return MATTER_FAMILY.CONVEYANCING;
}
