function toNumber(value) {
  const parsed = Number(String(value || "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return `£${Number(value).toFixed(2)}`;
}

function addItem(items, label, amount) {
  if (amount > 0) {
    items.push({ label, amount });
  }
}

function sumAmounts(items) {
  return items.reduce((sum, item) => sum + (item.amount || 0), 0);
}

/**
 * 🔥 NORMALISE
 */
function normaliseEnquiry(enquiry) {
  return {
    transaction_type: enquiry.transaction_type ?? enquiry.type ?? "",
    tenure: enquiry.tenure ?? "",
    price: enquiry.price ?? "",

    mortgage: enquiry.mortgage ?? "",
    ownership_type: enquiry.ownership_type ?? enquiry.ownershipType ?? "",
    first_time_buyer:
      enquiry.first_time_buyer ?? enquiry.firstTimeBuyer ?? "",
    new_build: enquiry.new_build ?? enquiry.newBuild ?? "",
    shared_ownership:
      enquiry.shared_ownership ?? enquiry.sharedOwnership ?? "",
    help_to_buy: enquiry.help_to_buy ?? enquiry.helpToBuy ?? "",
    is_company: enquiry.is_company ?? enquiry.isCompany ?? "",
    buy_to_let: enquiry.buy_to_let ?? enquiry.buyToLet ?? "",
    gifted_deposit: enquiry.gifted_deposit ?? enquiry.giftedDeposit ?? "",
    additional_property:
      enquiry.additional_property ?? enquiry.additionalProperty ?? "",
    uk_resident_for_sdlt:
      enquiry.uk_resident_for_sdlt ?? enquiry.ukResidentForSdlt ?? "",

    sale_mortgage: enquiry.sale_mortgage ?? enquiry.saleMortgage ?? "",
    management_company:
      enquiry.management_company ?? enquiry.managementCompany ?? "",
    tenanted: enquiry.tenanted ?? "",
    number_of_sellers:
      enquiry.number_of_sellers ?? enquiry.numberOfSellers ?? "",

    additional_borrowing:
      enquiry.additional_borrowing ?? enquiry.additionalBorrowing ?? "",
    remortgage_transfer:
      enquiry.remortgage_transfer ?? enquiry.remortgageTransfer ?? "",
  };
}

/**
 * 🔥 CORE SINGLE BUILDER
 */
function buildSingleQuote(enquiry, overrideType) {
  const type = overrideType || enquiry.transaction_type;
  const price = toNumber(enquiry.price);

  const legalFeeItems = [];
  const disbursementItems = [];

  // ===== SALE =====
  if (type === "sale") {
    addItem(legalFeeItems, "Sale legal fee", 995);

    if (enquiry.tenure === "leasehold") {
      addItem(legalFeeItems, "Leasehold supplement", 300);
    }
    if (enquiry.sale_mortgage === "yes") {
      addItem(legalFeeItems, "Mortgage redemption", 50);
    }
    if (enquiry.management_company === "yes") {
      addItem(legalFeeItems, "Management company", 175);
    }
    if (enquiry.tenanted === "yes") {
      addItem(legalFeeItems, "Tenanted property", 150);
    }

    addItem(disbursementItems, "Office copy entries", 12);
    addItem(disbursementItems, "ID checks", 14.4);
  }

  // ===== PURCHASE =====
  if (type === "purchase") {
    addItem(legalFeeItems, "Purchase legal fee", 1195);

    if (enquiry.tenure === "leasehold") {
      addItem(legalFeeItems, "Leasehold supplement", 350);
    }
    if (enquiry.mortgage === "mortgage") {
      addItem(legalFeeItems, "Acting for lender", 125);
    }
    if (enquiry.gifted_deposit === "yes") {
      addItem(legalFeeItems, "Gifted deposit", 95);
    }

    addItem(disbursementItems, "Search pack", 350);
    addItem(disbursementItems, "Land Registry fee", 150);
    addItem(disbursementItems, "ID checks", 14.4);
    addItem(disbursementItems, "OS1 search", 8.8);
    addItem(disbursementItems, "Bankruptcy search", 7.6);
    addItem(disbursementItems, "SDLT submission", 6);
    addItem(disbursementItems, "AP1 submission", 6);
  }

  // ===== REMORTGAGE =====
  if (type === "remortgage") {
    addItem(legalFeeItems, "Remortgage legal fee", 595);

    if (enquiry.tenure === "leasehold") {
      addItem(legalFeeItems, "Leasehold supplement", 250);
    }
    if (enquiry.additional_borrowing === "yes") {
      addItem(legalFeeItems, "Additional borrowing", 75);
    }
    if (enquiry.remortgage_transfer === "yes") {
      addItem(legalFeeItems, "Transfer of equity", 350);
    }

    addItem(disbursementItems, "Office copy", 12);
    addItem(disbursementItems, "ID checks", 14.4);
  }

  const legalFeeTotalExVat = sumAmounts(legalFeeItems);
  const vatAmount = Number((legalFeeTotalExVat * 0.2).toFixed(2));
  const legalTotalInclVat = legalFeeTotalExVat + vatAmount;
  const disbursementTotal = sumAmounts(disbursementItems);
  const grandTotal = legalTotalInclVat + disbursementTotal;

  return {
    legalFeeItems,
    disbursementItems,
    legalFeeTotalExVat,
    vatAmount,
    legalTotalInclVat,
    disbursementTotal,
    grandTotal,
  };
}

/**
 * 🔥 MERGE (THIS FIXES EVERYTHING)
 */
function mergeQuotes(title, a, b) {
  const legalFeeItems = [...a.legalFeeItems, ...b.legalFeeItems];
  const disbursementItems = [...a.disbursementItems, ...b.disbursementItems];

  const legalFeeTotalExVat = sumAmounts(legalFeeItems);
  const vatAmount = Number((legalFeeTotalExVat * 0.2).toFixed(2));
  const legalTotalInclVat = legalFeeTotalExVat + vatAmount;
  const disbursementTotal = sumAmounts(disbursementItems);
  const grandTotal = legalTotalInclVat + disbursementTotal;

  return {
    legalFeeItems,
    disbursementItems,
    legalFeeTotalExVat,
    vatAmount,
    legalTotalInclVat,
    disbursementTotal,
    grandTotal,
    breakdownText: `${title} COMBINED QUOTE`,
    disclaimerLines: [],
  };
}

/**
 * 🚀 MAIN ENTRY
 */
export function calculateQuote(rawEnquiry) {
  const enquiry = normaliseEnquiry(rawEnquiry);
  const type = enquiry.transaction_type;

  // 🔥 COMBINED SUPPORT
  if (type === "sale_purchase") {
    const sale = buildSingleQuote(enquiry, "sale");
    const purchase = buildSingleQuote(enquiry, "purchase");
    return mergeQuotes("SALE & PURCHASE", sale, purchase);
  }

  if (type === "remortgage_purchase") {
    const remortgage = buildSingleQuote(enquiry, "remortgage");
    const purchase = buildSingleQuote(enquiry, "purchase");
    return mergeQuotes("REMORTGAGE & PURCHASE", remortgage, purchase);
  }

  // 🔹 NORMAL
  return buildSingleQuote(enquiry);
}
