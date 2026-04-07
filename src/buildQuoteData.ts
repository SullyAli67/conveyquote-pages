import { PRICE_CONFIG, VAT_RATE } from "./priceConfig";

type TransactionType = "sale" | "purchase" | "remortgage" | "transfer";

type QuoteFormLike = {
  type: string;
  tenure: string;
  mortgage?: string;
  giftedDeposit?: string;
  newBuild?: string;
  sharedOwnership?: string;
  helpToBuy?: string;
  isCompany?: string;
  buyToLet?: string;
  saleMortgage?: string;
  managementCompany?: string;
  tenanted?: string;
  additionalBorrowing?: string;
  remortgageTransfer?: string;
  transferMortgage?: string;
  ownersChanging?: string;
};

export type QuoteItem = {
  label: string;
  amount: number;
  note?: string;
};

export type BuiltQuoteData = {
  legalFees: QuoteItem[];
  disbursements: QuoteItem[];
  vat: number;
  legalFeesExVat: number;
  legalTotalInclVat: number;
  disbursementTotal: number;
  grandTotal: number;
  feeBreakdown: string;
};

const yes = (value?: string) => value === "yes";

const formatMoney = (value: number) => value.toFixed(2);

const addItem = (items: QuoteItem[], label: string, amount: number) => {
  if (amount > 0) {
    items.push({ label, amount });
  }
};

const sumItems = (items: QuoteItem[]) =>
  items.reduce((total, item) => total + item.amount, 0);

export function buildQuoteData(form: QuoteFormLike): BuiltQuoteData {
  const type = form.type as TransactionType;
  const tenure = form.tenure;

  const legalFees: QuoteItem[] = [];
  const disbursements: QuoteItem[] = [];

  if (type === "sale") {
    const config = PRICE_CONFIG.sale;

    addItem(legalFees, "Base legal fee", config.legalFees.baseLegalFee);

    if (tenure === "leasehold") {
      addItem(
        legalFees,
        "Leasehold supplement",
        config.legalFees.leaseholdSupplement
      );
    }

    if (yes(form.saleMortgage)) {
      addItem(
        legalFees,
        "Mortgage redemption supplement",
        config.legalFees.mortgageRedemptionSupplement
      );
    }

    if (yes(form.managementCompany)) {
      addItem(
        legalFees,
        "Management company / service charge supplement",
        config.legalFees.managementCompanySupplement
      );
    }

    if (yes(form.tenanted)) {
      addItem(
        legalFees,
        "Tenanted property supplement",
        config.legalFees.tenantedPropertySupplement
      );
    }

    addItem(
      disbursements,
      "Office copy entries",
      config.disbursements.officeCopyEntries
    );
    addItem(disbursements, "ID checks", config.disbursements.idChecks);
  }

  if (type === "purchase") {
    const config = PRICE_CONFIG.purchase;

    addItem(legalFees, "Base legal fee", config.legalFees.baseLegalFee);

    if (tenure === "leasehold") {
      addItem(
        legalFees,
        "Leasehold supplement",
        config.legalFees.leaseholdSupplement
      );
    }

    if (form.mortgage === "mortgage") {
      addItem(
        legalFees,
        "Acting for lender supplement",
        config.legalFees.actingForLenderSupplement
      );
    }

    if (yes(form.giftedDeposit)) {
      addItem(
        legalFees,
        "Gifted deposit supplement",
        config.legalFees.giftedDepositSupplement
      );
    }

    if (yes(form.newBuild)) {
      addItem(
        legalFees,
        "New build supplement",
        config.legalFees.newBuildSupplement
      );
    }

    if (yes(form.sharedOwnership)) {
      addItem(
        legalFees,
        "Shared ownership supplement",
        config.legalFees.sharedOwnershipSupplement
      );
    }

    if (yes(form.helpToBuy)) {
      addItem(
        legalFees,
        "Help to Buy / scheme supplement",
        config.legalFees.helpToBuySupplement
      );
    }

    if (yes(form.isCompany)) {
      addItem(
        legalFees,
        "Company buyer supplement",
        config.legalFees.companyBuyerSupplement
      );
    }

    if (yes(form.buyToLet)) {
      addItem(
        legalFees,
        "Buy to let supplement",
        config.legalFees.buyToLetSupplement
      );
    }

    addItem(disbursements, "Search pack", config.disbursements.searchPack);
    addItem(
      disbursements,
      "Land Registry registration fee",
      config.disbursements.landRegistryRegistrationFee
    );
    addItem(disbursements, "ID checks", config.disbursements.idChecks);
    addItem(
      disbursements,
      "OS1 priority search",
      config.disbursements.os1PrioritySearch
    );
    addItem(
      disbursements,
      "Bankruptcy search",
      config.disbursements.bankruptcySearchPerName
    );
    addItem(
      disbursements,
      "SDLT submission fee",
      config.disbursements.sdltSubmissionFee
    );
    addItem(
      disbursements,
      "AP1 submission fee",
      config.disbursements.ap1SubmissionFee
    );
  }

  if (type === "remortgage") {
    const config = PRICE_CONFIG.remortgage;

    addItem(legalFees, "Base legal fee", config.legalFees.baseLegalFee);

    if (tenure === "leasehold") {
      addItem(
        legalFees,
        "Leasehold supplement",
        config.legalFees.leaseholdSupplement
      );
    }

    if (yes(form.additionalBorrowing)) {
      addItem(
        legalFees,
        "Additional borrowing supplement",
        config.legalFees.additionalBorrowingSupplement
      );
    }

    if (yes(form.remortgageTransfer)) {
      addItem(
        legalFees,
        "Transfer of equity supplement",
        config.legalFees.transferOfEquitySupplement
      );
    }

    addItem(
      disbursements,
      "Office copy entries",
      config.disbursements.officeCopyEntries
    );
    addItem(disbursements, "ID checks", config.disbursements.idChecks);
    addItem(
      disbursements,
      "OS1 priority search",
      config.disbursements.os1PrioritySearch
    );
    addItem(
      disbursements,
      "Bankruptcy search",
      config.disbursements.bankruptcySearchPerName
    );
    addItem(
      disbursements,
      "AP1 submission fee",
      config.disbursements.ap1SubmissionFee
    );
  }

  if (type === "transfer") {
    const config = PRICE_CONFIG.transfer;

    addItem(legalFees, "Base legal fee", config.legalFees.baseLegalFee);

    if (tenure === "leasehold") {
      addItem(
        legalFees,
        "Leasehold supplement",
        config.legalFees.leaseholdSupplement
      );
    }

    if (yes(form.transferMortgage)) {
      addItem(
        legalFees,
        "Mortgage supplement",
        config.legalFees.mortgageSupplement
      );
    }

    if (form.ownersChanging === "two" || form.ownersChanging === "more") {
      addItem(
        legalFees,
        "Additional owner change supplement",
        config.legalFees.additionalOwnerChangeSupplement
      );
    }

    addItem(
      disbursements,
      "Office copy entries",
      config.disbursements.officeCopyEntries
    );
    addItem(disbursements, "ID checks", config.disbursements.idChecks);
    addItem(
      disbursements,
      "Bankruptcy search",
      config.disbursements.bankruptcySearchPerName
    );
    addItem(
      disbursements,
      "AP1 submission fee",
      config.disbursements.ap1SubmissionFee
    );
  }

  const legalFeesExVat = sumItems(legalFees);
  const vat = Number((legalFeesExVat * VAT_RATE).toFixed(2));
  const legalTotalInclVat = Number((legalFeesExVat + vat).toFixed(2));
  const disbursementTotal = Number(sumItems(disbursements).toFixed(2));
  const grandTotal = Number((legalTotalInclVat + disbursementTotal).toFixed(2));

  const feeBreakdownLines: string[] = [];

  feeBreakdownLines.push("LEGAL FEES");
  legalFees.forEach((item) => {
    feeBreakdownLines.push(`${item.label}: £${formatMoney(item.amount)}`);
  });
  feeBreakdownLines.push(`VAT: £${formatMoney(vat)}`);
  feeBreakdownLines.push(
    `Total legal fees including VAT: £${formatMoney(legalTotalInclVat)}`
  );

  feeBreakdownLines.push("");
  feeBreakdownLines.push("DISBURSEMENTS");
  disbursements.forEach((item) => {
    feeBreakdownLines.push(`${item.label}: £${formatMoney(item.amount)}`);
  });
  feeBreakdownLines.push(
    `Total disbursements: £${formatMoney(disbursementTotal)}`
  );

  feeBreakdownLines.push("");
  feeBreakdownLines.push(
    `TOTAL ESTIMATED COST: £${formatMoney(grandTotal)}`
  );

  return {
    legalFees,
    disbursements,
    vat,
    legalFeesExVat,
    legalTotalInclVat,
    disbursementTotal,
    grandTotal,
    feeBreakdown: feeBreakdownLines.join("\n"),
  };
}
