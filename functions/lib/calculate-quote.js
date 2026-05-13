import {
  getOfficeCopyEntriesAmount,
  getLandRegistryFee,
} from "./disbursement-constants.js";

// Pass-through disbursement amounts. Exported so the Type 2 firm-quoting
// engine can source the same values — these costs must not diverge
// between the two product rails. To change a disbursement, edit it here
// once and both rails pick it up.
//
// Office copy entries is intentionally NOT here — it's a tenure-based
// function exported from ./disbursement-constants.js. Both engines call
// getOfficeCopyEntriesAmount(tenure) directly.
//
// Land Registry is also NOT here — it's a transaction-type-aware
// statutory sliding scale exported from ./disbursement-constants.js.
// Call getLandRegistryFee({ transactionType, purchasePrice,
// mortgageAmount, propertyValue }) directly. HMLR fees are NOT VAT-able.
export const SEARCH_PACK_FEE = 350;
export const ID_CHECKS_PER_BUYER = 14.4;
export const OS1_SEARCH_FEE = 8.8;
export const BANKRUPTCY_SEARCH_PER_BUYER = 7.6;
export const SDLT_SUBMISSION_FEE = 6;
export const AP1_SUBMISSION_FEE = 6;

function toNumber(value) {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function getSellerCount(value) {
  if (value === "2") return 2;
  if (value === "3") return 3;
  return 1;
}

// Buyers / borrowers count for per-person disbursements. Joint = 2,
// otherwise individual / company / sole = 1.
function getBuyerCount(ownershipType) {
  return ownershipType === "joint" ? 2 : 1;
}

// Owners involved in a transfer of equity. "two" → 2, "more" → 3.
function getOwnersChangingCount(value) {
  if (value === "two") return 2;
  if (value === "more") return 3;
  return 1;
}

// Per-person disbursements scale linearly with the number of buyers /
// borrowers / parties on the matter. Label includes the multiplier so the
// admin can see at a glance what's been applied.
function perPersonLabel(base, count) {
  return count > 1 ? `${base} (${count} buyers)` : base;
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

// MUST STAY IN SYNC with the other pricing file — see src/priceConfig.ts.
// Changing pricing requires editing both files.
function getPurchaseBaseFee(price) {
  const value = Number(price) || 0;
  if (value <= 0) return 995;
  if (value < 200000) return 795;
  if (value < 400000) return 995;
  if (value < 750000) return 1195;
  return 1395;
}

// MUST STAY IN SYNC with the other pricing file — see src/priceConfig.ts.
// Changing pricing requires editing both files.
function getSaleBaseFee(price) {
  const value = Number(price) || 0;
  if (value <= 0) return 895;
  if (value < 200000) return 775;
  if (value < 400000) return 895;
  if (value < 750000) return 995;
  return 1195;
}

// MUST STAY IN SYNC with the other pricing file — see src/priceConfig.ts.
// Changing pricing requires editing both files.
function getRemortgageBaseFee(propertyValue) {
  const value = Number(propertyValue) || 0;
  if (value <= 0) return 695;
  if (value < 200000) return 595;
  if (value < 400000) return 695;
  if (value < 750000) return 795;
  return 895;
}

// MUST STAY IN SYNC with the other pricing file — see src/priceConfig.ts.
// Changing pricing requires editing both files.
function getTransferBaseFee(propertyValue) {
  const value = Number(propertyValue) || 0;
  if (value <= 0) return 550;
  if (value < 200000) return 495;
  if (value < 400000) return 550;
  if (value < 750000) return 625;
  return 725;
}

const BESPOKE_PRICING_NOTE =
  "Properties over £1.5m may be subject to bespoke pricing — please contact us to confirm.";

function getBespokeNote(value) {
  return (Number(value) || 0) >= 1500000 ? BESPOKE_PRICING_NOTE : null;
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

export function calculateSdlt({
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

  const baseDisclaimerLines = args.disclaimerLines ?? [
    "This estimate is based on the information currently available.",
    "If further information comes to light or the matter is more complex than expected, costs may change.",
  ];
  const disclaimerLines = args.bespokeNote
    ? [args.bespokeNote, ...baseDisclaimerLines]
    : baseDisclaimerLines;

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

function buildPurchaseQuote(input, options = {}) {
  const legalFees = [];
  const disbursements = [];
  const price = toNumber(input.price);
  const buyerCount = getBuyerCount(input.ownershipType);

  addItem(legalFees, "Purchase legal fee", getPurchaseBaseFee(price));

  if (input.tenure === "leasehold") {
    addItem(legalFees, "Leasehold supplement", 300);
  }

  // Telegraphic transfer fee applies to all purchases
  // (completion funds must be wired to the seller's solicitor regardless of mortgage)
  addItem(legalFees, "Telegraphic transfer fee", 45);

  if (input.mortgage === "mortgage") {
    addItem(legalFees, "Acting for lender", 125);
  }

  if (input.giftedDeposit === "yes") {
    addItem(legalFees, "Gifted deposit supplement", 95);
  }

  if (input.lifetimeIsa === "yes") {
    addItem(legalFees, "Lifetime ISA admin fee", 50);
  }

  addItem(disbursements, "Search pack", SEARCH_PACK_FEE);
  // HMLR Scale 1 sliding scale, no VAT. Single source of truth for
  // both rails in functions/lib/disbursement-constants.js.
  addItem(
    disbursements,
    "Land Registry fee",
    getLandRegistryFee({
      transactionType: "purchase",
      purchasePrice: price,
    })
  );
  addItem(disbursements, perPersonLabel("ID checks", buyerCount), ID_CHECKS_PER_BUYER * buyerCount);
  addItem(disbursements, "OS1 search", OS1_SEARCH_FEE);
  addItem(disbursements, perPersonLabel("Bankruptcy search", buyerCount), BANKRUPTCY_SEARCH_PER_BUYER * buyerCount);

  if (price > 0) {
    addItem(disbursements, "SDLT submission", SDLT_SUBMISSION_FEE);
    addItem(disbursements, "AP1 submission", AP1_SUBMISSION_FEE);
  }

  // Office copy entries: tenure-based estimate, single line per matter.
  // Skipped when this helper is called as a leg of a combined quote;
  // the combining caller decides which leg's tenure governs the line.
  if (!options.omitOfficeCopies) {
    addItem(
      disbursements,
      "Office copy entries",
      getOfficeCopyEntriesAmount(input.tenure)
    );
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
    bespokeNote: getBespokeNote(price),
    breakdownTitle: "PURCHASE QUOTE",
  });
}

function buildSaleQuote(input, options = {}) {
  const legalFees = [];
  const disbursements = [];
  const sellerCount = getSellerCount(input.numberOfSellers);
  const price = toNumber(input.price);

  addItem(legalFees, "Sale legal fee", getSaleBaseFee(price));

  if (input.tenure === "leasehold") {
    addItem(legalFees, "Leasehold supplement", 300);
  }

  // Telegraphic transfer fee: always 1x to send net sale proceeds to seller.
  // A second fee is added if there is a mortgage to redeem (funds must also
  // be wired to the lender to discharge the charge).
  addItem(legalFees, "Telegraphic transfer fee", 45);

  if (input.saleMortgage === "yes") {
    addItem(legalFees, "Mortgage redemption supplement", 50);
    addItem(legalFees, "Telegraphic transfer fee (mortgage redemption)", 45);
  }

  if (input.managementCompany === "yes") {
    addItem(legalFees, "Management company / service charge supplement", 175);
  }

  if (input.tenanted === "yes") {
    addItem(legalFees, "Tenanted property supplement", 150);
  }

  // Office copy entries: tenure-based estimate, single line per matter.
  // Skipped when this helper is called as the sale leg of sale_purchase;
  // the purchase leg's tenure drives the line in combined matters.
  if (!options.omitOfficeCopies) {
    addItem(
      disbursements,
      "Office copy entries",
      getOfficeCopyEntriesAmount(input.tenure)
    );
  }
  addItem(
    disbursements,
    sellerCount > 1 ? `ID checks (x${sellerCount})` : "ID checks",
    14.4 * sellerCount
  );

  return finaliseQuote({
    legalFees,
    disbursements,
    bespokeNote: getBespokeNote(price),
    breakdownTitle: "SALE QUOTE",
  });
}

function buildRemortgageQuote(input) {
  const legalFees = [];
  const disbursements = [];
  const propertyValue = toNumber(input.price);
  const mortgageAmount = toNumber(input.mortgageAmount);
  const partyCount = getBuyerCount(input.ownershipType);

  addItem(legalFees, "Remortgage legal fee", getRemortgageBaseFee(propertyValue));

  if (input.tenure === "leasehold") {
    addItem(legalFees, "Leasehold supplement", 250);
  }

  if (input.additionalBorrowing === "yes") {
    addItem(legalFees, "Additional borrowing supplement", 75);
  }

  if (input.remortgageTransfer === "yes") {
    addItem(legalFees, "Simultaneous transfer of equity supplement", 350);
  }

  // TS engine adds TT to wire the remortgage advance from the new lender —
  // mirrored here so JS doesn't under-quote.
  addItem(legalFees, "Telegraphic transfer fee - remortgage advance", 45);

  addItem(
    disbursements,
    "Office copy entries",
    getOfficeCopyEntriesAmount(input.tenure)
  );
  // HMLR Scale 2 on the new mortgage advance, no VAT.
  addItem(
    disbursements,
    "Land Registry fee",
    getLandRegistryFee({
      transactionType: "remortgage",
      mortgageAmount,
    })
  );
  addItem(disbursements, perPersonLabel("ID checks", partyCount), ID_CHECKS_PER_BUYER * partyCount);
  // Bankruptcy search always required on remortgage
  addItem(disbursements, perPersonLabel("Bankruptcy search", partyCount), BANKRUPTCY_SEARCH_PER_BUYER * partyCount);

  return finaliseQuote({
    legalFees,
    disbursements,
    bespokeNote: getBespokeNote(propertyValue),
    breakdownTitle: "REMORTGAGE QUOTE",
  });
}

function buildTransferQuote(input) {
  const legalFees = [];
  const disbursements = [];
  const propertyValue = toNumber(input.price);
  const partyCount = getOwnersChangingCount(input.ownersChanging);

  addItem(legalFees, "Transfer of equity legal fee", getTransferBaseFee(propertyValue));

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

  addItem(
    disbursements,
    "Office copy entries",
    getOfficeCopyEntriesAmount(input.tenure)
  );
  // HMLR Scale 2 — conservative over-estimate, see helper note.
  addItem(
    disbursements,
    "Land Registry fee",
    getLandRegistryFee({
      transactionType: "transfer",
      propertyValue,
    })
  );
  addItem(disbursements, perPersonLabel("ID checks", partyCount), ID_CHECKS_PER_BUYER * partyCount);
  // Bankruptcy search always required on transfer of equity
  addItem(disbursements, perPersonLabel("Bankruptcy search", partyCount), BANKRUPTCY_SEARCH_PER_BUYER * partyCount);
  addItem(disbursements, "AP1 submission", AP1_SUBMISSION_FEE);

  return finaliseQuote({
    legalFees,
    disbursements,
    bespokeNote: getBespokeNote(propertyValue),
    breakdownTitle: "TRANSFER OF EQUITY QUOTE",
  });
}

function buildRemortgageTransferQuote(input) {
  const legalFees = [];
  const disbursements = [];
  // Combined matter input field is remortgageTransferPrice — see
  // PR #19 follow-up; previous reads of input.price returned undefined
  // and dropped legal fee into lowest bracket.
  const propertyValue =
    toNumber(input.remortgageTransferPrice) ||
    toNumber(input.propertyValue) ||
    toNumber(input.price);
  // remortgageTransfer-prefixed fields are the canonical form names for
  // combined matters. Read both directly here for the LR fee — the
  // legacy `input.price` mapping doesn't always flow on this path.
  const combinedPropertyValue = toNumber(
    input.remortgageTransferPrice || input.price
  );
  const mortgageAmount = toNumber(input.remortgageTransferMortgageAmount);
  // Use the larger of the two party counts so disbursements aren't
  // under-charged when more owners are being added than the remortgage
  // ownership type suggests.
  const partyCount = Math.max(
    getBuyerCount(input.remortgageTransferOwnershipType),
    getOwnersChangingCount(input.remortgageTransferOwnersChanging)
  );

  addItem(legalFees, "Remortgage legal fee", getRemortgageBaseFee(propertyValue));
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

  addItem(
    disbursements,
    "Office copy entries",
    getOfficeCopyEntriesAmount(input.remortgageTransferTenure)
  );
  // HMLR: combined applications attract ONE fee — the higher of
  // Scale 2 on the new mortgage and Scale 2 on the property value.
  addItem(
    disbursements,
    "Land Registry fee",
    getLandRegistryFee({
      transactionType: "remortgage_transfer",
      mortgageAmount,
      propertyValue: combinedPropertyValue,
    })
  );
  addItem(disbursements, perPersonLabel("ID checks", partyCount), ID_CHECKS_PER_BUYER * partyCount);
  // Bankruptcy search always required
  addItem(disbursements, perPersonLabel("Bankruptcy search", partyCount), BANKRUPTCY_SEARCH_PER_BUYER * partyCount);
  addItem(disbursements, "AP1 submission", AP1_SUBMISSION_FEE);

  return finaliseQuote({
    legalFees,
    disbursements,
    bespokeNote: getBespokeNote(propertyValue),
    breakdownTitle: "REMORTGAGE AND TRANSFER OF EQUITY QUOTE",
  });
}

function combineQuotes(title, first, second, sdltFromSecond = false, bespokeNote) {
  const legalFees = [...first.legalFees, ...second.legalFees];
  const disbursements = [...first.disbursements, ...second.disbursements];
  const sdltAmount = sdltFromSecond ? second.sdltAmount : undefined;
  const sdltNote = sdltFromSecond ? second.sdltNote : undefined;

  return finaliseQuote({
    legalFees,
    disbursements,
    sdltAmount,
    sdltNote,
    bespokeNote,
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
    // Office copies on a combined matter relate to the single property —
    // the purchase leg's tenure governs (acting on the new title), so the
    // sale leg omits its own office-copies line to avoid double-billing.
    const saleQuote = buildSaleQuote(
      {
        tenure: input.saleTenure,
        price: input.salePrice,
        postcode: input.salePostcode,
        saleMortgage: input.saleMortgageCombined,
        managementCompany: input.managementCompanyCombined,
        tenanted: input.tenantedCombined,
        numberOfSellers: input.numberOfSellersCombined,
      },
      { omitOfficeCopies: true }
    );

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

    const combinedBespokeNote =
      getBespokeNote(toNumber(input.salePrice)) ||
      getBespokeNote(toNumber(input.purchasePrice));

    return combineQuotes(
      "SALE AND PURCHASE QUOTE",
      saleQuote,
      purchaseQuote,
      true,
      combinedBespokeNote
    );
  }

  return finaliseQuote({
    legalFees: [],
    disbursements: [],
    breakdownTitle: "QUOTE",
    disclaimerLines: ["No pricing data available for this transaction type."],
  });
}
