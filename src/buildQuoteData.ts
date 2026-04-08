import { PRICE_CONFIG, VAT_RATE } from "./priceConfig";

type TransactionType =
  | "sale"
  | "purchase"
  | "remortgage"
  | "transfer"
  | "sale_purchase"
  | "remortgage_transfer";

type QuoteFormLike = {
  type: string;

  tenure?: string;
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
  numberOfSellers?: string;
  additionalBorrowing?: string;
  remortgageTransfer?: string;
  transferMortgage?: string;
  ownersChanging?: string;

  saleTenure?: string;
  salePrice?: string;
  salePostcode?: string;
  saleMortgageCombined?: string;
  managementCompanyCombined?: string;
  tenantedCombined?: string;
  numberOfSellersCombined?: string;

  purchaseTenure?: string;
  purchasePrice?: string;
  purchasePostcode?: string;
  purchaseMortgage?: string;
  purchaseOwnershipType?: string;
  purchaseFirstTimeBuyer?: string;
  purchaseNewBuild?: string;
  purchaseSharedOwnership?: string;
  purchaseHelpToBuy?: string;
  purchaseIsCompany?: string;
  purchaseBuyToLet?: string;
  purchaseGiftedDeposit?: string;
  purchaseAdditionalProperty?: string;
  purchaseUkResidentForSdlt?: string;

  remortgageTransferTenure?: string;
  remortgageTransferPrice?: string;
  remortgageTransferPostcode?: string;
  remortgageTransferCurrentLender?: string;
  remortgageTransferNewLender?: string;
  remortgageTransferAdditionalBorrowing?: string;
  remortgageTransferHasMortgage?: string;
  remortgageTransferOwnersChanging?: string;
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

const addItem = (items: QuoteItem[], label: string, amount: number, note?: string) => {
  if (amount > 0) {
    items.push(note ? { label, amount, note } : { label, amount });
  }
};

const sumItems = (items: QuoteItem[]) =>
  items.reduce((total, item) => total + item.amount, 0);

const getSellerCount = (value?: string) => {
  if (value === "2") return 2;
  if (value === "3") return 3;
  return 1;
};

const getBuyerCount = (ownershipType?: string) => {
  return ownershipType === "joint" ? 2 : 1;
};

function buildFeeBreakdownFromItems(
  legalFees: QuoteItem[],
  disbursements: QuoteItem[],
  vat: number,
  legalTotalInclVat: number,
  disbursementTotal: number,
  grandTotal: number,
  heading?: string,
  notes?: string[]
) {
  const lines: string[] = [];

  if (heading) {
    lines.push(heading);
    lines.push("");
  }

  lines.push("LEGAL FEES");
  legalFees.forEach((item) => {
    lines.push(`${item.label}: £${formatMoney(item.amount)}`);
  });
  lines.push(`VAT: £${formatMoney(vat)}`);
  lines.push(
    `Total legal fees including VAT: £${formatMoney(legalTotalInclVat)}`
  );

  lines.push("");
  lines.push("DISBURSEMENTS");
  disbursements.forEach((item) => {
    if (item.note) {
      lines.push(`${item.label}: £${formatMoney(item.amount)} (${item.note})`);
    } else {
      lines.push(`${item.label}: £${formatMoney(item.amount)}`);
    }
  });
  lines.push(`Total disbursements: £${formatMoney(disbursementTotal)}`);

  lines.push("");
  lines.push(`TOTAL ESTIMATED COST: £${formatMoney(grandTotal)}`);

  if (notes && notes.length > 0) {
    lines.push("");
    lines.push("IMPORTANT NOTES");
    notes.forEach((note) => lines.push(note));
  }

  return lines.join("\n");
}

function finaliseQuote(
  legalFees: QuoteItem[],
  disbursements: QuoteItem[],
  heading?: string,
  notes?: string[]
): BuiltQuoteData {
  const legalFeesExVat = Number(sumItems(legalFees).toFixed(2));
  const vat = Number((legalFeesExVat * VAT_RATE).toFixed(2));
  const legalTotalInclVat = Number((legalFeesExVat + vat).toFixed(2));
  const disbursementTotal = Number(sumItems(disbursements).toFixed(2));
  const grandTotal = Number((legalTotalInclVat + disbursementTotal).toFixed(2));

  return {
    legalFees,
    disbursements,
    vat,
    legalFeesExVat,
    legalTotalInclVat,
    disbursementTotal,
    grandTotal,
    feeBreakdown: buildFeeBreakdownFromItems(
      legalFees,
      disbursements,
      vat,
      legalTotalInclVat,
      disbursementTotal,
      grandTotal,
      heading,
      notes
    ),
  };
}

/**
 * SINGLE TRANSACTION BUILDERS
 */
function buildSaleQuote(input: {
  tenure?: string;
  saleMortgage?: string;
  managementCompany?: string;
  tenanted?: string;
  numberOfSellers?: string;
}): BuiltQuoteData {
  const config = PRICE_CONFIG.sale;
  const legalFees: QuoteItem[] = [];
  const disbursements: QuoteItem[] = [];

  const sellerCount = getSellerCount(input.numberOfSellers);
  const idCheckAmount = config.disbursements.idChecks * sellerCount;

  addItem(legalFees, "Sale legal fee", config.legalFees.baseLegalFee);

  if (input.tenure === "leasehold") {
    addItem(
      legalFees,
      "Sale leasehold supplement",
      config.legalFees.leaseholdSupplement
    );
  }

  if (yes(input.saleMortgage)) {
    addItem(
      legalFees,
      "Mortgage redemption",
      config.legalFees.mortgageRedemptionSupplement
    );
  }

  if (yes(input.managementCompany)) {
    addItem(
      legalFees,
      "Management company",
      config.legalFees.managementCompanySupplement
    );
  }

  if (yes(input.tenanted)) {
    addItem(
      legalFees,
      "Tenanted property",
      config.legalFees.tenantedPropertySupplement
    );
  }

  addItem(
    disbursements,
    "Office copy entries",
    config.disbursements.officeCopyEntries
  );
  addItem(disbursements, `ID checks (${sellerCount})`, idCheckAmount);

  return finaliseQuote(legalFees, disbursements);
}

function buildPurchaseQuote(input: {
  tenure?: string;
  mortgage?: string;
  giftedDeposit?: string;
  newBuild?: string;
  sharedOwnership?: string;
  helpToBuy?: string;
  isCompany?: string;
  buyToLet?: string;
  ownershipType?: string;
  includeIdChecks?: boolean;
  includeBankruptcySearches?: boolean;
}): BuiltQuoteData {
  const config = PRICE_CONFIG.purchase;
  const legalFees: QuoteItem[] = [];
  const disbursements: QuoteItem[] = [];

  const buyerCount = getBuyerCount(input.ownershipType);

  addItem(legalFees, "Purchase legal fee", config.legalFees.baseLegalFee);

  if (input.tenure === "leasehold") {
    addItem(
      legalFees,
      "Purchase leasehold supplement",
      config.legalFees.leaseholdSupplement
    );
  }

  if (input.mortgage === "mortgage") {
    addItem(
      legalFees,
      "Acting for lender",
      config.legalFees.actingForLenderSupplement
    );
  }

  if (yes(input.giftedDeposit)) {
    addItem(
      legalFees,
      "Gifted deposit",
      config.legalFees.giftedDepositSupplement
    );
  }

  if (yes(input.newBuild)) {
    addItem(legalFees, "New build", config.legalFees.newBuildSupplement);
  }

  if (yes(input.sharedOwnership)) {
    addItem(
      legalFees,
      "Shared ownership",
      config.legalFees.sharedOwnershipSupplement
    );
  }

  if (yes(input.helpToBuy)) {
    addItem(legalFees, "Help to Buy", config.legalFees.helpToBuySupplement);
  }

  if (yes(input.isCompany)) {
    addItem(
      legalFees,
      "Company buyer",
      config.legalFees.companyBuyerSupplement
    );
  }

  if (yes(input.buyToLet)) {
    addItem(legalFees, "Buy to let", config.legalFees.buyToLetSupplement);
  }

  addItem(disbursements, "Search pack", config.disbursements.searchPack);
  addItem(
    disbursements,
    "Land Registry fee",
    config.disbursements.landRegistryRegistrationFee
  );

  if (input.includeIdChecks !== false) {
    addItem(
      disbursements,
      `ID checks (${buyerCount})`,
      config.disbursements.idChecks * buyerCount
    );
  }

  addItem(
    disbursements,
    "OS1 search",
    config.disbursements.os1PrioritySearch
  );

  if (input.includeBankruptcySearches !== false && input.mortgage === "mortgage") {
    addItem(
      disbursements,
      `Bankruptcy search (${buyerCount})`,
      config.disbursements.bankruptcySearchPerName * buyerCount
    );
  }

  addItem(
    disbursements,
    "SDLT submission",
    config.disbursements.sdltSubmissionFee
  );
  addItem(
    disbursements,
    "AP1 submission",
    config.disbursements.ap1SubmissionFee
  );

  return finaliseQuote(legalFees, disbursements);
}

function buildRemortgageQuote(input: {
  tenure?: string;
  additionalBorrowing?: string;
  remortgageTransfer?: string;
  includeIdChecks?: boolean;
  includeBankruptcySearches?: boolean;
}): BuiltQuoteData {
  const config = PRICE_CONFIG.remortgage;
  const legalFees: QuoteItem[] = [];
  const disbursements: QuoteItem[] = [];

  addItem(legalFees, "Remortgage legal fee", config.legalFees.baseLegalFee);

  if (input.tenure === "leasehold") {
    addItem(
      legalFees,
      "Leasehold supplement",
      config.legalFees.leaseholdSupplement
    );
  }

  if (yes(input.additionalBorrowing)) {
    addItem(
      legalFees,
      "Additional borrowing",
      config.legalFees.additionalBorrowingSupplement
    );
  }

  if (yes(input.remortgageTransfer)) {
    addItem(
      legalFees,
      "Transfer of equity",
      config.legalFees.transferOfEquitySupplement
    );
  }

  addItem(
    disbursements,
    "Office copy entries",
    config.disbursements.officeCopyEntries
  );

  if (input.includeIdChecks !== false) {
    addItem(disbursements, "ID checks", config.disbursements.idChecks);
  }

  addItem(
    disbursements,
    "OS1 search",
    config.disbursements.os1PrioritySearch
  );

  if (input.includeBankruptcySearches !== false) {
    addItem(
      disbursements,
      "Bankruptcy search",
      config.disbursements.bankruptcySearchPerName
    );
  }

  addItem(
    disbursements,
    "AP1 submission",
    config.disbursements.ap1SubmissionFee
  );

  return finaliseQuote(legalFees, disbursements);
}

function buildTransferQuote(input: {
  tenure?: string;
  transferMortgage?: string;
  ownersChanging?: string;
  includeIdChecks?: boolean;
  includeBankruptcySearches?: boolean;
}): BuiltQuoteData {
  const config = PRICE_CONFIG.transfer;
  const legalFees: QuoteItem[] = [];
  const disbursements: QuoteItem[] = [];

  addItem(legalFees, "Transfer legal fee", config.legalFees.baseLegalFee);

  if (input.tenure === "leasehold") {
    addItem(
      legalFees,
      "Leasehold supplement",
      config.legalFees.leaseholdSupplement
    );
  }

  if (yes(input.transferMortgage)) {
    addItem(
      legalFees,
      "Mortgage supplement",
      config.legalFees.mortgageSupplement
    );
  }

  if (input.ownersChanging === "two" || input.ownersChanging === "more") {
    addItem(
      legalFees,
      "Additional owner change",
      config.legalFees.additionalOwnerChangeSupplement
    );
  }

  addItem(
    disbursements,
    "Office copy entries",
    config.disbursements.officeCopyEntries
  );

  if (input.includeIdChecks !== false) {
    addItem(disbursements, "ID checks", config.disbursements.idChecks);
  }

  if (input.includeBankruptcySearches !== false && yes(input.transferMortgage)) {
    addItem(
      disbursements,
      "Bankruptcy search",
      config.disbursements.bankruptcySearchPerName
    );
  }

  addItem(
    disbursements,
    "AP1 submission",
    config.disbursements.ap1SubmissionFee
  );

  return finaliseQuote(legalFees, disbursements);
}

function mergeDisbursements(items: QuoteItem[]): QuoteItem[] {
  const map = new Map<string, QuoteItem>();

  for (const item of items) {
    const existing = map.get(item.label);

    if (!existing) {
      map.set(item.label, { ...item });
      continue;
    }

    existing.amount += item.amount;
  }

  return Array.from(map.values());
}

function mergeQuotes(
  title: string,
  a: BuiltQuoteData,
  b: BuiltQuoteData,
  notes?: string[]
): BuiltQuoteData {
  const legalFees = [...a.legalFees, ...b.legalFees];
  const disbursements = mergeDisbursements([
    ...a.disbursements,
    ...b.disbursements,
  ]);

  return finaliseQuote(legalFees, disbursements, title, notes);
}

/**
 * MAIN BUILDER
 */
export function buildQuoteData(form: QuoteFormLike): BuiltQuoteData {
  const type = form.type as TransactionType;

  if (type === "sale") {
    return buildSaleQuote({
      tenure: form.tenure,
      saleMortgage: form.saleMortgage,
      managementCompany: form.managementCompany,
      tenanted: form.tenanted,
      numberOfSellers: form.numberOfSellers,
    });
  }

  if (type === "purchase") {
    return buildPurchaseQuote({
      tenure: form.tenure,
      mortgage: form.mortgage,
      ownershipType: form.ownershipType,
      giftedDeposit: form.giftedDeposit,
      newBuild: form.newBuild,
      sharedOwnership: form.sharedOwnership,
      helpToBuy: form.helpToBuy,
      isCompany: form.isCompany,
      buyToLet: form.buyToLet,
    });
  }

  if (type === "remortgage") {
    return buildRemortgageQuote({
      tenure: form.tenure,
      additionalBorrowing: form.additionalBorrowing,
      remortgageTransfer: form.remortgageTransfer,
    });
  }

  if (type === "transfer") {
    return buildTransferQuote({
      tenure: form.tenure,
      transferMortgage: form.transferMortgage,
      ownersChanging: form.ownersChanging,
    });
  }

  if (type === "sale_purchase") {
    const sale = buildSaleQuote({
      tenure: form.saleTenure,
      saleMortgage: form.saleMortgageCombined,
      managementCompany: form.managementCompanyCombined,
      tenanted: form.tenantedCombined,
      numberOfSellers: form.numberOfSellersCombined,
    });

    const purchase = buildPurchaseQuote({
      tenure: form.purchaseTenure,
      mortgage: form.purchaseMortgage,
      ownershipType: form.purchaseOwnershipType,
      giftedDeposit: form.purchaseGiftedDeposit,
      newBuild: form.purchaseNewBuild,
      sharedOwnership: form.purchaseSharedOwnership,
      helpToBuy: form.purchaseHelpToBuy,
      isCompany: form.purchaseIsCompany,
      buyToLet: form.purchaseBuyToLet,
    });

    return mergeQuotes("SALE & PURCHASE", sale, purchase, [
      "This combined estimate includes the sale and purchase legal work only.",
      "SDLT is not included in this pricing file and should be shown separately after SDLT calculation/review.",
      "ID checks are priced by party count and matter type, but linked-matter duplication may still need final solicitor review.",
    ]);
  }

  if (type === "remortgage_transfer") {
    const remortgage = buildRemortgageQuote({
      tenure: form.remortgageTransferTenure,
      additionalBorrowing: form.remortgageTransferAdditionalBorrowing,
      remortgageTransfer: "yes",
      includeIdChecks: true,
      includeBankruptcySearches: true,
    });

    const transfer = buildTransferQuote({
      tenure: form.remortgageTransferTenure,
      transferMortgage: form.remortgageTransferHasMortgage,
      ownersChanging: form.remortgageTransferOwnersChanging,
      includeIdChecks: false,
      includeBankruptcySearches: false,
    });

    return mergeQuotes("REMORTGAGE & TRANSFER OF EQUITY", remortgage, transfer, [
      "This combined estimate is for a remortgage and transfer of equity on the same property.",
      "Duplicate ID checks and duplicate bankruptcy searches have been suppressed for the transfer element.",
    ]);
  }

  return finaliseQuote([], [], "QUOTE NOT AVAILABLE", [
    "The selected matter type is not yet configured.",
  ]);
}
