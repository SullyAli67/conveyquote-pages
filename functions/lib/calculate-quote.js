function toNumber(value) {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function addItem(items, label, amount, note) {
  if (amount > 0) {
    items.push({ label, amount, note });
  }
}

function sumItems(items) {
  return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function formatMoney(value) {
  return `£${value.toFixed(2)}`;
}

function calculateStandardSdlt(price) {
  let tax = 0;

  if (price > 250000) {
    tax += (Math.min(price, 925000) - 250000) * 0.05;
  }

  if (price > 925000) {
    tax += (Math.min(price, 1500000) - 925000) * 0.1;
  }

  if (price > 1500000) {
    tax += (price - 1500000) * 0.12;
  }

  return Math.max(0, tax);
}

function calculateFirstTimeBuyerSdlt(price) {
  if (price > 625000) {
    return calculateStandardSdlt(price);
  }

  let tax = 0;

  if (price > 425000) {
    tax += (price - 425000) * 0.05;
  }

  return Math.max(0, tax);
}

function calculateSdlt({
  price,
  firstTimeBuyer,
  additionalProperty,
  ukResidentForSdlt,
  isCompany,
  sharedOwnership,
}) {
  if (price <= 0) {
    return {};
  }

  if (sharedOwnership === "yes" || isCompany === "yes") {
    return {
      sdltNote: "SDLT requires manual review based on the information provided.",
    };
  }

  const baseTax =
    firstTimeBuyer === "yes" && additionalProperty !== "yes"
      ? calculateFirstTimeBuyerSdlt(price)
      : calculateStandardSdlt(price);

  let surcharge = 0;

  if (additionalProperty === "yes") surcharge += price * 0.05;
  if (ukResidentForSdlt === "no") surcharge += price * 0.02;

  return {
    sdltAmount: Number((baseTax + surcharge).toFixed(2)),
  };
}

function buildFeeBreakdown(params) {
  const {
    legalFees,
    vat,
    legalTotalInclVat,
    disbursements,
    disbursementTotal,
    grandTotal,
    sdltAmount,
    sdltNote,
    totalIncludingSdlt,
    disclaimerLines,
  } = params;

  const lines = [];

  lines.push("LEGAL FEES");
  legalFees.forEach((item) => {
    lines.push(`${item.label}: ${formatMoney(item.amount)}`);
  });
  lines.push(`VAT: ${formatMoney(vat)}`);
  lines.push(`Total legal fees including VAT: ${formatMoney(legalTotalInclVat)}`);

  lines.push("");
  lines.push("DISBURSEMENTS");
  disbursements.forEach((item) => {
    if (item.note) {
      lines.push(`${item.label}: ${item.note}`);
    } else {
      lines.push(`${item.label}: ${formatMoney(item.amount)}`);
    }
  });
  lines.push(`Total disbursements: ${formatMoney(disbursementTotal)}`);

  lines.push("");
  lines.push(`TOTAL LEGAL FEES + DISBURSEMENTS: ${formatMoney(grandTotal)}`);

  if (typeof sdltAmount === "number") {
    lines.push(`Estimated SDLT: ${formatMoney(sdltAmount)}`);
  } else if (sdltNote) {
    lines.push(`SDLT: ${sdltNote}`);
  }

  lines.push("");
  lines.push(
    `TOTAL ESTIMATED COST: ${formatMoney(
      typeof totalIncludingSdlt === "number" ? totalIncludingSdlt : grandTotal
    )}`
  );

  if (disclaimerLines.length > 0) {
    lines.push("");
    lines.push("IMPORTANT NOTES");
    disclaimerLines.forEach((line) => lines.push(line));
  }

  return lines.join("\n");
}

function finaliseQuote(args) {
  const legalFeesExVat = Number(sumItems(args.legalFees).toFixed(2));
  const vat = Number((legalFeesExVat * 0.2).toFixed(2));
  const legalTotalInclVat = Number((legalFeesExVat + vat).toFixed(2));
  const disbursementTotal = Number(sumItems(args.disbursements).toFixed(2));
  const grandTotal = Number((legalTotalInclVat + disbursementTotal).toFixed(2));

  const totalIncludingSdlt =
    typeof args.sdltAmount === "number"
      ? Number((grandTotal + args.sdltAmount).toFixed(2))
      : undefined;

  const disclaimerLines = args.disclaimerLines ?? [
    "This estimate is based on the information currently available.",
    "If further information comes to light or the matter is more complex than expected, costs may change.",
  ];

  const feeBreakdown = buildFeeBreakdown({
    legalFees: args.legalFees,
    vat,
    legalTotalInclVat,
    disbursements: args.disbursements,
    disbursementTotal,
    grandTotal,
    sdltAmount: args.sdltAmount,
    sdltNote: args.sdltNote,
    totalIncludingSdlt,
    disclaimerLines,
  });

  return {
    legalFees: args.legalFees,
    disbursements: args.disbursements,
    legalFeesExVat,
    vat,
    legalTotalInclVat,
    disbursementTotal,
    grandTotal,
    sdltAmount: args.sdltAmount,
    sdltNote: args.sdltNote,
    totalIncludingSdlt,
    feeBreakdown,
    breakdownText: args.breakdownTitle || "CONVEYANCING QUOTE",
    disclaimerLines,
  };
}

function buildPurchaseQuote(input) {
  const legalFees = [];
  const disbursements = [];
  const price = toNumber(input.price);

  addItem(legalFees, "Purchase legal fee", 1195);

  if (input.tenure === "leasehold") {
    addItem(legalFees, "Leasehold supplement", 350);
  }

  if (input.mortgage === "mortgage") {
    addItem(legalFees, "Acting for lender", 125);
  }

  if (input.giftedDeposit === "yes") {
    addItem(legalFees, "Gifted deposit supplement", 95);
  }

  if (input.lifetimeIsa === "yes") {
    addItem(legalFees, "Lifetime ISA admin fee", 50);
  }

  addItem(disbursements, "Search pack", 350);
  addItem(disbursements, "Land Registry fee", 150);
  addItem(disbursements, "ID checks", 14.4);
  addItem(disbursements, "OS1 search", 8.8);
  addItem(disbursements, "Bankruptcy search", 7.6);

  if (price > 0) {
    addItem(disbursements, "SDLT submission", 6);
    addItem(disbursements, "AP1 submission", 6);
  }

  const sdlt = calculateSdlt({
    price,
    firstTimeBuyer: input.firstTimeBuyer,
    additionalProperty: input.additionalProperty,
    ukResidentForSdlt: input.ukResidentForSdlt,
    isCompany: input.isCompany,
    sharedOwnership: input.sharedOwnership,
  });

  return finaliseQuote({
    legalFees,
    disbursements,
    sdltAmount: sdlt.sdltAmount,
    sdltNote: sdlt.sdltNote,
    breakdownTitle: "PURCHASE QUOTE",
  });
}

function buildSaleQuote(input) {
  const legalFees = [];
  const disbursements = [];

  addItem(legalFees, "Sale legal fee", 995);

  if (input.tenure === "leasehold") {
    addItem(legalFees, "Leasehold supplement", 300);
  }

  if (input.saleMortgage === "yes") {
    addItem(legalFees, "Mortgage redemption supplement", 50);
  }

  if (input.managementCompany === "yes") {
    addItem(legalFees, "Management company / service charge supplement", 175);
  }

  if (input.tenanted === "yes") {
    addItem(legalFees, "Tenanted property supplement", 150);
  }

  addItem(disbursements, "Office copy entries", 12);
  addItem(disbursements, "ID checks", 14.4);

  return finaliseQuote({
    legalFees,
    disbursements,
    breakdownTitle: "SALE QUOTE",
  });
}

function buildRemortgageQuote(input) {
  const legalFees = [];
  const disbursements = [];

  addItem(legalFees, "Remortgage legal fee", 595);

  if (input.tenure === "leasehold") {
    addItem(legalFees, "Leasehold supplement", 250);
  }

  if (input.additionalBorrowing === "yes") {
    addItem(legalFees, "Additional borrowing supplement", 75);
  }

  if (input.remortgageTransfer === "yes") {
    addItem(legalFees, "Simultaneous transfer of equity supplement", 350);
  }

  addItem(disbursements, "Office copy entries", 12);
  addItem(disbursements, "ID checks", 14.4);

  return finaliseQuote({
    legalFees,
    disbursements,
    breakdownTitle: "REMORTGAGE QUOTE",
  });
}

function buildTransferQuote(input) {
  const legalFees = [];
  const disbursements = [];

  addItem(legalFees, "Transfer of equity legal fee", 650);

  if (input.tenure === "leasehold") {
    addItem(legalFees, "Leasehold supplement", 250);
  }

  if (input.transferMortgage === "yes") {
    addItem(legalFees, "Lender consent / mortgage element", 125);
  }

  if (input.ownersChanging === "two") {
    addItem(legalFees, "Additional ownership change supplement", 75);
  }

  if (input.ownersChanging === "more") {
    addItem(legalFees, "Complex ownership change supplement", 150);
  }

  addItem(disbursements, "Office copy entries", 12);
  addItem(disbursements, "ID checks", 14.4);
  addItem(disbursements, "AP1 submission", 6);

  return finaliseQuote({
    legalFees,
    disbursements,
    breakdownTitle: "TRANSFER OF EQUITY QUOTE",
  });
}

function buildRemortgageTransferQuote(input) {
  const legalFees = [];
  const disbursements = [];

  addItem(legalFees, "Remortgage legal fee", 595);
  addItem(legalFees, "Transfer of equity supplement", 350);

  if (input.remortgageTransferTenure === "leasehold") {
    addItem(legalFees, "Leasehold supplement", 250);
  }

  if (input.remortgageTransferAdditionalBorrowing === "yes") {
    addItem(legalFees, "Additional borrowing supplement", 75);
  }

  if (input.remortgageTransferOwnersChanging === "two") {
    addItem(legalFees, "Additional ownership change supplement", 75);
  }

  if (input.remortgageTransferOwnersChanging === "more") {
    addItem(legalFees, "Complex ownership change supplement", 150);
  }

  addItem(disbursements, "Office copy entries", 12);
  addItem(disbursements, "ID checks", 14.4);
  addItem(disbursements, "AP1 submission", 6);

  return finaliseQuote({
    legalFees,
    disbursements,
    breakdownTitle: "REMORTGAGE AND TRANSFER OF EQUITY QUOTE",
  });
}

function combineQuotes(title, first, second, sdltFromSecond = false) {
  const legalFees = [...first.legalFees, ...second.legalFees];
  const disbursements = [...first.disbursements, ...second.disbursements];
  const sdltAmount = sdltFromSecond ? second.sdltAmount : undefined;
  const sdltNote = sdltFromSecond ? second.sdltNote : undefined;

  return finaliseQuote({
    legalFees,
    disbursements,
    sdltAmount,
    sdltNote,
    breakdownTitle: title,
    disclaimerLines: [
      "This is a combined estimate based on the information currently available.",
      "If either matter becomes more complex than expected, costs may change.",
    ],
  });
}

export function buildQuoteData(input) {
  const type = input.type || "";

  if (type === "purchase") {
    return buildPurchaseQuote(input);
  }

  if (type === "sale") {
    return buildSaleQuote(input);
  }

  if (type === "remortgage") {
    return buildRemortgageQuote(input);
  }

  if (type === "transfer") {
    return buildTransferQuote(input);
  }

  if (type === "remortgage_transfer") {
    return buildRemortgageTransferQuote(input);
  }

  if (type === "sale_purchase") {
    const saleQuote = buildSaleQuote({
      tenure: input.saleTenure,
      price: input.salePrice,
      postcode: input.salePostcode,
      saleMortgage: input.saleMortgageCombined,
      managementCompany: input.managementCompanyCombined,
      tenanted: input.tenantedCombined,
      numberOfSellers: input.numberOfSellersCombined,
    });

    const purchaseQuote = buildPurchaseQuote({
      tenure: input.purchaseTenure,
      price: input.purchasePrice,
      postcode: input.purchasePostcode,
      mortgage: input.purchaseMortgage,
      lender: input.purchaseLender,
      ownershipType: input.purchaseOwnershipType,
      firstTimeBuyer: input.purchaseFirstTimeBuyer,
      newBuild: input.purchaseNewBuild,
      sharedOwnership: input.purchaseSharedOwnership,
      helpToBuy: input.purchaseHelpToBuy,
      isCompany: input.purchaseIsCompany,
      buyToLet: input.purchaseBuyToLet,
      giftedDeposit: input.purchaseGiftedDeposit,
      additionalProperty: input.purchaseAdditionalProperty,
      ukResidentForSdlt: input.purchaseUkResidentForSdlt,
      lifetimeIsa: input.purchaseLifetimeIsa,
    });

    return combineQuotes("SALE AND PURCHASE QUOTE", saleQuote, purchaseQuote, true);
  }

  return finaliseQuote({
    legalFees: [],
    disbursements: [],
    breakdownTitle: "QUOTE",
    disclaimerLines: ["No pricing data available for this transaction type."],
  });
}
