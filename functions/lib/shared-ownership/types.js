// functions/lib/shared-ownership/types.js
//
// Matter types in the shared ownership family.
//
// STAIRCASING
//   Buying an additional share in a home you already part-own, usually
//   from a housing association. Each purchase is its own transaction:
//   the share is valued by an RICS surveyor, the provider approves,
//   lender consent is obtained where there is a mortgage, a memorandum
//   of staircasing is completed and the change is registered.
//
//   Reaching 100% generally opens up a statutory lease extension in the
//   ordinary way, which is why the two often arrive together.
export const SHARED_OWNERSHIP_TYPES = {
  STAIRCASING: "staircasing",
};

const TYPE_SET = new Set(Object.values(SHARED_OWNERSHIP_TYPES));

const LABELS = {
  [SHARED_OWNERSHIP_TYPES.STAIRCASING]: "Staircasing (buying a further share)",
};

const SHORT_LABELS = {
  [SHARED_OWNERSHIP_TYPES.STAIRCASING]: "Staircasing",
};

const BASIS = {
  [SHARED_OWNERSHIP_TYPES.STAIRCASING]:
    "Purchase of a further share under the terms of your shared ownership lease",
};

export function isSharedOwnershipType(type) {
  return TYPE_SET.has(String(type || "").trim());
}

export function getSharedOwnershipLabel(type, { short = false } = {}) {
  const key = String(type || "").trim();
  if (!TYPE_SET.has(key)) return "";
  return short ? SHORT_LABELS[key] : LABELS[key];
}

export function getSharedOwnershipBasis(type) {
  return BASIS[String(type || "").trim()] || "";
}

export function listSharedOwnershipTypes() {
  return Object.values(SHARED_OWNERSHIP_TYPES).map((value) => ({
    value,
    label: LABELS[value],
    shortLabel: SHORT_LABELS[value],
    statutoryBasis: BASIS[value],
  }));
}
