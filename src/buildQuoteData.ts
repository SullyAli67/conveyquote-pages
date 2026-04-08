import { PRICE_CONFIG, VAT_RATE } from "./priceConfig";

type TransactionType =
  | "sale"
  | "purchase"
  | "remortgage"
  | "transfer"
  | "sale_purchase"
  | "remortgage_purchase";

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
  numberOfSellers?: string;
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

const getSellerCount = (value?: string) => {
  if (value === "2") return 2;
  if (value === "3") return 3;
  return 1;
};

/**
 * 🔹 CORE SINGLE TRANSACTION BUILDER
 */
function buildSingleQuote(
  form: QuoteFormLike,
  overrideType?: TransactionType
): BuiltQuoteData {
  const type = (overrideType || form.type) as TransactionType;
  const tenure = form.tenure;

  const legalFees: QuoteItem[] = [];
  const disbursements: QuoteItem[] = [];

  // ===== SALE =====
  if (type === "sale") {
    const config = PRICE_CONFIG.sale;
    const sellerCount = getSellerCount(form.numberOfSellers);
    const idCheckAmount = config.disbursements.idChecks * sellerCount;

    addItem(legalFees, "Sale legal fee", config.legalFees.baseLegalFee);

    if (tenure === "leasehold") {
      addItem(
        legalFees,
        "Sale leasehold supplement",
        config.legalFees.leaseholdSupplement
      );
    }

    if (yes(form.saleMortgage)) {
      addItem(
        legalFees,
        "Mortgage redemption",
        config.legalFees.mortgageRedemptionSupplement
      );
    }

    if (yes(form.managementCompany)) {
      addItem(
        legalFees,
        "Management company",
        config.legalFees.managementCompanySupplement
      );
    }

    if (yes(form.tenanted)) {
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

    addItem(
      disbursements,
      `ID checks (${sellerCount})`,
      idCheckAmount
    );
  }

  // ===== PURCHASE =====
  if (type === "purchase") {
    const config = PRICE_CONFIG.purchase;

    addItem(legalFees, "Purchase legal fee", config.legalFees.baseLegalFee);

    if (tenure === "leasehold") {
      addItem(
        legalFees,
        "Purchase leasehold supplement",
        config.legalFees.leaseholdSupplement
      );
    }

    if (form.mortgage === "mortgage") {
      addItem(
        legalFees,
        "Acting for lender",
        config.legalFees.actingForLenderSupplement
      );
    }

    if (yes(form.giftedDeposit)) {
      addItem(
        legalFees,
        "Gifted deposit",
        config.legalFees.giftedDepositSupplement
      );
    }

    if (yes(form.newBuild)) {
      addItem(
        legalFees,
        "New build",
        config.legalFees.newBuildSupplement
      );
    }

    if (yes(form.sharedOwnership)) {
      addItem(
        legalFees,
        "Shared ownership",
        config.legalFees.sharedOwnershipSupplement
      );
    }

    if (yes(form.helpToBuy)) {
      addItem(
        legalFees,
        "Help to Buy",
        config.legalFees.helpToBuySupplement
      );
    }

    if (yes(form.isCompany)) {
      addItem(
        legalFees,
        "Company buyer",
        config.legalFees.companyBuyerSupplement
      );
    }

    if (yes(form.buyToLet)) {
      addItem(
        legalFees,
        "Buy to let",
        config.legalFees.buyToLetSupplement
      );
    }

    addItem(disbursements, "Search pack", config.disbursements.searchPack);
    addItem(
      disbursements,
      "Land Registry fee",
      config.disbursements.landRegistryRegistrationFee
    );
    addItem(disbursements, "ID checks", config.disbursements.idChecks);
    addItem(
      disbursements,
      "OS1 search",
      config.disbursements.os1PrioritySearch
    );
    addItem(
      disbursements,
      "Bankruptcy search",
      config.disbursements.bankruptcySearchPerName
    );
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
  }

  // ===== REMORTGAGE =====
  if (type === "remortgage") {
    const config = PRICE_CONFIG.remortgage;

    addItem(legalFees, "Remortgage legal fee", config.legalFees.baseLegalFee);

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
        "Additional borrowing",
        config.legalFees.additionalBorrowingSupplement
      );
    }

    if (yes(form.remortgageTransfer)) {
      addItem(
        legalFees,
        "Transfer of equity",
        config.legalFees.transferOfEquitySupplement
      );
    }

    addItem(disbursements, "Office copy", config.disbursements.officeCopyEntries);
    addItem(disbursements, "ID checks", config.disbursements.idChecks);
  }

  // ===== TOTALS =====
  const legalFeesExVat = sumItems(legalFees);
  const vat = Number((legalFeesExVat * VAT_RATE).toFixed(2));
  const legalTotalInclVat = legalFeesExVat + vat;
  const disbursementTotal = sumItems(disbursements);
  const grandTotal = legalTotalInclVat + disbursementTotal;

  return {
    legalFees,
    disbursements,
    vat,
    legalFeesExVat,
    legalTotalInclVat,
    disbursementTotal,
    grandTotal,
    feeBreakdown: "",
  };
}

/**
 * 🔥 MAIN ENTRY — SUPPORTS COMBINATIONS
 */
export function buildQuoteData(form: QuoteFormLike): BuiltQuoteData {
  const type = form.type as TransactionType;

  // ===== COMBINED: SALE + PURCHASE =====
  if (type === "sale_purchase") {
    const sale = buildSingleQuote(form, "sale");
    const purchase = buildSingleQuote(form, "purchase");

    return mergeQuotes("SALE & PURCHASE", sale, purchase);
  }

  // ===== COMBINED: REMORTGAGE + PURCHASE =====
  if (type === "remortgage_purchase") {
    const remortgage = buildSingleQuote(form, "remortgage");
    const purchase = buildSingleQuote(form, "purchase");

    return mergeQuotes("REMORTGAGE & PURCHASE", remortgage, purchase);
  }

  // ===== NORMAL =====
  return buildSingleQuote(form);
}

/**
 * 🔥 MERGE LOGIC (THIS IS THE MAGIC)
 */
function mergeQuotes(
  title: string,
  a: BuiltQuoteData,
  b: BuiltQuoteData
): BuiltQuoteData {
  const legalFees = [...a.legalFees, ...b.legalFees];
  const disbursements = [...a.disbursements, ...b.disbursements];

  const legalFeesExVat = sumItems(legalFees);
  const vat = Number((legalFeesExVat * VAT_RATE).toFixed(2));
  const legalTotalInclVat = legalFeesExVat + vat;
  const disbursementTotal = sumItems(disbursements);
  const grandTotal = legalTotalInclVat + disbursementTotal;

  const lines: string[] = [];

  lines.push(title);
  lines.push("");

  lines.push("LEGAL FEES");
  legalFees.forEach((i) =>
    lines.push(`${i.label}: £${formatMoney(i.amount)}`)
  );

  lines.push(`VAT: £${formatMoney(vat)}`);
  lines.push(
    `Total legal fees including VAT: £${formatMoney(legalTotalInclVat)}`
  );

  lines.push("");
  lines.push("DISBURSEMENTS");
  disbursements.forEach((i) =>
    lines.push(`${i.label}: £${formatMoney(i.amount)}`)
  );

  lines.push(
    `Total disbursements: £${formatMoney(disbursementTotal)}`
  );

  lines.push("");
  lines.push(`TOTAL ESTIMATED COST: £${formatMoney(grandTotal)}`);

  return {
    legalFees,
    disbursements,
    vat,
    legalFeesExVat,
    legalTotalInclVat,
    disbursementTotal,
    grandTotal,
    feeBreakdown: lines.join("\n"),
  };
}
