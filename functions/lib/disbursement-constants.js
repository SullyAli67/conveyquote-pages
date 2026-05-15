// Single source of truth for disbursement amounts that both the
// server-side JS engine (functions/lib/calculate-quote.js) and the
// customer-facing TS engine (src/priceConfig.ts + src/buildQuoteData.ts)
// must consume. Do NOT reintroduce hardcoded equivalents in either
// engine — call these functions instead.
//
// HMLR statutory fees are NOT subject to VAT. The engines must add
// these to the disbursements line, never to the legal-fees-with-VAT
// line.

// ── Office copy entries ────────────────────────────────────────────
//
// Treated as a tenure-based estimate (not an itemised per-document
// calculation) — the firm reconciles the actual figure on completion.

export function getOfficeCopyEntriesAmount(tenure) {
  if (tenure === "freehold") return 20;
  if (tenure === "leasehold") return 50;
  throw new Error(
    `getOfficeCopyEntriesAmount: invalid tenure '${tenure}' (expected 'freehold' or 'leasehold')`
  );
}

// ── HM Land Registry registration fees ─────────────────────────────
//
// Source: https://www.gov.uk/guidance/hm-land-registry-registration-services-fees
// Effective from 9 December 2024. These are the *electronic*
// transfer-of-whole / charge-of-whole columns (Scale 1 / Scale 2) —
// paper applications attract a different fee, not modelled here.
//
// Scale 1 applies to transfers for monetary consideration (purchase,
// purchase leg of sale_purchase). The relevant amount is purchase
// price.
//
// Scale 2 applies to remortgages (charge-of-whole on the new lender's
// behalf) and transfers without consideration. The relevant amount is
// the mortgage advance for remortgages, or the property value /
// equity transferred for transfers of equity.
//
// HMLR fees are NOT subject to VAT.

export function getLandRegistryScale1Fee(propertyPrice) {
  const p = Number(propertyPrice) || 0;
  if (p <= 80000) return 20;
  if (p <= 100000) return 40;
  if (p <= 200000) return 100;
  if (p <= 500000) return 150;
  if (p <= 1000000) return 295;
  return 500;
}

export function getLandRegistryScale2Fee(amount) {
  const a = Number(amount) || 0;
  if (a <= 100000) return 20;
  if (a <= 200000) return 30;
  if (a <= 500000) return 45;
  if (a <= 1000000) return 65;
  return 140;
}

// Single dispatcher used by every engine. Takes the canonical
// transaction-type string and the relevant inputs; returns the
// registration fee (£) for that matter.
//
// Inputs the caller passes for each type:
//   purchase            → purchasePrice (Scale 1)
//   sale_purchase       → purchasePrice (Scale 1 — purchase leg drives the fee)
//   remortgage          → mortgageAmount (Scale 2 on new advance)
//   transfer            → propertyValue (Scale 2 — see note below)
//   remortgage_transfer → mortgageAmount + propertyValue (max of the two)
//   sale                → no fee returned (HMLR fee is paid by the buyer's
//                         solicitor on the matching purchase, not the seller)
//
// Share-aware path for transfer of equity
// ---------------------------------------
// The statutory Scale 2 basis for a transfer of equity is
// (propertyValue × sharePercent / 100) − continuingMortgage. When both
// optional inputs are provided AND the resulting chargeable amount is
// > 0 we use that figure. When either input is missing or the formula
// produces ≤ 0 (over-mortgaged / 0% share / blank inputs) we fall back
// to the conservative over-estimate on full property value — we never
// under-quote the customer.
//
// remortgage_transfer continues to take the max of:
//   • Scale 2 on the new mortgage advance, and
//   • Scale 2 on the transfer side (share-aware when available, else
//     conservative full propertyValue).
// HMLR charges ONE fee on combined applications, the higher of the
// two scenarios.
export function getLandRegistryFee({
  transactionType,
  purchasePrice = 0,
  mortgageAmount = 0,
  propertyValue = 0,
  sharePercent = null,
  continuingMortgage = null,
}) {
  switch (transactionType) {
    case "sale":
      return 0;
    case "purchase":
    case "sale_purchase":
      return getLandRegistryScale1Fee(purchasePrice);
    case "remortgage":
      return getLandRegistryScale2Fee(mortgageAmount);
    case "transfer":
      return getLandRegistryScale2Fee(
        getTransferChargeableAmount(propertyValue, sharePercent, continuingMortgage)
      );
    case "remortgage_transfer":
      return Math.max(
        getLandRegistryScale2Fee(mortgageAmount),
        getLandRegistryScale2Fee(
          getTransferChargeableAmount(propertyValue, sharePercent, continuingMortgage)
        )
      );
    default:
      throw new Error(
        `getLandRegistryFee: unsupported transactionType '${transactionType}'`
      );
  }
}

// Returns the chargeable consideration to feed into Scale 2 for a
// transfer of equity. Uses (propertyValue × share% − continuingMortgage)
// when both share and continuing mortgage are valid and the result is
// positive; otherwise returns full propertyValue (conservative
// over-estimate, never under-quoted).
function getTransferChargeableAmount(propertyValue, sharePercent, continuingMortgage) {
  const value = Number(propertyValue) || 0;
  const share = Number(sharePercent);
  const continuing = Number(continuingMortgage);
  const shareValid = Number.isFinite(share) && share >= 1 && share <= 99;
  const continuingValid = Number.isFinite(continuing) && continuing >= 0;
  if (!shareValid || !continuingValid) return value;
  const chargeable = (value * share) / 100 - continuing;
  return chargeable > 0 ? chargeable : value;
}
