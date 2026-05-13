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
// Notes:
// • transfer of equity uses propertyValue as a conservative
//   over-estimate. The statutory basis is share-value minus any
//   continuing charge, but the quote form doesn't currently capture
//   share percentage or continuing mortgage amount. Using full
//   property value over-states the fee by ~50% in typical cases; the
//   firm reconciles at completion. Future batch: capture share % and
//   continuing-charge amount, swap to a share-aware calculation.
// • remortgage_transfer combines a Scale 2 charge (new mortgage) and
//   a Scale 2 transfer (share). HMLR charges ONE fee on combined
//   applications, the higher of the two scenarios. We compute both
//   and take the max so the customer is never under-quoted.
export function getLandRegistryFee({
  transactionType,
  purchasePrice = 0,
  mortgageAmount = 0,
  propertyValue = 0,
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
      return getLandRegistryScale2Fee(propertyValue);
    case "remortgage_transfer":
      return Math.max(
        getLandRegistryScale2Fee(mortgageAmount),
        getLandRegistryScale2Fee(propertyValue)
      );
    default:
      throw new Error(
        `getLandRegistryFee: unsupported transactionType '${transactionType}'`
      );
  }
}
