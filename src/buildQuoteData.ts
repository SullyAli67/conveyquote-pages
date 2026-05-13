import {
  PRICE_CONFIG,
  VAT_RATE,
  getPurchaseBaseFee,
  getSaleBaseFee,
  getRemortgageBaseFee,
  getTransferBaseFee,
  getBespokeNote,
} from "./priceConfig";
import {
  getOfficeCopyEntriesAmount,
  getLandRegistryFee,
} from "../functions/lib/disbursement-constants.js";

type TransactionType =
  | "sale"
  | "purchase"
  | "remortgage"
  | "transfer"
  | "sale_purchase"
  | "remortgage_transfer";

type QuoteFormLike = {
  type: string;
  price?: string;
  tenure?: string;
  mortgage?: string;
  ownershipType?: string;
  firstTimeBuyer?: string;
  additionalProperty?: string;
  ukResidentForSdlt?: string;
  giftedDeposit?: string;
  newBuild?: string;
  sharedOwnership?: string;
  helpToBuy?: string;
  isCompany?: string;
  buyToLet?: string;
  lifetimeIsa?: string;

  saleMortgage?: string;
  managementCompany?: string;
  tenanted?: string;
  numberOfSellers?: string;

  additionalBorrowing?: string;
  remortgageTransfer?: string;
  mortgageAmount?: string;

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
  purchaseLifetimeIsa?: string;

  remortgageTransferTenure?: string;
  remortgageTransferPrice?: string;
  remortgageTransferPostcode?: string;
  remortgageTransferCurrentLender?: string;
  remortgageTransferNewLender?: string;
  remortgageTransferAdditionalBorrowing?: string;
  remortgageTransferHasMortgage?: string;
  remortgageTransferOwnersChanging?: string;
  remortgageTransferOwnershipType?: string;
  remortgageTransferMortgageAmount?: string;
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
  sdltAmount?: number;
  sdltNote?: string;
  totalIncludingSdlt?: number;
  feeBreakdown: string;
};

const yes = (value?: string) => value === "yes";

const formatMoney = (value: number) => value.toFixed(2);

const addItem = (
  items: QuoteItem[],
  label: string,
  amount: number,
  note?: string
) => {
  if (amount > 0) {
    items.push(note ? { label, amount, note } : { label, amount });
  }
};

const sumItems = (items: QuoteItem[]) =>
  items.reduce((total, item) => total + item.amount, 0);

const toNumber = (value?: string) => {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const getSellerCount = (value?: string) => {
  if (value === "2") return 2;
  if (value === "3") return 3;
  return 1;
};

const getBuyerCount = (ownershipType?: string) => {
  return ownershipType === "joint" ? 2 : 1;
};

const getOwnersChangingCount = (value?: string) => {
  if (value === "two") return 2;
  if (value === "more") return 3;
  return 1;
};

function calculateStandardResidentialSdlt(price: number) {
  if (price <= 250000) return 0;
  if (price <= 925000) return (price - 250000) * 0.05;
  if (price <= 1500000) {
    return (925000 - 250000) * 0.05 + (price - 925000) * 0.1;
  }
  return (
    (925000 - 250000) * 0.05 +
    (1500000 - 925000) * 0.1 +
    (price - 1500000) * 0.12
  );
}

function calculateFirstTimeBuyerSdlt(price: number) {
  if (price > 625000) {
    return calculateStandardResidentialSdlt(price);
  }
  if (price <= 425000) {
    return 0;
  }
  return (price - 425000) * 0.05;
}

function getSdltResult(input: {
  price?: string;
  firstTimeBuyer?: string;
  additionalProperty?: string;
  ukResidentForSdlt?: string;
  isCompany?: string;
  sharedOwnership?: string;
  helpToBuy?: string;
}) {
  const price = toNumber(input.price);

  if (!price) {
    return { sdltNote: "SDLT subject to review" as string };
  }

  if (yes(input.isCompany) || yes(input.sharedOwnership) || yes(input.helpToBuy)) {
    return { sdltNote: "SDLT subject to review" as string };
  }

  let sdlt = yes(input.firstTimeBuyer)
    ? calculateFirstTimeBuyerSdlt(price)
    : calculateStandardResidentialSdlt(price);

  if (yes(input.additionalProperty)) {
    sdlt += price * 0.05;
  }

  if (input.ukResidentForSdlt === "no") {
    sdlt += price * 0.02;
  }

  return { sdltAmount: Number(sdlt.toFixed(2)) };
}

function buildFeeBreakdownFromItems(
  legalFees: QuoteItem[],
  disbursements: QuoteItem[],
  vat: number,
  legalTotalInclVat: number,
  disbursementTotal: number,
  grandTotal: number,
  sdltAmount?: number,
  sdltNote?: string,
  totalIncludingSdlt?: number,
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

  if (typeof sdltAmount === "number") {
    lines.push(`Estimated SDLT: £${formatMoney(sdltAmount)}`);
  } else if (sdltNote) {
    lines.push(`SDLT: ${sdltNote}`);
  }

  if (typeof totalIncludingSdlt === "number") {
    lines.push(`TOTAL INCLUDING SDLT: £${formatMoney(totalIncludingSdlt)}`);
  }

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
  notes?: string[],
  sdltAmount?: number,
  sdltNote?: string
): BuiltQuoteData {
  const legalFeesExVat = Number(sumItems(legalFees).toFixed(2));
  const vat = Number((legalFeesExVat * VAT_RATE).toFixed(2));
  const legalTotalInclVat = Number((legalFeesExVat + vat).toFixed(2));
  const disbursementTotal = Number(sumItems(disbursements).toFixed(2));
  const grandTotal = Number((legalTotalInclVat + disbursementTotal).toFixed(2));

  const totalIncludingSdlt =
    typeof sdltAmount === "number"
      ? Number((grandTotal + sdltAmount).toFixed(2))
      : undefined;

  return {
    legalFees,
    disbursements,
    vat,
    legalFeesExVat,
    legalTotalInclVat,
    disbursementTotal,
    grandTotal,
    sdltAmount,
    sdltNote,
    totalIncludingSdlt,
    feeBreakdown: buildFeeBreakdownFromItems(
      legalFees,
      disbursements,
      vat,
      legalTotalInclVat,
      disbursementTotal,
      grandTotal,
      sdltAmount,
      sdltNote,
      totalIncludingSdlt,
      heading,
      notes
    ),
  };
}

function buildSaleQuote(
  input: {
    price?: string;
    tenure?: string;
    saleMortgage?: string;
    managementCompany?: string;
    tenanted?: string;
    numberOfSellers?: string;
  },
  options: { omitOfficeCopies?: boolean } = {}
): BuiltQuoteData {
  const config = PRICE_CONFIG.sale;
  const legalFees: QuoteItem[] = [];
  const disbursements: QuoteItem[] = [];

  const sellerCount = getSellerCount(input.numberOfSellers);
  const price = toNumber(input.price);

  addItem(legalFees, "Sale legal fee", getSaleBaseFee(price));

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
    addItem(
      legalFees,
      "Telegraphic transfer fee - lender redemption",
      config.legalFees.telegraphicTransferFee
    );
    addItem(
      legalFees,
      "Telegraphic transfer fee - balance to client",
      config.legalFees.telegraphicTransferFee
    );
  } else {
    // No mortgage: still need 1x TT to send net proceeds to the seller
    addItem(
      legalFees,
      "Telegraphic transfer fee",
      config.legalFees.telegraphicTransferFee
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

  // Office copy entries: tenure-based estimate. Skipped when this helper
  // is the sale leg of a combined sale_purchase (purchase leg's tenure
  // drives the single line in combined matters).
  if (!options.omitOfficeCopies) {
    addItem(
      disbursements,
      "Office copy entries",
      getOfficeCopyEntriesAmount(input.tenure || "")
    );
  }
  addItem(
    disbursements,
    `ID checks (${sellerCount})`,
    config.disbursements.idChecks * sellerCount
  );

  const bespoke = getBespokeNote(price);

  return finaliseQuote(
    legalFees,
    disbursements,
    undefined,
    bespoke ? [bespoke] : undefined
  );
}

function buildPurchaseQuote(
  input: {
    price?: string;
    tenure?: string;
    mortgage?: string;
    ownershipType?: string;
    firstTimeBuyer?: string;
    additionalProperty?: string;
    ukResidentForSdlt?: string;
    giftedDeposit?: string;
    newBuild?: string;
    sharedOwnership?: string;
    helpToBuy?: string;
    isCompany?: string;
    buyToLet?: string;
    lifetimeIsa?: string;
  },
  options: { omitOfficeCopies?: boolean } = {}
): BuiltQuoteData {
  const config = PRICE_CONFIG.purchase;
  const legalFees: QuoteItem[] = [];
  const disbursements: QuoteItem[] = [];

  const buyerCount = getBuyerCount(input.ownershipType);
  const price = toNumber(input.price);

  addItem(legalFees, "Purchase legal fee", getPurchaseBaseFee(price));

  if (input.tenure === "leasehold") {
    addItem(
      legalFees,
      "Purchase leasehold supplement",
      config.legalFees.leaseholdSupplement
    );
  }

  // TT fee applies to all purchases (funds are transferred at completion regardless of mortgage)
  addItem(
    legalFees,
    "Telegraphic transfer fee - completion funds",
    config.legalFees.telegraphicTransferFee
  );

  // Acting for lender is ONLY added when the buyer has a mortgage
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

  if (yes(input.lifetimeIsa)) {
    addItem(
      legalFees,
      "Lifetime ISA fee",
      config.legalFees.lifetimeIsaSupplement
    );
  }

  addItem(disbursements, "Search pack", config.disbursements.searchPack);
  // HMLR Scale 1 sliding scale, no VAT. Shared source of truth in
  // functions/lib/disbursement-constants.js.
  addItem(
    disbursements,
    "Land Registry fee",
    getLandRegistryFee({
      transactionType: "purchase",
      purchasePrice: toNumber(input.price),
    })
  );
  addItem(
    disbursements,
    `ID checks (${buyerCount})`,
    config.disbursements.idChecks * buyerCount
  );
  addItem(
    disbursements,
    "OS1 search",
    config.disbursements.os1PrioritySearch
  );

  // Bankruptcy search is required on ALL purchases (cash or mortgage)
  addItem(
    disbursements,
    `Bankruptcy search (${buyerCount})`,
    config.disbursements.bankruptcySearchPerName * buyerCount
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

  // Office copy entries: tenure-based estimate. The buyer's solicitor
  // needs title copies for the new charge / registration. Single line
  // per matter. Skipped when this helper is called as a leg of a
  // combined sale_purchase — the dispatcher decides which leg's tenure
  // governs the single combined line.
  if (!options.omitOfficeCopies) {
    addItem(
      disbursements,
      "Office copy entries",
      getOfficeCopyEntriesAmount(input.tenure || "")
    );
  }

  const sdlt = getSdltResult({
    price: undefined,
    firstTimeBuyer: input.firstTimeBuyer,
    additionalProperty: input.additionalProperty,
    ukResidentForSdlt: input.ukResidentForSdlt,
    isCompany: input.isCompany,
    sharedOwnership: input.sharedOwnership,
    helpToBuy: input.helpToBuy,
  });

  return finaliseQuote(
    legalFees,
    disbursements,
    undefined,
    undefined,
    sdlt.sdltAmount,
    sdlt.sdltNote
  );
}

function buildPurchaseQuoteWithPrice(
  input: {
    price?: string;
    tenure?: string;
    mortgage?: string;
    ownershipType?: string;
    firstTimeBuyer?: string;
    additionalProperty?: string;
    ukResidentForSdlt?: string;
    giftedDeposit?: string;
    newBuild?: string;
    sharedOwnership?: string;
    helpToBuy?: string;
    isCompany?: string;
    buyToLet?: string;
    lifetimeIsa?: string;
  },
  options: { omitOfficeCopies?: boolean } = {}
): BuiltQuoteData {
  const base = buildPurchaseQuote(input, options);
  const sdlt = getSdltResult({
    price: input.price,
    firstTimeBuyer: input.firstTimeBuyer,
    additionalProperty: input.additionalProperty,
    ukResidentForSdlt: input.ukResidentForSdlt,
    isCompany: input.isCompany,
    sharedOwnership: input.sharedOwnership,
    helpToBuy: input.helpToBuy,
  });

  const bespoke = getBespokeNote(toNumber(input.price));

  return finaliseQuote(
    base.legalFees,
    base.disbursements,
    undefined,
    bespoke ? [bespoke] : undefined,
    sdlt.sdltAmount,
    sdlt.sdltNote
  );
}

function buildRemortgageQuote(
  input: {
    price?: string;
    tenure?: string;
    additionalBorrowing?: string;
    remortgageTransfer?: string;
    ownershipType?: string;
    mortgageAmount?: string;
  },
  options: { omitOfficeCopies?: boolean; omitLandRegistryFee?: boolean } = {}
): BuiltQuoteData {
  const config = PRICE_CONFIG.remortgage;
  const legalFees: QuoteItem[] = [];
  const disbursements: QuoteItem[] = [];

  const partyCount = getBuyerCount(input.ownershipType);
  const propertyValue = toNumber(input.price);

  addItem(legalFees, "Remortgage legal fee", getRemortgageBaseFee(propertyValue));

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
    legalFees,
    "Telegraphic transfer fee - remortgage advance",
    config.legalFees.telegraphicTransferFee
  );

  // Office copy entries: tenure-based estimate. In a combined
  // remortgage_transfer matter, the transfer leg omits its own office
  // copies so the line appears exactly once (remortgage leg owns it).
  if (!options.omitOfficeCopies) {
    addItem(
      disbursements,
      "Office copy entries",
      getOfficeCopyEntriesAmount(input.tenure || "")
    );
  }
  // HMLR Scale 2 on the new mortgage advance. In a combined
  // remortgage_transfer matter, the LR fee comes from the combined
  // dispatcher path (one fee, max of two scenarios), so this leg
  // omits its own line in that case.
  if (!options.omitLandRegistryFee) {
    addItem(
      disbursements,
      "Land Registry fee",
      getLandRegistryFee({
        transactionType: "remortgage",
        mortgageAmount: toNumber(input.mortgageAmount),
      })
    );
  }
  addItem(
    disbursements,
    `ID checks (${partyCount})`,
    config.disbursements.idChecks * partyCount
  );
  addItem(
    disbursements,
    "OS1 search",
    config.disbursements.os1PrioritySearch
  );
  addItem(
    disbursements,
    `Bankruptcy search (${partyCount})`,
    config.disbursements.bankruptcySearchPerName * partyCount
  );
  addItem(
    disbursements,
    "AP1 submission",
    config.disbursements.ap1SubmissionFee
  );

  const bespoke = getBespokeNote(propertyValue);

  return finaliseQuote(
    legalFees,
    disbursements,
    undefined,
    bespoke ? [bespoke] : undefined
  );
}

function buildTransferQuote(
  input: {
    price?: string;
    tenure?: string;
    transferMortgage?: string;
    ownersChanging?: string;
  },
  options: { omitOfficeCopies?: boolean; omitLandRegistryFee?: boolean } = {}
): BuiltQuoteData {
  const config = PRICE_CONFIG.transfer;
  const legalFees: QuoteItem[] = [];
  const disbursements: QuoteItem[] = [];

  const partyCount = getOwnersChangingCount(input.ownersChanging);
  const propertyValue = toNumber(input.price);

  addItem(legalFees, "Transfer legal fee", getTransferBaseFee(propertyValue));

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
    addItem(
      legalFees,
      "Telegraphic transfer fee - transfer completion",
      config.legalFees.telegraphicTransferFee
    );
  }

  if (input.ownersChanging === "two" || input.ownersChanging === "more") {
    addItem(
      legalFees,
      "Additional owner change",
      config.legalFees.additionalOwnerChangeSupplement
    );
  }

  // Office copy entries: tenure-based estimate. In a combined
  // remortgage_transfer matter, this leg's office copies are skipped so
  // the line appears exactly once (remortgage leg owns it).
  if (!options.omitOfficeCopies) {
    addItem(
      disbursements,
      "Office copy entries",
      getOfficeCopyEntriesAmount(input.tenure || "")
    );
  }
  // HMLR Scale 2 on property value. In a combined remortgage_transfer
  // matter, the combined dispatcher path takes the max-of-two — this
  // leg therefore omits its own LR line in that case.
  if (!options.omitLandRegistryFee) {
    addItem(
      disbursements,
      "Land Registry fee",
      getLandRegistryFee({
        transactionType: "transfer",
        propertyValue,
      })
    );
  }
  addItem(
    disbursements,
    `ID checks (${partyCount})`,
    config.disbursements.idChecks * partyCount
  );

  // Bankruptcy search is required on ALL transfers of equity
  addItem(
    disbursements,
    `Bankruptcy search (${partyCount})`,
    config.disbursements.bankruptcySearchPerName * partyCount
  );

  // Firm assesses SDLT applicability on every transfer of equity —
  // matches the Phase 1 firm engine and the central JS engine.
  if (propertyValue > 0) {
    addItem(
      disbursements,
      "SDLT submission",
      config.disbursements.sdltSubmissionFee
    );
  }

  addItem(
    disbursements,
    "AP1 submission",
    config.disbursements.ap1SubmissionFee
  );

  const bespoke = getBespokeNote(propertyValue);

  return finaliseQuote(
    legalFees,
    disbursements,
    undefined,
    bespoke ? [bespoke] : undefined,
    undefined,
    "SDLT subject to review if chargeable consideration applies."
  );
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
  notes?: string[],
  sdltAmount?: number,
  sdltNote?: string
): BuiltQuoteData {
  const legalFees = [...a.legalFees, ...b.legalFees];
  const disbursements = mergeDisbursements([
    ...a.disbursements,
    ...b.disbursements,
  ]);

  return finaliseQuote(
    legalFees,
    disbursements,
    title,
    notes,
    sdltAmount,
    sdltNote
  );
}

export function buildQuoteData(form: QuoteFormLike): BuiltQuoteData {
  const type = form.type as TransactionType;

  if (type === "sale") {
    return buildSaleQuote({
      price: form.price,
      tenure: form.tenure,
      saleMortgage: form.saleMortgage,
      managementCompany: form.managementCompany,
      tenanted: form.tenanted,
      numberOfSellers: form.numberOfSellers,
    });
  }

  if (type === "purchase") {
    return buildPurchaseQuoteWithPrice({
      price: form.price,
      tenure: form.tenure,
      mortgage: form.mortgage,
      ownershipType: form.ownershipType,
      firstTimeBuyer: form.firstTimeBuyer,
      additionalProperty: form.additionalProperty,
      ukResidentForSdlt: form.ukResidentForSdlt,
      giftedDeposit: form.giftedDeposit,
      newBuild: form.newBuild,
      sharedOwnership: form.sharedOwnership,
      helpToBuy: form.helpToBuy,
      isCompany: form.isCompany,
      buyToLet: form.buyToLet,
      lifetimeIsa: form.lifetimeIsa,
    });
  }

  if (type === "remortgage") {
    return buildRemortgageQuote({
      price: form.price,
      tenure: form.tenure,
      additionalBorrowing: form.additionalBorrowing,
      remortgageTransfer: form.remortgageTransfer,
      ownershipType: form.ownershipType,
      mortgageAmount: form.mortgageAmount,
    });
  }

  if (type === "transfer") {
    return buildTransferQuote({
      price: form.price,
      tenure: form.tenure,
      transferMortgage: form.transferMortgage,
      ownersChanging: form.ownersChanging,
    });
  }

  if (type === "sale_purchase") {
    // Office copies on a combined matter relate to the single property —
    // the purchase leg's tenure governs (acting on the new title), so
    // the sale leg omits its own office-copies line.
    const sale = buildSaleQuote(
      {
        price: form.salePrice,
        tenure: form.saleTenure,
        saleMortgage: form.saleMortgageCombined,
        managementCompany: form.managementCompanyCombined,
        tenanted: form.tenantedCombined,
        numberOfSellers: form.numberOfSellersCombined,
      },
      { omitOfficeCopies: true }
    );

    const purchase = buildPurchaseQuoteWithPrice({
      price: form.purchasePrice,
      tenure: form.purchaseTenure,
      mortgage: form.purchaseMortgage,
      ownershipType: form.purchaseOwnershipType,
      firstTimeBuyer: form.purchaseFirstTimeBuyer,
      additionalProperty: form.purchaseAdditionalProperty,
      ukResidentForSdlt: form.purchaseUkResidentForSdlt,
      giftedDeposit: form.purchaseGiftedDeposit,
      newBuild: form.purchaseNewBuild,
      sharedOwnership: form.purchaseSharedOwnership,
      helpToBuy: form.purchaseHelpToBuy,
      isCompany: form.purchaseIsCompany,
      buyToLet: form.purchaseBuyToLet,
      lifetimeIsa: form.purchaseLifetimeIsa,
    });

    const combinedBespoke =
      getBespokeNote(toNumber(form.salePrice)) ||
      getBespokeNote(toNumber(form.purchasePrice));

    const saleAndPurchaseNotes = [
      "This combined estimate includes the sale and purchase legal work only.",
      "This quote is based on the information currently provided and some fees may change if further information comes to light.",
    ];

    return mergeQuotes(
      "SALE & PURCHASE",
      sale,
      purchase,
      combinedBespoke
        ? [combinedBespoke, ...saleAndPurchaseNotes]
        : saleAndPurchaseNotes,
      purchase.sdltAmount,
      purchase.sdltNote
    );
  }

  if (type === "remortgage_transfer") {
    // Both legs reference the same property and tenure. The remortgage
    // leg owns the office-copies line; the transfer leg omits it so the
    // single combined matter shows the line exactly once.
    //
    // Land Registry: HMLR charges one fee on combined applications. We
    // skip both legs' LR lines and add ONE row at this dispatcher level
    // using the max of Scale 2 on the mortgage amount and Scale 2 on
    // the property value — see getLandRegistryFee helper.
    const remortgage = buildRemortgageQuote(
      {
        price: form.remortgageTransferPrice,
        tenure: form.remortgageTransferTenure,
        additionalBorrowing: form.remortgageTransferAdditionalBorrowing,
        remortgageTransfer: "yes",
        ownershipType: form.remortgageTransferOwnershipType,
        mortgageAmount: form.remortgageTransferMortgageAmount,
      },
      { omitLandRegistryFee: true }
    );

    const transfer = buildTransferQuote(
      {
        price: form.remortgageTransferPrice,
        tenure: form.remortgageTransferTenure,
        transferMortgage: form.remortgageTransferHasMortgage,
        ownersChanging: form.remortgageTransferOwnersChanging,
      },
      { omitOfficeCopies: true, omitLandRegistryFee: true }
    );

    const combinedLandRegistryFee = getLandRegistryFee({
      transactionType: "remortgage_transfer",
      mortgageAmount: toNumber(form.remortgageTransferMortgageAmount),
      propertyValue: toNumber(form.remortgageTransferPrice),
    });
    if (combinedLandRegistryFee > 0) {
      remortgage.disbursements.push({
        label: "Land Registry fee",
        amount: combinedLandRegistryFee,
      });
      remortgage.disbursementTotal = Number(
        (remortgage.disbursementTotal + combinedLandRegistryFee).toFixed(2)
      );
    }

    const remortgageTransferBespoke = getBespokeNote(
      toNumber(form.remortgageTransferPrice)
    );

    const remortgageTransferNotes = [
      "This combined estimate is for a remortgage and transfer of equity on the same property.",
      "This quote is based on the information currently provided and some fees may change if further information comes to light.",
    ];

    return mergeQuotes(
      "REMORTGAGE & TRANSFER OF EQUITY",
      remortgage,
      transfer,
      remortgageTransferBespoke
        ? [remortgageTransferBespoke, ...remortgageTransferNotes]
        : remortgageTransferNotes
    );
  }

  return finaliseQuote([], [], "QUOTE NOT AVAILABLE", [
    "The selected matter type is not yet configured.",
  ]);
}
