export const VAT_RATE = 0.2;

// MUST STAY IN SYNC with the other pricing file — see functions/lib/calculate-quote.js.
// Changing pricing requires editing both files.
export function getPurchaseBaseFee(price: number): number {
  const value = Number(price) || 0;
  if (value <= 0) return 995;
  if (value < 200000) return 795;
  if (value < 400000) return 995;
  if (value < 750000) return 1195;
  return 1395;
}

// MUST STAY IN SYNC with the other pricing file — see functions/lib/calculate-quote.js.
// Changing pricing requires editing both files.
export function getSaleBaseFee(price: number): number {
  const value = Number(price) || 0;
  if (value <= 0) return 895;
  if (value < 200000) return 775;
  if (value < 400000) return 895;
  if (value < 750000) return 995;
  return 1195;
}

// MUST STAY IN SYNC with the other pricing file — see functions/lib/calculate-quote.js.
// Changing pricing requires editing both files.
export function getRemortgageBaseFee(propertyValue: number): number {
  const value = Number(propertyValue) || 0;
  if (value <= 0) return 695;
  if (value < 200000) return 595;
  if (value < 400000) return 695;
  if (value < 750000) return 795;
  return 895;
}

// MUST STAY IN SYNC with the other pricing file — see functions/lib/calculate-quote.js.
// Changing pricing requires editing both files.
export function getTransferBaseFee(propertyValue: number): number {
  const value = Number(propertyValue) || 0;
  if (value <= 0) return 550;
  if (value < 200000) return 495;
  if (value < 400000) return 550;
  if (value < 750000) return 625;
  return 725;
}

export const BESPOKE_PRICING_NOTE =
  "Properties over £1.5m may be subject to bespoke pricing — please contact us to confirm.";

export function getBespokeNote(value: number): string | null {
  return (Number(value) || 0) >= 1500000 ? BESPOKE_PRICING_NOTE : null;
}

export const PRICE_CONFIG = {
  sale: {
    legalFees: {
      leaseholdSupplement: 300,
      mortgageRedemptionSupplement: 50,
      managementCompanySupplement: 150,
      tenantedPropertySupplement: 150,
      telegraphicTransferFee: 45,
    },
    disbursements: {
      // Office copy entries: see getOfficeCopyEntriesAmount in
      // functions/lib/disbursement-constants.js — tenure-based, single
      // source of truth shared with the server-side JS engine.
      idChecks: 14.4,
    },
  },

  purchase: {
    legalFees: {
      leaseholdSupplement: 300,
      actingForLenderSupplement: 125,
      telegraphicTransferFee: 45,
      giftedDepositSupplement: 250,
      newBuildSupplement: 200,
      sharedOwnershipSupplement: 250,
      helpToBuySupplement: 200,
      companyBuyerSupplement: 350,
      buyToLetSupplement: 150,
      lifetimeIsaSupplement: 100,
    },
    disbursements: {
      searchPack: 350,
      // Land Registry: see getLandRegistryFee in
      // functions/lib/disbursement-constants.js — tenure-agnostic
      // sliding scale, no VAT, shared with the server-side JS engine.
      idChecks: 14.4,
      os1PrioritySearch: 8.8,
      bankruptcySearchPerName: 7.6,
      sdltSubmissionFee: 6,
      ap1SubmissionFee: 6,
    },
  },

  remortgage: {
    legalFees: {
      leaseholdSupplement: 250,
      additionalBorrowingSupplement: 100,
      transferOfEquitySupplement: 250,
      telegraphicTransferFee: 45,
    },
    disbursements: {
      // Office copy entries: see getOfficeCopyEntriesAmount in
      // functions/lib/disbursement-constants.js.
      idChecks: 14.4,
      os1PrioritySearch: 8.8,
      bankruptcySearchPerName: 7.6,
      ap1SubmissionFee: 6,
    },
  },

  transfer: {
    legalFees: {
      leaseholdSupplement: 250,
      mortgageSupplement: 150,
      additionalOwnerChangeSupplement: 100,
      telegraphicTransferFee: 45,
    },
    disbursements: {
      // Office copy entries: see getOfficeCopyEntriesAmount in
      // functions/lib/disbursement-constants.js.
      idChecks: 14.4,
      bankruptcySearchPerName: 7.6,
      ap1SubmissionFee: 6,
    },
  },
} as const;
