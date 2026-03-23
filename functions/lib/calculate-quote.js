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

function getPriceBandFee(price, bands) {
  for (const band of bands) {
    if (price <= band.max) {
      return band.fee;
    }
  }
  return bands[bands.length - 1].fee;
}

function getLandRegistryFee(price) {
  if (price <= 80000) return 20;
  if (price <= 100000) return 40;
  if (price <= 200000) return 100;
  if (price <= 500000) return 150;
  if (price <= 1000000) return 295;
  return 500;
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

function normaliseEnquiry(enquiry) {
  return {
    transaction_type: enquiry.transaction_type ?? enquiry.type ?? "",
    tenure: enquiry.tenure ?? "",
    price: enquiry.price ?? "",
    postcode: enquiry.postcode ?? "",

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

    current_lender: enquiry.current_lender ?? enquiry.currentLender ?? "",
    new_lender: enquiry.new_lender ?? enquiry.newLender ?? "",
    additional_borrowing:
      enquiry.additional_borrowing ?? enquiry.additionalBorrowing ?? "",
    remortgage_transfer:
      enquiry.remortgage_transfer ?? enquiry.remortgageTransfer ?? "",

    transfer_mortgage:
      enquiry.transfer_mortgage ?? enquiry.transferMortgage ?? "",
    owners_changing: enquiry.owners_changing ?? enquiry.ownersChanging ?? "",
  };
}

function calculateResidentialSdlt({
  price,
  firstTimeBuyer,
  additionalProperty,
  ukResidentForSdlt,
  isCompany,
  sharedOwnership,
}) {
  const needsManualReview =
    sharedOwnership === "yes" || isCompany === "yes";

  if (needsManualReview) {
    return {
      amount: 0,
      manualReview: true,
      note: "TBC pending review",
    };
  }

  let baseTax = 0;

  if (firstTimeBuyer === "yes" && additionalProperty !== "yes") {
    baseTax = calculateFirstTimeBuyerSdlt(price);
  } else {
    baseTax = calculateStandardSdlt(price);
  }

  let surcharge = 0;

  if (additionalProperty === "yes") {
    surcharge += price * 0.05;
  }

  if (ukResidentForSdlt === "no") {
    surcharge += price * 0.02;
  }

  return {
    amount: baseTax + surcharge,
    manualReview: false,
    note: "",
  };
}

function getDisclaimerLines(enquiry) {
  const lines = [];

  lines.push(
    "This quote is an estimate based on the information currently available and may change if the matter becomes more complex or additional work is required."
  );

  if (enquiry.tenure === "leasehold") {
    lines.push(
      "This estimate excludes additional work arising from landlord requirements, management packs, deed variations, licences, absent freeholder issues or unusual lease terms."
    );
  }

  if (enquiry.new_build === "yes") {
    lines.push(
      "This estimate excludes additional work arising from developer deadlines, infrastructure agreements, planning or building regulation issues, or non-standard new-build documentation."
    );
  }

  if (enquiry.gifted_deposit === "yes") {
    lines.push(
      "This estimate excludes any lender-specific or donor-related work outside standard gifted deposit checks and source of funds enquiries."
    );
  }

  if (enquiry.is_company === "yes") {
    lines.push(
      "This estimate excludes additional corporate, tax, trust, beneficial ownership or lender-related work outside a standard company purchase."
    );
  }

  if (enquiry.shared_ownership === "yes") {
    lines.push(
      "This estimate excludes additional housing association or scheme-specific requirements beyond a standard shared ownership transaction."
    );
  }

  if (enquiry.tenanted === "yes") {
    lines.push(
      "This estimate excludes specialist landlord and tenant advice, possession issues, deposit disputes, licensing issues or drafting of new tenancy documentation."
    );
  }

  if (enquiry.transaction_type === "remortgage") {
    lines.push(
      "This estimate excludes unusual lender conditions, non-standard title issues, lease variations, indemnity policy negotiations or title rectification work."
    );
  }

  return lines;
}

function calculateLegalFees(enquiry) {
  const price = toNumber(enquiry.price);
  const legalFeeItems = [];

  let baseFee = 0;

  if (enquiry.transaction_type === "sale") {
    baseFee = getPriceBandFee(price, [
      { max: 150000, fee: 795 },
      { max: 250000, fee: 895 },
      { max: 350000, fee: 995 },
      { max: 500000, fee: 1095 },
      { max: 750000, fee: 1295 },
      { max: 1000000, fee: 1495 },
      { max: 1500000, fee: 1895 },
      { max: Infinity, fee: 1895 },
    ]);
    addItem(legalFeeItems, "Base legal fee", baseFee);

    if (enquiry.tenure === "leasehold") {
      addItem(legalFeeItems, "Leasehold supplement", 300);
    }
    if (enquiry.sale_mortgage === "yes") {
      addItem(legalFeeItems, "Mortgage redemption supplement", 50);
    }
    if (enquiry.management_company === "yes") {
      addItem(
        legalFeeItems,
        "Management company / service charge supplement",
        175
      );
    }
    if (enquiry.tenanted === "yes") {
      addItem(legalFeeItems, "Tenanted property supplement", 150);
    }
  }

  if (enquiry.transaction_type === "purchase") {
    baseFee = getPriceBandFee(price, [
      { max: 150000, fee: 895 },
      { max: 250000, fee: 1025 },
      { max: 350000, fee: 1195 },
      { max: 500000, fee: 1345 },
      { max: 750000, fee: 1545 },
      { max: 1000000, fee: 1795 },
      { max: 1500000, fee: 2195 },
      { max: Infinity, fee: 2195 },
    ]);
    addItem(legalFeeItems, "Base legal fee", baseFee);

    if (enquiry.tenure === "leasehold") {
      addItem(legalFeeItems, "Leasehold supplement", 350);
    }
    if (enquiry.mortgage === "mortgage") {
      addItem(legalFeeItems, "Acting for lender supplement", 125);
    }
    if (enquiry.gifted_deposit === "yes") {
      addItem(legalFeeItems, "Gifted deposit supplement", 95);
    }
    if (enquiry.new_build === "yes") {
      addItem(legalFeeItems, "New build supplement", 250);
    }
    if (enquiry.shared_ownership === "yes") {
      addItem(legalFeeItems, "Shared ownership supplement", 300);
    }
    if (enquiry.help_to_buy === "yes") {
      addItem(legalFeeItems, "Help to Buy / scheme supplement", 200);
    }
    if (enquiry.is_company === "yes") {
      addItem(legalFeeItems, "Company buyer supplement", 400);
    }
    if (enquiry.buy_to_let === "yes") {
      addItem(legalFeeItems, "Buy to let supplement", 150);
    }
  }

  if (enquiry.transaction_type === "remortgage") {
    baseFee = getPriceBandFee(price, [
      { max: 500000, fee: 595 },
      { max: 1000000, fee: 745 },
      { max: Infinity, fee: 945 },
    ]);
    addItem(legalFeeItems, "Base legal fee", baseFee);

    if (enquiry.tenure === "leasehold") {
      addItem(legalFeeItems, "Leasehold supplement", 250);
    }
    if (enquiry.additional_borrowing === "yes") {
      addItem(legalFeeItems, "Additional borrowing supplement", 75);
    }
    if (enquiry.remortgage_transfer === "yes") {
      addItem(legalFeeItems, "Transfer of equity supplement", 350);
    }
  }

  if (enquiry.transaction_type === "transfer") {
    baseFee = 550;
    addItem(legalFeeItems, "Base legal fee", baseFee);

    if (enquiry.transfer_mortgage === "yes") {
      addItem(legalFeeItems, "Mortgage involved supplement", 150);
    }
    if (enquiry.tenure === "leasehold") {
      addItem(legalFeeItems, "Leasehold supplement", 250);
    }
    if (
      enquiry.owners_changing === "two" ||
      enquiry.owners_changing === "more"
    ) {
      addItem(legalFeeItems, "Multiple owners changing supplement", 150);
    }
  }

  return legalFeeItems;
}

function getBuyerCount(enquiry) {
  if (enquiry.ownership_type === "joint") return 2;
  return 1;
}

function calculateDisbursements(enquiry) {
  const price = toNumber(enquiry.price);
  const disbursementItems = [];

  if (enquiry.transaction_type === "purchase") {
    addItem(
      disbursementItems,
      "Search pack (local, environmental, drainage and chancel)",
      350
    );
    addItem(
      disbursementItems,
      "Land Registry registration fee",
      getLandRegistryFee(price)
    );

    const buyerCount = getBuyerCount(enquiry);
    addItem(disbursementItems, "ID checks", 14.4 * buyerCount);
    addItem(disbursementItems, "OS1 priority search", 8.8);
    addItem(disbursementItems, "Bankruptcy searches (K16)", 7.6 * buyerCount);
    addItem(disbursementItems, "SDLT submission fee", 6);
    addItem(disbursementItems, "AP1 submission fee", 6);

    const sdlt = calculateResidentialSdlt({
      price,
      firstTimeBuyer: enquiry.first_time_buyer,
      additionalProperty: enquiry.additional_property,
      ukResidentForSdlt: enquiry.uk_resident_for_sdlt,
      isCompany: enquiry.is_company,
      sharedOwnership: enquiry.shared_ownership,
    });

    if (sdlt.manualReview) {
      disbursementItems.push({
        label: "Stamp Duty Land Tax",
        amount: 0,
        note: sdlt.note,
      });
    } else {
      disbursementItems.push({
        label: "Stamp Duty Land Tax",
        amount: sdlt.amount,
      });
    }
  }

  if (enquiry.transaction_type === "sale") {
    addItem(disbursementItems, "Office copy entries", 12);
    addItem(disbursementItems, "ID checks", 14.4);
  }

  if (enquiry.transaction_type === "remortgage") {
    addItem(
      disbursementItems,
      "Land Registry registration fee",
      getLandRegistryFee(price)
    );
    addItem(disbursementItems, "ID checks", 14.4);
    addItem(disbursementItems, "OS1 priority search", 8.8);
    addItem(disbursementItems, "Bankruptcy search (K16)", 7.6);
    addItem(disbursementItems, "AP1 submission fee", 6);
  }

  if (enquiry.transaction_type === "transfer") {
    addItem(
      disbursementItems,
      "Land Registry registration fee",
      getLandRegistryFee(price)
    );
    addItem(disbursementItems, "ID checks", 14.4);
    addItem(disbursementItems, "OS1 priority search", 8.8);
    addItem(disbursementItems, "Bankruptcy search (K16)", 7.6);
    addItem(disbursementItems, "AP1 submission fee", 6);
  }

  return disbursementItems;
}

function sumAmounts(items) {
  return items.reduce((sum, item) => sum + (item.amount || 0), 0);
}

function buildBreakdownText({
  legalFeeItems,
  vatAmount,
  legalTotalInclVat,
  disbursementItems,
  disbursementTotal,
  grandTotal,
}) {
  const legalLines = legalFeeItems.map(
    (item) => `${item.label}: ${money(item.amount)}`
  );

  const disbursementLines = disbursementItems.map((item) => {
    if (item.note) {
      return `${item.label}: ${item.note}`;
    }
    return `${item.label}: ${money(item.amount)}`;
  });

  return [
    "LEGAL FEES",
    ...legalLines,
    `VAT: ${money(vatAmount)}`,
    `Total legal fees including VAT: ${money(legalTotalInclVat)}`,
    "",
    "DISBURSEMENTS",
    ...disbursementLines,
    `Total disbursements: ${money(disbursementTotal)}`,
    "",
    `TOTAL ESTIMATED COST: ${money(grandTotal)}`,
  ].join("\n");
}

export function calculateQuote(rawEnquiry) {
  const enquiry = normaliseEnquiry(rawEnquiry);

  const legalFeeItems = calculateLegalFees(enquiry);
  const legalFeeTotalExVat = sumAmounts(legalFeeItems);
  const vatAmount = legalFeeTotalExVat * 0.2;
  const legalTotalInclVat = legalFeeTotalExVat + vatAmount;

  const disbursementItems = calculateDisbursements(enquiry);
  const disbursementTotal = sumAmounts(disbursementItems);

  const grandTotal = legalTotalInclVat + disbursementTotal;
  const disclaimerLines = getDisclaimerLines(enquiry);

  const breakdownText = buildBreakdownText({
    legalFeeItems,
    vatAmount,
    legalTotalInclVat,
    disbursementItems,
    disbursementTotal,
    grandTotal,
  });

  return {
    legalFeeItems,
    legalFeeTotalExVat,
    vatAmount,
    legalTotalInclVat,
    disbursementItems,
    disbursementTotal,
    grandTotal,
    disclaimerLines,
    breakdownText,
  };
}
