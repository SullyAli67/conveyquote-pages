export const VAT_RATE = 0.2;

export const PRICE_CONFIG = {
  sale: {
    legalFees: {
      baseLegalFee: 995,
      leaseholdSupplement: 300,
      mortgageRedemptionSupplement: 50,
      managementCompanySupplement: 150,
      tenantedPropertySupplement: 150,
      telegraphicTransferFee: 45,
    },
    disbursements: {
      officeCopyEntries: 12,
      idChecks: 14.4,
    },
  },

  purchase: {
    legalFees: {
      baseLegalFee: 1025,
      leaseholdSupplement: 300,
      actingForLenderSupplement: 125,
      telegraphicTransferFee: 45,
      giftedDepositSupplement: 95,
      newBuildSupplement: 200,
      sharedOwnershipSupplement: 250,
      helpToBuySupplement: 200,
      companyBuyerSupplement: 350,
      buyToLetSupplement: 150,
      lifetimeIsaSupplement: 100,
    },
    disbursements: {
      searchPack: 350,
      landRegistryRegistrationFee: 150,
      idChecks: 14.4,
      os1PrioritySearch: 8.8,
      bankruptcySearchPerName: 7.6,
      sdltSubmissionFee: 6,
      ap1SubmissionFee: 6,
    },
  },

  remortgage: {
    legalFees: {
      baseLegalFee: 695,
      leaseholdSupplement: 250,
      additionalBorrowingSupplement: 100,
      transferOfEquitySupplement: 250,
      telegraphicTransferFee: 45,
    },
    disbursements: {
      officeCopyEntries: 12,
      idChecks: 14.4,
      os1PrioritySearch: 8.8,
      bankruptcySearchPerName: 7.6,
      ap1SubmissionFee: 6,
    },
  },

  transfer: {
    legalFees: {
      baseLegalFee: 550,
      leaseholdSupplement: 250,
      mortgageSupplement: 150,
      additionalOwnerChangeSupplement: 100,
      telegraphicTransferFee: 45,
    },
    disbursements: {
      officeCopyEntries: 12,
      idChecks: 14.4,
      bankruptcySearchPerName: 7.6,
      ap1SubmissionFee: 6,
    },
  },
} as const;
