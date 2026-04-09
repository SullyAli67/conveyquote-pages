import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import "./App.css";
import logo from "./assets/logo.png";
import { buildQuoteData } from "./buildQuoteData";

type QuoteDataItem = {
  label: string;
  amount: number;
  note?: string;
};

type QuoteLineItem = {
  label: string;
  amount?: number;
  note?: string;
};

type LoadedQuote = {
  breakdownText?: string;
  disclaimerLines?: string[];
  legalFees?: QuoteLineItem[];
  legalFeesExVat?: number;
  vat?: number;
  legalTotalInclVat?: number;
  disbursements?: QuoteLineItem[];
  disbursementTotal?: number;
  grandTotal?: number;
  sdltAmount?: number;
  sdltNote?: string;
  totalIncludingSdlt?: number;
  feeBreakdown?: string;
};

type SummaryRow = {
  label: string;
  value: string;
};

type QuoteForm = {
  type: string;

  name: string;
  email: string;
  phone: string;
  consentToPanel: boolean;

  tenure: string;
  price: string;
  postcode: string;

  mortgage: string;
  ownershipType: string;
  firstTimeBuyer: string;
  newBuild: string;
  sharedOwnership: string;
  helpToBuy: string;
  isCompany: string;
  buyToLet: string;
  giftedDeposit: string;
  additionalProperty: string;
  ukResidentForSdlt: string;
  lifetimeIsa: string;

  saleMortgage: string;
  managementCompany: string;
  tenanted: string;
  numberOfSellers: string;

  currentLender: string;
  newLender: string;
  additionalBorrowing: string;
  remortgageTransfer: string;

  transferMortgage: string;
  ownersChanging: string;

  saleTenure: string;
  salePrice: string;
  salePostcode: string;
  saleMortgageCombined: string;
  managementCompanyCombined: string;
  tenantedCombined: string;
  numberOfSellersCombined: string;

  purchaseTenure: string;
  purchasePrice: string;
  purchasePostcode: string;
  purchaseMortgage: string;
  purchaseOwnershipType: string;
  purchaseFirstTimeBuyer: string;
  purchaseNewBuild: string;
  purchaseSharedOwnership: string;
  purchaseHelpToBuy: string;
  purchaseIsCompany: string;
  purchaseBuyToLet: string;
  purchaseGiftedDeposit: string;
  purchaseAdditionalProperty: string;
  purchaseUkResidentForSdlt: string;
  purchaseLifetimeIsa: string;

  remortgageTransferTenure: string;
  remortgageTransferPrice: string;
  remortgageTransferPostcode: string;
  remortgageTransferCurrentLender: string;
  remortgageTransferNewLender: string;
  remortgageTransferAdditionalBorrowing: string;
  remortgageTransferHasMortgage: string;
  remortgageTransferOwnersChanging: string;
  remortgageTransferOwnershipType: string;
};

type ApprovedQuoteData = {
  legalFees: QuoteDataItem[];
  disbursements: QuoteDataItem[];
  vat: number;
  sdltAmount?: number;
  sdltNote?: string;
  totalIncludingSdlt?: number;
};

type ApprovedQuoteForm = {
  clientName: string;
  clientEmail: string;
  transactionType: string;
  tenure: string;
  propertyPrice: string;
  quoteAmount: string;
  quoteReference: string;
  feeBreakdown: string;
  nextSteps: string;
  quoteData: ApprovedQuoteData;
};

type LoadedEnquiry = {
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  transaction_type?: string;
  reference?: string;
  consent_to_panel?: string;

  tenure?: string;
  price?: string | number;
  postcode?: string;

  mortgage?: string;
  ownership_type?: string;
  first_time_buyer?: string;
  new_build?: string;
  shared_ownership?: string;
  help_to_buy?: string;
  is_company?: string;
  buy_to_let?: string;
  gifted_deposit?: string;
  additional_property?: string;
  uk_resident_for_sdlt?: string;
  lifetime_isa?: string;

  sale_mortgage?: string;
  management_company?: string;
  tenanted?: string;
  number_of_sellers?: string;

  current_lender?: string;
  new_lender?: string;
  additional_borrowing?: string;
  remortgage_transfer?: string;

  transfer_mortgage?: string;
  owners_changing?: string;

  sale_tenure?: string;
  sale_price?: string | number;
  sale_postcode?: string;
  sale_mortgage_combined?: string;
  management_company_combined?: string;
  tenanted_combined?: string;
  number_of_sellers_combined?: string;

  purchase_tenure?: string;
  purchase_price?: string | number;
  purchase_postcode?: string;
  purchase_mortgage?: string;
  purchase_ownership_type?: string;
  purchase_first_time_buyer?: string;
  purchase_new_build?: string;
  purchase_shared_ownership?: string;
  purchase_help_to_buy?: string;
  purchase_is_company?: string;
  purchase_buy_to_let?: string;
  purchase_gifted_deposit?: string;
  purchase_additional_property?: string;
  purchase_uk_resident_for_sdlt?: string;
  purchase_lifetime_isa?: string;

  remortgage_transfer_tenure?: string;
  remortgage_transfer_price?: string | number;
  remortgage_transfer_postcode?: string;
  remortgage_transfer_current_lender?: string;
  remortgage_transfer_new_lender?: string;
  remortgage_transfer_additional_borrowing?: string;
  remortgage_transfer_has_mortgage?: string;
  remortgage_transfer_owners_changing?: string;
  remortgage_transfer_ownership_type?: string;

  quote?: LoadedQuote | null;
};

const initialFormState: QuoteForm = {
  type: "",

  name: "",
  email: "",
  phone: "",
  consentToPanel: false,

  tenure: "",
  price: "",
  postcode: "",

  mortgage: "",
  ownershipType: "",
  firstTimeBuyer: "",
  newBuild: "",
  sharedOwnership: "",
  helpToBuy: "",
  isCompany: "",
  buyToLet: "",
  giftedDeposit: "",
  additionalProperty: "",
  ukResidentForSdlt: "",
  lifetimeIsa: "",

  saleMortgage: "",
  managementCompany: "",
  tenanted: "",
  numberOfSellers: "",

  currentLender: "",
  newLender: "",
  additionalBorrowing: "",
  remortgageTransfer: "",

  transferMortgage: "",
  ownersChanging: "",

  saleTenure: "",
  salePrice: "",
  salePostcode: "",
  saleMortgageCombined: "",
  managementCompanyCombined: "",
  tenantedCombined: "",
  numberOfSellersCombined: "",

  purchaseTenure: "",
  purchasePrice: "",
  purchasePostcode: "",
  purchaseMortgage: "",
  purchaseOwnershipType: "",
  purchaseFirstTimeBuyer: "",
  purchaseNewBuild: "",
  purchaseSharedOwnership: "",
  purchaseHelpToBuy: "",
  purchaseIsCompany: "",
  purchaseBuyToLet: "",
  purchaseGiftedDeposit: "",
  purchaseAdditionalProperty: "",
  purchaseUkResidentForSdlt: "",
  purchaseLifetimeIsa: "",

  remortgageTransferTenure: "",
  remortgageTransferPrice: "",
  remortgageTransferPostcode: "",
  remortgageTransferCurrentLender: "",
  remortgageTransferNewLender: "",
  remortgageTransferAdditionalBorrowing: "",
  remortgageTransferHasMortgage: "",
  remortgageTransferOwnersChanging: "",
  remortgageTransferOwnershipType: "",
};

const defaultApprovedNextSteps =
  "If you would like to proceed, please click the Instruct Us button in this email. Once we receive your instruction, we will contact you with the next steps and client care documentation. If you have any questions in the meantime, please email info@conveyquote.uk.";

const initialApprovedQuoteState: ApprovedQuoteForm = {
  clientName: "",
  clientEmail: "",
  transactionType: "",
  tenure: "",
  propertyPrice: "",
  quoteAmount: "",
  quoteReference: "",
  feeBreakdown: "",
  nextSteps: defaultApprovedNextSteps,
  quoteData: {
    legalFees: [],
    disbursements: [],
    vat: 0,
    sdltAmount: undefined,
    sdltNote: undefined,
    totalIncludingSdlt: undefined,
  },
};

function toNumber(value: string | number | undefined | null) {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: string | number | undefined | null) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "Not provided";
  return `£${num.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function prettifyValue(value: string | number | boolean | undefined | null) {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  if (value === true) return "Yes";
  if (value === false) return "No";

  const str = String(value).trim();
  if (!str) return "Not provided";

  const lower = str.toLowerCase();

  if (lower === "yes") return "Yes";
  if (lower === "no") return "No";
  if (lower === "mortgage") return "Mortgage";
  if (lower === "cash") return "Cash";
  if (lower === "joint") return "Joint";
  if (lower === "individual") return "Individual";
  if (lower === "company") return "Company";
  if (lower === "one") return "One owner";
  if (lower === "two") return "Two owners";
  if (lower === "more") return "More than two owners";
  if (str === "1") return "1";
  if (str === "2") return "2";
  if (str === "3") return "3 or more";

  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getTransactionLabel(type: string | undefined) {
  if (type === "purchase") return "Purchase";
  if (type === "sale") return "Sale";
  if (type === "sale_purchase") return "Sale and Purchase";
  if (type === "remortgage") return "Remortgage";
  if (type === "transfer") return "Transfer of Equity";
  if (type === "remortgage_transfer") {
    return "Remortgage and Transfer of Equity";
  }
  return "Not provided";
}

function getBuyerCountFromOwnershipType(ownershipType?: string) {
  return ownershipType === "joint" ? 2 : 1;
}

function getSellerCount(numberOfSellers?: string) {
  if (numberOfSellers === "2") return 2;
  if (numberOfSellers === "3") return 3;
  return 1;
}

function calculateStandardSdlt(price: number) {
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

function calculateFirstTimeBuyerSdlt(price: number) {
  if (price > 625000) {
    return calculateStandardSdlt(price);
  }

  let tax = 0;

  if (price > 425000) {
    tax += (price - 425000) * 0.05;
  }

  return Math.max(0, tax);
}

function calculateAdminSdlt({
  price,
  firstTimeBuyer,
  additionalProperty,
  ukResidentForSdlt,
  isCompany,
  sharedOwnership,
}: {
  price: number;
  firstTimeBuyer: string;
  additionalProperty: string;
  ukResidentForSdlt: string;
  isCompany: string;
  sharedOwnership: string;
}) {
  const manualReview =
    sharedOwnership === "yes" || isCompany === "yes" || price <= 0;

  if (manualReview) {
    return {
      amount: 0,
      manualReview: true,
      note: price <= 0 ? "Enter a valid price" : "Manual review recommended",
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
    amount: baseTax + surcharge,
    manualReview: false,
    note: "",
  };
}

function SummaryCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="card admin-card-tight">
      <h3 style={{ marginTop: 0, marginBottom: "14px" }}>{title}</h3>
      {children}
    </div>
  );
}

function SummaryGrid({ rows }: { rows: SummaryRow[] }) {
  return (
    <div className="summary-grid">
      {rows.map((row) => (
        <div key={`${row.label}-${row.value}`} className="summary-stat">
          <div className="summary-stat__label">{row.label}</div>
          <div className="summary-stat__value">{row.value}</div>
        </div>
      ))}
    </div>
  );
}

function DetailTable({ rows }: { rows: SummaryRow[] }) {
  return (
    <div className="detail-table">
      {rows.map((row) => (
        <div key={`${row.label}-${row.value}`} className="detail-row">
          <div className="detail-row__label">{row.label}</div>
          <div className="detail-row__value">{row.value}</div>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [form, setForm] = useState<QuoteForm>(initialFormState);
  const [approvedQuote, setApprovedQuote] = useState<ApprovedQuoteForm>(
    initialApprovedQuoteState
  );

  const [adminPasscode, setAdminPasscode] = useState("");
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [isLoadingEnquiry, setIsLoadingEnquiry] = useState(false);
  const [loadedEnquiryMessage, setLoadedEnquiryMessage] = useState("");
  const [loadedEnquiry, setLoadedEnquiry] = useState<LoadedEnquiry | null>(
    null
  );

  const [vatCalculatorNet, setVatCalculatorNet] = useState("");
  const [sdltPrice, setSdltPrice] = useState("");
  const [sdltFirstTimeBuyer, setSdltFirstTimeBuyer] = useState("no");
  const [sdltAdditionalProperty, setSdltAdditionalProperty] = useState("no");
  const [sdltUkResident, setSdltUkResident] = useState("yes");
  const [sdltIsCompany, setSdltIsCompany] = useState("no");
  const [sdltSharedOwnership, setSdltSharedOwnership] = useState("no");

  const ADMIN_PASSCODE = "1212";

  const currentPath = window.location.pathname;
  const isAdminPage = currentPath === "/admin";
  const currentUrl = new URL(window.location.href);
  const refFromUrl = currentUrl.searchParams.get("ref") || "";

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, type, value } = e.target;

    if (type === "checkbox" && e.target instanceof HTMLInputElement) {
      setForm((prev) => ({
        ...prev,
        [name]: e.target.checked,
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleApprovedQuoteChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setApprovedQuote((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleAdminUnlock = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (adminPasscode === ADMIN_PASSCODE) {
      setIsAdminUnlocked(true);
    } else {
      alert("Incorrect passcode");
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/send-quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (result.success) {
        alert("Thank you. Your enquiry has been submitted for review.");
        setForm(initialFormState);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        alert(
          "Sorry, there was a problem submitting your enquiry. Please try again."
        );
        console.error("Send error:", result);
      }
    } catch (error) {
      alert("Sorry, something went wrong while submitting your enquiry.");
      console.error("Request error:", error);
    }
  };

  const buildFeeBreakdown = (quote: LoadedQuote | null | undefined) => {
    if (!quote) return "";

    if (quote.breakdownText) {
      return quote.breakdownText;
    }

    const lines: string[] = [];

    if (Array.isArray(quote.legalFees) && quote.legalFees.length > 0) {
      lines.push("LEGAL FEES");
      quote.legalFees.forEach((item) => {
        lines.push(`${item.label}: £${Number(item.amount || 0).toFixed(2)}`);
      });
    }

    if (typeof quote.legalFeesExVat === "number") {
      lines.push(`Legal fees ex VAT: £${quote.legalFeesExVat.toFixed(2)}`);
    }

    if (typeof quote.vat === "number") {
      lines.push(`VAT: £${quote.vat.toFixed(2)}`);
    }

    if (typeof quote.legalTotalInclVat === "number") {
      lines.push(
        `Total legal fees including VAT: £${quote.legalTotalInclVat.toFixed(2)}`
      );
    }

    if (Array.isArray(quote.disbursements) && quote.disbursements.length > 0) {
      lines.push("");
      lines.push("DISBURSEMENTS");
      quote.disbursements.forEach((item) => {
        if (item.note) {
          lines.push(`${item.label}: ${item.note}`);
        } else {
          lines.push(`${item.label}: £${Number(item.amount || 0).toFixed(2)}`);
        }
      });
    }

    if (typeof quote.disbursementTotal === "number") {
      lines.push(`Total disbursements: £${quote.disbursementTotal.toFixed(2)}`);
    }

    if (typeof quote.grandTotal === "number") {
      lines.push("");
      lines.push(
        `TOTAL LEGAL FEES + DISBURSEMENTS: £${quote.grandTotal.toFixed(2)}`
      );
    }

    if (typeof quote.sdltAmount === "number") {
      lines.push(`Estimated SDLT: £${quote.sdltAmount.toFixed(2)}`);
    } else if (quote.sdltNote) {
      lines.push(`SDLT: ${quote.sdltNote}`);
    }

    if (typeof quote.totalIncludingSdlt === "number") {
      lines.push("");
      lines.push(
        `TOTAL INCLUDING SDLT: £${quote.totalIncludingSdlt.toFixed(2)}`
      );
    } else if (typeof quote.grandTotal === "number") {
      lines.push("");
      lines.push(`TOTAL ESTIMATED COST: £${quote.grandTotal.toFixed(2)}`);
    }

    if (
      Array.isArray(quote.disclaimerLines) &&
      quote.disclaimerLines.length > 0
    ) {
      lines.push("");
      lines.push("IMPORTANT NOTES");
      quote.disclaimerLines.forEach((item) => {
        lines.push(item);
      });
    }

    return lines.join("\n");
  };

  const rebuildApprovedQuoteFromQuoteData = (
    quoteData: ApprovedQuoteData
  ) => {
    const legalFeesExVat = quoteData.legalFees.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );

    const vat = Number((legalFeesExVat * 0.2).toFixed(2));

    const disbursementTotal = quoteData.disbursements.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );

    const grandTotal = Number(
      (legalFeesExVat + vat + disbursementTotal).toFixed(2)
    );

    const totalIncludingSdlt =
      typeof quoteData.sdltAmount === "number"
        ? Number((grandTotal + quoteData.sdltAmount).toFixed(2))
        : undefined;

    const feeBreakdownLines: string[] = [];

    feeBreakdownLines.push("LEGAL FEES");
    quoteData.legalFees.forEach((item) => {
      feeBreakdownLines.push(
        `${item.label}: £${Number(item.amount || 0).toFixed(2)}`
      );
    });
    feeBreakdownLines.push(`VAT: £${vat.toFixed(2)}`);
    feeBreakdownLines.push(
      `Total legal fees including VAT: £${(legalFeesExVat + vat).toFixed(2)}`
    );

    feeBreakdownLines.push("");
    feeBreakdownLines.push("DISBURSEMENTS");
    quoteData.disbursements.forEach((item) => {
      if (item.note) {
        feeBreakdownLines.push(`${item.label}: ${item.note}`);
      } else {
        feeBreakdownLines.push(
          `${item.label}: £${Number(item.amount || 0).toFixed(2)}`
        );
      }
    });
    feeBreakdownLines.push(
      `Total disbursements: £${disbursementTotal.toFixed(2)}`
    );

    feeBreakdownLines.push("");
    feeBreakdownLines.push(
      `TOTAL LEGAL FEES + DISBURSEMENTS: £${grandTotal.toFixed(2)}`
    );

    if (typeof quoteData.sdltAmount === "number") {
      feeBreakdownLines.push(
        `Estimated SDLT: £${quoteData.sdltAmount.toFixed(2)}`
      );
    } else if (quoteData.sdltNote) {
      feeBreakdownLines.push(`SDLT: ${quoteData.sdltNote}`);
    }

    if (typeof totalIncludingSdlt === "number") {
      feeBreakdownLines.push("");
      feeBreakdownLines.push(
        `TOTAL INCLUDING SDLT: £${totalIncludingSdlt.toFixed(2)}`
      );
    } else {
      feeBreakdownLines.push("");
      feeBreakdownLines.push(`TOTAL ESTIMATED COST: £${grandTotal.toFixed(2)}`);
    }

    return {
      quoteData: {
        ...quoteData,
        vat,
        totalIncludingSdlt,
      },
      quoteAmount:
        typeof totalIncludingSdlt === "number"
          ? totalIncludingSdlt.toFixed(2)
          : grandTotal.toFixed(2),
      feeBreakdown: feeBreakdownLines.join("\n"),
    };
  };

  const handleQuoteItemAmountChange = (
    section: "legalFees" | "disbursements",
    index: number,
    value: string
  ) => {
    const amount = Number(value);

    setApprovedQuote((prev) => {
      const updatedSection = prev.quoteData[section].map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              amount: Number.isFinite(amount) ? amount : 0,
            }
          : item
      );

      const newQuoteData = {
        ...prev.quoteData,
        [section]: updatedSection,
      };

      const rebuilt = rebuildApprovedQuoteFromQuoteData(newQuoteData);

      return {
        ...prev,
        quoteData: rebuilt.quoteData,
        quoteAmount: rebuilt.quoteAmount,
        feeBreakdown: rebuilt.feeBreakdown,
      };
    });
  };

  const handleRemoveQuoteItem = (
    section: "legalFees" | "disbursements",
    index: number
  ) => {
    setApprovedQuote((prev) => {
      const updatedSection = prev.quoteData[section].filter(
        (_, itemIndex) => itemIndex !== index
      );

      const newQuoteData = {
        ...prev.quoteData,
        [section]: updatedSection,
      };

      const rebuilt = rebuildApprovedQuoteFromQuoteData(newQuoteData);

      return {
        ...prev,
        quoteData: rebuilt.quoteData,
        quoteAmount: rebuilt.quoteAmount,
        feeBreakdown: rebuilt.feeBreakdown,
      };
    });
  };

  const rebuildApprovedQuoteFromEnquiry = (enquiry: LoadedEnquiry) => {
    const type = enquiry.transaction_type || "";

    const built = buildQuoteData({
      type,
      price: enquiry.price ? String(enquiry.price) : "",
      tenure: enquiry.tenure || "",
      mortgage: enquiry.mortgage || "",
      ownershipType: enquiry.ownership_type || "",
      firstTimeBuyer: enquiry.first_time_buyer || "",
      additionalProperty: enquiry.additional_property || "",
      ukResidentForSdlt: enquiry.uk_resident_for_sdlt || "",
      giftedDeposit: enquiry.gifted_deposit || "",
      newBuild: enquiry.new_build || "",
      sharedOwnership: enquiry.shared_ownership || "",
      helpToBuy: enquiry.help_to_buy || "",
      isCompany: enquiry.is_company || "",
      buyToLet: enquiry.buy_to_let || "",
      lifetimeIsa: enquiry.lifetime_isa || "",
      saleMortgage: enquiry.sale_mortgage || "",
      managementCompany: enquiry.management_company || "",
      tenanted: enquiry.tenanted || "",
      numberOfSellers: enquiry.number_of_sellers || "",
      additionalBorrowing: enquiry.additional_borrowing || "",
      remortgageTransfer: enquiry.remortgage_transfer || "",
      transferMortgage: enquiry.transfer_mortgage || "",
      ownersChanging: enquiry.owners_changing || "",
      saleTenure: enquiry.sale_tenure || "",
      salePrice: enquiry.sale_price ? String(enquiry.sale_price) : "",
      salePostcode: enquiry.sale_postcode || "",
      saleMortgageCombined: enquiry.sale_mortgage_combined || "",
      managementCompanyCombined: enquiry.management_company_combined || "",
      tenantedCombined: enquiry.tenanted_combined || "",
      numberOfSellersCombined: enquiry.number_of_sellers_combined || "",
      purchaseTenure: enquiry.purchase_tenure || "",
      purchasePrice: enquiry.purchase_price ? String(enquiry.purchase_price) : "",
      purchasePostcode: enquiry.purchase_postcode || "",
      purchaseMortgage: enquiry.purchase_mortgage || "",
      purchaseOwnershipType: enquiry.purchase_ownership_type || "",
      purchaseFirstTimeBuyer: enquiry.purchase_first_time_buyer || "",
      purchaseNewBuild: enquiry.purchase_new_build || "",
      purchaseSharedOwnership: enquiry.purchase_shared_ownership || "",
      purchaseHelpToBuy: enquiry.purchase_help_to_buy || "",
      purchaseIsCompany: enquiry.purchase_is_company || "",
      purchaseBuyToLet: enquiry.purchase_buy_to_let || "",
      purchaseGiftedDeposit: enquiry.purchase_gifted_deposit || "",
      purchaseAdditionalProperty: enquiry.purchase_additional_property || "",
      purchaseUkResidentForSdlt:
        enquiry.purchase_uk_resident_for_sdlt || "",
      purchaseLifetimeIsa: enquiry.purchase_lifetime_isa || "",
      remortgageTransferTenure: enquiry.remortgage_transfer_tenure || "",
      remortgageTransferPrice: enquiry.remortgage_transfer_price
        ? String(enquiry.remortgage_transfer_price)
        : "",
      remortgageTransferPostcode:
        enquiry.remortgage_transfer_postcode || "",
      remortgageTransferCurrentLender:
        enquiry.remortgage_transfer_current_lender || "",
      remortgageTransferNewLender:
        enquiry.remortgage_transfer_new_lender || "",
      remortgageTransferAdditionalBorrowing:
        enquiry.remortgage_transfer_additional_borrowing || "",
      remortgageTransferHasMortgage:
        enquiry.remortgage_transfer_has_mortgage || "",
      remortgageTransferOwnersChanging:
        enquiry.remortgage_transfer_owners_changing || "",
      remortgageTransferOwnershipType:
        enquiry.remortgage_transfer_ownership_type || "",
    });

    const quoteData: ApprovedQuoteData = {
      legalFees: built.legalFees,
      disbursements: built.disbursements,
      vat: built.vat,
      sdltAmount: built.sdltAmount,
      sdltNote: built.sdltNote,
      totalIncludingSdlt: built.totalIncludingSdlt,
    };

    const rebuilt = rebuildApprovedQuoteFromQuoteData(quoteData);

    const propertyPrice =
      type === "sale_purchase"
        ? `Sale ${formatMoney(enquiry.sale_price)} | Purchase ${formatMoney(
            enquiry.purchase_price
          )}`
        : type === "remortgage_transfer"
        ? formatMoney(enquiry.remortgage_transfer_price)
        : enquiry.price
        ? formatMoney(enquiry.price)
        : "";

    const tenureSummary =
      type === "sale_purchase"
        ? `${prettifyValue(enquiry.sale_tenure)} / ${prettifyValue(
            enquiry.purchase_tenure
          )}`
        : type === "remortgage_transfer"
        ? prettifyValue(enquiry.remortgage_transfer_tenure)
        : prettifyValue(enquiry.tenure);

    return {
      clientName: enquiry.client_name || "",
      clientEmail: enquiry.client_email || "",
      transactionType: type,
      tenure: tenureSummary,
      propertyPrice,
      quoteAmount: rebuilt.quoteAmount,
      quoteReference: enquiry.reference || "",
      feeBreakdown: rebuilt.feeBreakdown,
      nextSteps: defaultApprovedNextSteps,
      quoteData: rebuilt.quoteData,
    };
  };

  const handleApprovedQuoteSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const payload = {
      name: approvedQuote.clientName,
      email: approvedQuote.clientEmail,
      type: approvedQuote.transactionType,
      tenure: approvedQuote.tenure,
      price: approvedQuote.propertyPrice,
      quoteAmount: approvedQuote.quoteAmount,
      quoteReference: approvedQuote.quoteReference,
      feeBreakdown: approvedQuote.feeBreakdown,
      nextSteps: approvedQuote.nextSteps,
      quoteData: approvedQuote.quoteData,
    };

    try {
      const response = await fetch("/api/send-approved-quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        alert("Approved client quote sent successfully.");
        setApprovedQuote(initialApprovedQuoteState);
        setLoadedEnquiryMessage("");
        setLoadedEnquiry(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        alert("Sorry, there was a problem sending the approved quote.");
        console.error("Approved quote send error:", result);
      }
    } catch (error) {
      alert("Sorry, something went wrong while sending the approved quote.");
      console.error("Approved quote request error:", error);
    }
  };

  const loadEnquiryByReference = async (reference: string) => {
    if (!reference) return;

    setIsLoadingEnquiry(true);
    setLoadedEnquiryMessage("");

    try {
      const response = await fetch(
        `/api/get-enquiry?ref=${encodeURIComponent(reference)}`
      );
      const result = await response.json();

      if (result.success && result.enquiry) {
        const enquiry: LoadedEnquiry = result.enquiry;
        const quote: LoadedQuote | null = result.adminQuote || enquiry.quote || null;

        setLoadedEnquiry(enquiry);

        if (quote) {
          const quoteData: ApprovedQuoteData = {
            legalFees: Array.isArray(quote.legalFees)
              ? quote.legalFees.map((item) => ({
                  label: item.label,
                  amount: Number(item.amount || 0),
                  note: item.note,
                }))
              : [],
            disbursements: Array.isArray(quote.disbursements)
              ? quote.disbursements.map((item) => ({
                  label: item.label,
                  amount: Number(item.amount || 0),
                  note: item.note,
                }))
              : [],
            vat: typeof quote.vat === "number" ? quote.vat : 0,
            sdltAmount:
              typeof quote.sdltAmount === "number" ? quote.sdltAmount : undefined,
            sdltNote: quote.sdltNote,
            totalIncludingSdlt:
              typeof quote.totalIncludingSdlt === "number"
                ? quote.totalIncludingSdlt
                : undefined,
          };

          const rebuilt = rebuildApprovedQuoteFromQuoteData(quoteData);

          setApprovedQuote({
            clientName: enquiry.client_name || "",
            clientEmail: enquiry.client_email || "",
            transactionType: enquiry.transaction_type || "",
            tenure:
              enquiry.transaction_type === "sale_purchase"
                ? `${prettifyValue(enquiry.sale_tenure)} / ${prettifyValue(
                    enquiry.purchase_tenure
                  )}`
                : enquiry.transaction_type === "remortgage_transfer"
                ? prettifyValue(enquiry.remortgage_transfer_tenure)
                : prettifyValue(enquiry.tenure),
            propertyPrice:
              enquiry.transaction_type === "sale_purchase"
                ? `Sale ${formatMoney(
                    enquiry.sale_price
                  )} | Purchase ${formatMoney(enquiry.purchase_price)}`
                : enquiry.transaction_type === "remortgage_transfer"
                ? formatMoney(enquiry.remortgage_transfer_price)
                : enquiry.price
                ? formatMoney(enquiry.price)
                : "",
            quoteAmount: rebuilt.quoteAmount,
            quoteReference: enquiry.reference || "",
            feeBreakdown:
              quote.feeBreakdown || rebuilt.feeBreakdown || buildFeeBreakdown(quote),
            nextSteps: defaultApprovedNextSteps,
            quoteData: rebuilt.quoteData,
          });

          if (typeof quote.legalFeesExVat === "number") {
            setVatCalculatorNet(quote.legalFeesExVat.toFixed(2));
          } else {
            const legalFeesExVat = quoteData.legalFees.reduce(
              (sum, item) => sum + Number(item.amount || 0),
              0
            );
            setVatCalculatorNet(legalFeesExVat.toFixed(2));
          }
        } else {
          setApprovedQuote(rebuildApprovedQuoteFromEnquiry(enquiry));
        }

        const purchasePriceForSdlt =
          enquiry.transaction_type === "sale_purchase"
            ? enquiry.purchase_price
            : enquiry.price;

        const purchaseFirstTimeBuyer =
          enquiry.transaction_type === "sale_purchase"
            ? enquiry.purchase_first_time_buyer
            : enquiry.first_time_buyer;

        const purchaseAdditionalProperty =
          enquiry.transaction_type === "sale_purchase"
            ? enquiry.purchase_additional_property
            : enquiry.additional_property;

        const purchaseUkResident =
          enquiry.transaction_type === "sale_purchase"
            ? enquiry.purchase_uk_resident_for_sdlt
            : enquiry.uk_resident_for_sdlt;

        const purchaseIsCompany =
          enquiry.transaction_type === "sale_purchase"
            ? enquiry.purchase_is_company
            : enquiry.is_company;

        const purchaseSharedOwnership =
          enquiry.transaction_type === "sale_purchase"
            ? enquiry.purchase_shared_ownership
            : enquiry.shared_ownership;

        setSdltPrice(purchasePriceForSdlt ? String(purchasePriceForSdlt) : "");
        setSdltFirstTimeBuyer(purchaseFirstTimeBuyer || "no");
        setSdltAdditionalProperty(purchaseAdditionalProperty || "no");
        setSdltUkResident(purchaseUkResident || "yes");
        setSdltIsCompany(purchaseIsCompany || "no");
        setSdltSharedOwnership(purchaseSharedOwnership || "no");

        setLoadedEnquiryMessage(`Loaded enquiry ${reference}`);
      } else {
        setLoadedEnquiryMessage(result.error || "Could not load enquiry.");
      }
    } catch (error) {
      console.error("Load enquiry error:", error);
      setLoadedEnquiryMessage("Error loading enquiry.");
    } finally {
      setIsLoadingEnquiry(false);
    }
  };

  useEffect(() => {
    if (isAdminPage && isAdminUnlocked && refFromUrl) {
      loadEnquiryByReference(refFromUrl);
    }
  }, [isAdminPage, isAdminUnlocked, refFromUrl]);

  const isPurchase = form.type === "purchase";
  const isSale = form.type === "sale";
  const isSalePurchase = form.type === "sale_purchase";
  const isRemortgage = form.type === "remortgage";
  const isTransfer = form.type === "transfer";
  const isRemortgageTransfer = form.type === "remortgage_transfer";

  const usesSingleMatterDetails =
    isPurchase || isSale || isRemortgage || isTransfer;

  const singleSdltHint =
    form.ukResidentForSdlt === "no"
      ? "Non-UK resident surcharge may apply"
      : form.additionalProperty === "yes"
      ? "Higher rates of SDLT may apply"
      : form.firstTimeBuyer === "yes"
      ? "First-time buyer relief may apply"
      : "Standard residential SDLT likely";

  const combinedPurchaseSdltHint =
    form.purchaseUkResidentForSdlt === "no"
      ? "Non-UK resident surcharge may apply"
      : form.purchaseAdditionalProperty === "yes"
      ? "Higher rates of SDLT may apply"
      : form.purchaseFirstTimeBuyer === "yes"
      ? "First-time buyer relief may apply"
      : "Standard residential SDLT likely";

  const legalFeesExVat = useMemo(
    () =>
      approvedQuote.quoteData.legalFees.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      ),
    [approvedQuote.quoteData.legalFees]
  );

  const disbursementTotal = useMemo(
    () =>
      approvedQuote.quoteData.disbursements.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      ),
    [approvedQuote.quoteData.disbursements]
  );

  const vatNet = toNumber(vatCalculatorNet);
  const vatAmount = vatNet * 0.2;
  const vatGross = vatNet + vatAmount;

  const sdltResult = useMemo(
    () =>
      calculateAdminSdlt({
        price: toNumber(sdltPrice),
        firstTimeBuyer: sdltFirstTimeBuyer,
        additionalProperty: sdltAdditionalProperty,
        ukResidentForSdlt: sdltUkResident,
        isCompany: sdltIsCompany,
        sharedOwnership: sdltSharedOwnership,
      }),
    [
      sdltPrice,
      sdltFirstTimeBuyer,
      sdltAdditionalProperty,
      sdltUkResident,
      sdltIsCompany,
      sdltSharedOwnership,
    ]
  );

  const enquirySummaryRows: SummaryRow[] = loadedEnquiry
    ? [
        {
          label: "Reference",
          value: loadedEnquiry.reference || "Not provided",
        },
        {
          label: "Client",
          value: prettifyValue(loadedEnquiry.client_name),
        },
        {
          label: "Email",
          value: prettifyValue(loadedEnquiry.client_email),
        },
        {
          label: "Phone",
          value: prettifyValue(loadedEnquiry.client_phone),
        },
        {
          label: "Transaction",
          value: getTransactionLabel(loadedEnquiry.transaction_type),
        },
        {
          label: "Consent to panel",
          value: prettifyValue(loadedEnquiry.consent_to_panel),
        },
      ]
    : [];

  const matterSpecificRows: SummaryRow[] = useMemo(() => {
    if (!loadedEnquiry) return [];

    if (loadedEnquiry.transaction_type === "purchase") {
      const buyerCount = getBuyerCountFromOwnershipType(
        loadedEnquiry.ownership_type
      );

      return [
        { label: "Tenure", value: prettifyValue(loadedEnquiry.tenure) },
        { label: "Price", value: formatMoney(loadedEnquiry.price) },
        { label: "Postcode", value: prettifyValue(loadedEnquiry.postcode) },
        {
          label: "Buyer type",
          value: prettifyValue(loadedEnquiry.ownership_type),
        },
        { label: "Number of buyers", value: String(buyerCount) },
        {
          label: "Mortgage or cash",
          value: prettifyValue(loadedEnquiry.mortgage),
        },
        {
          label: "First time buyer",
          value: prettifyValue(loadedEnquiry.first_time_buyer),
        },
        {
          label: "Additional property",
          value: prettifyValue(loadedEnquiry.additional_property),
        },
        {
          label: "UK resident for SDLT",
          value: prettifyValue(loadedEnquiry.uk_resident_for_sdlt),
        },
        {
          label: "Buy to let",
          value: prettifyValue(loadedEnquiry.buy_to_let),
        },
        {
          label: "New build",
          value: prettifyValue(loadedEnquiry.new_build),
        },
        {
          label: "Shared ownership",
          value: prettifyValue(loadedEnquiry.shared_ownership),
        },
        {
          label: "Help to Buy / scheme",
          value: prettifyValue(loadedEnquiry.help_to_buy),
        },
        {
          label: "Buying via company",
          value: prettifyValue(loadedEnquiry.is_company),
        },
        {
          label: "Gifted deposit",
          value: prettifyValue(loadedEnquiry.gifted_deposit),
        },
        {
          label: "Lifetime ISA",
          value: prettifyValue(loadedEnquiry.lifetime_isa),
        },
      ];
    }

    if (loadedEnquiry.transaction_type === "sale") {
      const sellerCount = getSellerCount(loadedEnquiry.number_of_sellers);

      return [
        { label: "Tenure", value: prettifyValue(loadedEnquiry.tenure) },
        { label: "Price", value: formatMoney(loadedEnquiry.price) },
        { label: "Postcode", value: prettifyValue(loadedEnquiry.postcode) },
        {
          label: "Number of sellers",
          value: sellerCount === 3 ? "3 or more" : String(sellerCount),
        },
        {
          label: "Mortgage to redeem",
          value: prettifyValue(loadedEnquiry.sale_mortgage),
        },
        {
          label: "Management company / service charge",
          value: prettifyValue(loadedEnquiry.management_company),
        },
        {
          label: "Tenanted",
          value: prettifyValue(loadedEnquiry.tenanted),
        },
      ];
    }

    if (loadedEnquiry.transaction_type === "sale_purchase") {
      const sellerCount = getSellerCount(
        loadedEnquiry.number_of_sellers_combined
      );
      const buyerCount = getBuyerCountFromOwnershipType(
        loadedEnquiry.purchase_ownership_type
      );

      return [
        { label: "Sale tenure", value: prettifyValue(loadedEnquiry.sale_tenure) },
        { label: "Sale price", value: formatMoney(loadedEnquiry.sale_price) },
        {
          label: "Sale postcode",
          value: prettifyValue(loadedEnquiry.sale_postcode),
        },
        {
          label: "Sale mortgage to redeem",
          value: prettifyValue(loadedEnquiry.sale_mortgage_combined),
        },
        {
          label: "Sale management company / service charge",
          value: prettifyValue(loadedEnquiry.management_company_combined),
        },
        {
          label: "Sale tenanted",
          value: prettifyValue(loadedEnquiry.tenanted_combined),
        },
        {
          label: "Number of sellers",
          value: sellerCount === 3 ? "3 or more" : String(sellerCount),
        },
        {
          label: "Purchase tenure",
          value: prettifyValue(loadedEnquiry.purchase_tenure),
        },
        {
          label: "Purchase price",
          value: formatMoney(loadedEnquiry.purchase_price),
        },
        {
          label: "Purchase postcode",
          value: prettifyValue(loadedEnquiry.purchase_postcode),
        },
        {
          label: "Mortgage or cash",
          value: prettifyValue(loadedEnquiry.purchase_mortgage),
        },
        {
          label: "Buyer type",
          value: prettifyValue(loadedEnquiry.purchase_ownership_type),
        },
        { label: "Number of buyers", value: String(buyerCount) },
        {
          label: "First time buyer",
          value: prettifyValue(loadedEnquiry.purchase_first_time_buyer),
        },
        {
          label: "Additional property",
          value: prettifyValue(loadedEnquiry.purchase_additional_property),
        },
        {
          label: "UK resident for SDLT",
          value: prettifyValue(loadedEnquiry.purchase_uk_resident_for_sdlt),
        },
        {
          label: "Buy to let",
          value: prettifyValue(loadedEnquiry.purchase_buy_to_let),
        },
        {
          label: "New build",
          value: prettifyValue(loadedEnquiry.purchase_new_build),
        },
        {
          label: "Shared ownership",
          value: prettifyValue(loadedEnquiry.purchase_shared_ownership),
        },
        {
          label: "Help to Buy / scheme",
          value: prettifyValue(loadedEnquiry.purchase_help_to_buy),
        },
        {
          label: "Buying via company",
          value: prettifyValue(loadedEnquiry.purchase_is_company),
        },
        {
          label: "Gifted deposit",
          value: prettifyValue(loadedEnquiry.purchase_gifted_deposit),
        },
        {
          label: "Lifetime ISA",
          value: prettifyValue(loadedEnquiry.purchase_lifetime_isa),
        },
      ];
    }

    if (loadedEnquiry.transaction_type === "remortgage") {
      return [
        { label: "Tenure", value: prettifyValue(loadedEnquiry.tenure) },
        { label: "Value", value: formatMoney(loadedEnquiry.price) },
        { label: "Postcode", value: prettifyValue(loadedEnquiry.postcode) },
        {
          label: "Current lender",
          value: prettifyValue(loadedEnquiry.current_lender),
        },
        {
          label: "New lender",
          value: prettifyValue(loadedEnquiry.new_lender),
        },
        {
          label: "Additional borrowing",
          value: prettifyValue(loadedEnquiry.additional_borrowing),
        },
        {
          label: "Transfer of equity at same time",
          value: prettifyValue(loadedEnquiry.remortgage_transfer),
        },
        {
          label: "Ownership type",
          value: prettifyValue(loadedEnquiry.ownership_type),
        },
      ];
    }

    if (loadedEnquiry.transaction_type === "transfer") {
      return [
        { label: "Tenure", value: prettifyValue(loadedEnquiry.tenure) },
        { label: "Value", value: formatMoney(loadedEnquiry.price) },
        { label: "Postcode", value: prettifyValue(loadedEnquiry.postcode) },
        {
          label: "Mortgage on property",
          value: prettifyValue(loadedEnquiry.transfer_mortgage),
        },
        {
          label: "Owners changing",
          value: prettifyValue(loadedEnquiry.owners_changing),
        },
      ];
    }

    if (loadedEnquiry.transaction_type === "remortgage_transfer") {
      return [
        {
          label: "Tenure",
          value: prettifyValue(loadedEnquiry.remortgage_transfer_tenure),
        },
        {
          label: "Value",
          value: formatMoney(loadedEnquiry.remortgage_transfer_price),
        },
        {
          label: "Postcode",
          value: prettifyValue(loadedEnquiry.remortgage_transfer_postcode),
        },
        {
          label: "Current lender",
          value: prettifyValue(
            loadedEnquiry.remortgage_transfer_current_lender
          ),
        },
        {
          label: "New lender",
          value: prettifyValue(loadedEnquiry.remortgage_transfer_new_lender),
        },
        {
          label: "Additional borrowing",
          value: prettifyValue(
            loadedEnquiry.remortgage_transfer_additional_borrowing
          ),
        },
        {
          label: "Ownership type",
          value: prettifyValue(
            loadedEnquiry.remortgage_transfer_ownership_type
          ),
        },
        {
          label: "Mortgage on property",
          value: prettifyValue(
            loadedEnquiry.remortgage_transfer_has_mortgage
          ),
        },
        {
          label: "Owners changing",
          value: prettifyValue(
            loadedEnquiry.remortgage_transfer_owners_changing
          ),
        },
      ];
    }

    return [];
  }, [loadedEnquiry]);

  const quoteSummaryRows: SummaryRow[] = [
    {
      label: "Legal fees ex VAT",
      value: formatMoney(legalFeesExVat),
    },
    {
      label: "VAT",
      value: formatMoney(approvedQuote.quoteData.vat),
    },
    {
      label: "Legal fees inc VAT",
      value: formatMoney(legalFeesExVat + approvedQuote.quoteData.vat),
    },
    {
      label: "Disbursements",
      value: formatMoney(disbursementTotal),
    },
    {
      label: "Quote total",
      value: formatMoney(approvedQuote.quoteAmount),
    },
    {
      label:
        typeof approvedQuote.quoteData.sdltAmount === "number"
          ? "Loaded SDLT"
          : "SDLT check",
      value:
        typeof approvedQuote.quoteData.sdltAmount === "number"
          ? formatMoney(approvedQuote.quoteData.sdltAmount)
          : sdltResult.manualReview
          ? sdltResult.note
          : formatMoney(sdltResult.amount),
    },
  ];

  return (
    <div className="page">
      <header className="hero">
        <div className="hero__inner">
          <div className="hero__brand">
            <img src={logo} alt="ConveyQuote UK" className="hero__logo" />
          </div>

          <div className="hero__text">
            <span className="eyebrow">
              {isAdminPage
                ? "Internal Quote Approval"
                : "Online Conveyancing Quotes"}
            </span>
            <h1>
              {isAdminPage
                ? "Approve and send client quotes"
                : "Fast, clear conveyancing quotes with solicitor oversight"}
            </h1>
            <p className="hero__summary">
              {isAdminPage
                ? "Use this internal page to review a saved enquiry, check the prebuilt quote and issue the client-facing quote email."
                : "Get a tailored quote for your sale, purchase, sale and purchase, remortgage, transfer of equity, or remortgage with transfer of equity. We review the details before issuing your quote so you get a clearer starting point."}
            </p>

            <div className="hero__points">
              {isAdminPage ? (
                <>
                  <span>Internal use only</span>
                  <span>Auto-loaded enquiry</span>
                  <span>Approval workflow</span>
                </>
              ) : (
                <>
                  <span>Clear pricing</span>
                  <span>Solicitor reviewed</span>
                  <span>Simple online process</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container">
        {!isAdminPage && (
          <>
            <section className="card card--form">
              <div className="section-heading">
                <div>
                  <h2>Get a Quote</h2>
                  <p>
                    Start by selecting the type of transaction. We will then
                    show only the questions relevant to your matter.
                  </p>
                </div>
              </div>

              <form className="quote-form" onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="type">Transaction type</label>
                    <select
                      id="type"
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Please select</option>
                      <option value="purchase">Purchase</option>
                      <option value="sale">Sale</option>
                      <option value="sale_purchase">Sale and Purchase</option>
                      <option value="remortgage">Remortgage</option>
                      <option value="transfer">Transfer of Equity</option>
                      <option value="remortgage_transfer">
                        Remortgage and Transfer of Equity
                      </option>
                    </select>
                  </div>
                </div>

                {usesSingleMatterDetails && (
                  <>
                    <div className="section-heading" style={{ marginTop: "10px" }}>
                      <div>
                        <h2>Matter Details</h2>
                        <p>Please complete the details below.</p>
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor="tenure">Tenure</label>
                        <select
                          id="tenure"
                          name="tenure"
                          value={form.tenure}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Please select</option>
                          <option value="freehold">Freehold</option>
                          <option value="leasehold">Leasehold</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="price">
                          {isSale ? "Sale price (£)" : "Property price / value (£)"}
                        </label>
                        <input
                          id="price"
                          type="number"
                          name="price"
                          placeholder="e.g. 325000"
                          value={form.price}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="field">
                        <label htmlFor="postcode">Property postcode</label>
                        <input
                          id="postcode"
                          type="text"
                          name="postcode"
                          placeholder="e.g. B15 1AA"
                          value={form.postcode}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {isPurchase && (
                  <>
                    <div className="section-heading" style={{ marginTop: "10px" }}>
                      <div>
                        <h2>Purchase Details</h2>
                        <p>
                          These questions help us assess the likely complexity,
                          pricing and SDLT position.
                        </p>
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor="mortgage">Mortgage or cash</label>
                        <select
                          id="mortgage"
                          name="mortgage"
                          value={form.mortgage}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Please select</option>
                          <option value="mortgage">Mortgage</option>
                          <option value="cash">Cash</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="ownershipType">Buyer type</label>
                        <select
                          id="ownershipType"
                          name="ownershipType"
                          value={form.ownershipType}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="individual">Individual</option>
                          <option value="joint">Joint buyers</option>
                          <option value="company">Company</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="firstTimeBuyer">First time buyer?</label>
                        <select
                          id="firstTimeBuyer"
                          name="firstTimeBuyer"
                          value={form.firstTimeBuyer}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="additionalProperty">
                          Will you own another property after completion?
                        </label>
                        <select
                          id="additionalProperty"
                          name="additionalProperty"
                          value={form.additionalProperty}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="ukResidentForSdlt">
                          UK resident for SDLT purposes?
                        </label>
                        <select
                          id="ukResidentForSdlt"
                          name="ukResidentForSdlt"
                          value={form.ukResidentForSdlt}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="buyToLet">Buy to let?</label>
                        <select
                          id="buyToLet"
                          name="buyToLet"
                          value={form.buyToLet}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="newBuild">New build?</label>
                        <select
                          id="newBuild"
                          name="newBuild"
                          value={form.newBuild}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="sharedOwnership">Shared ownership?</label>
                        <select
                          id="sharedOwnership"
                          name="sharedOwnership"
                          value={form.sharedOwnership}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="helpToBuy">Help to Buy / scheme?</label>
                        <select
                          id="helpToBuy"
                          name="helpToBuy"
                          value={form.helpToBuy}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="isCompany">Buying via company?</label>
                        <select
                          id="isCompany"
                          name="isCompany"
                          value={form.isCompany}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="giftedDeposit">Any gifted deposit?</label>
                        <select
                          id="giftedDeposit"
                          name="giftedDeposit"
                          value={form.giftedDeposit}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="lifetimeIsa">Using a Lifetime ISA?</label>
                        <select
                          id="lifetimeIsa"
                          name="lifetimeIsa"
                          value={form.lifetimeIsa}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field field--full">
                        <label htmlFor="sdltHint">SDLT guidance</label>
                        <input id="sdltHint" type="text" value={singleSdltHint} readOnly />
                      </div>
                    </div>

                    <div className="form-footer" style={{ paddingTop: "0" }}>
                      <p className="form-note">
                        SDLT is highly fact-sensitive. Any figure produced later
                        will be an estimate only and may change depending on
                        buyer status, reliefs, surcharge position and the final
                        transaction structure.
                      </p>
                    </div>
                  </>
                )}

                {isSale && (
                  <>
                    <div className="section-heading" style={{ marginTop: "10px" }}>
                      <div>
                        <h2>Sale Details</h2>
                        <p>These questions help us understand the likely work involved in the sale.</p>
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor="saleMortgage">Existing mortgage to redeem?</label>
                        <select
                          id="saleMortgage"
                          name="saleMortgage"
                          value={form.saleMortgage}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="managementCompany">
                          Management company / service charge?
                        </label>
                        <select
                          id="managementCompany"
                          name="managementCompany"
                          value={form.managementCompany}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="numberOfSellers">How many sellers?</label>
                        <select
                          id="numberOfSellers"
                          name="numberOfSellers"
                          value={form.numberOfSellers}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Please select</option>
                          <option value="1">1 seller</option>
                          <option value="2">2 sellers</option>
                          <option value="3">3 or more sellers</option>
                        </select>
                      </div>

                      <div className="field field--full">
                        <label htmlFor="tenanted">Is the property tenanted?</label>
                        <select
                          id="tenanted"
                          name="tenanted"
                          value={form.tenanted}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {isSalePurchase && (
                  <>
                    <div className="section-heading" style={{ marginTop: "10px" }}>
                      <div>
                        <h2>Sale Details</h2>
                        <p>Complete the details for the property you are selling.</p>
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor="saleTenure">Sale tenure</label>
                        <select
                          id="saleTenure"
                          name="saleTenure"
                          value={form.saleTenure}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Please select</option>
                          <option value="freehold">Freehold</option>
                          <option value="leasehold">Leasehold</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="salePrice">Sale price (£)</label>
                        <input
                          id="salePrice"
                          type="number"
                          name="salePrice"
                          placeholder="e.g. 325000"
                          value={form.salePrice}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="field">
                        <label htmlFor="salePostcode">Sale postcode</label>
                        <input
                          id="salePostcode"
                          type="text"
                          name="salePostcode"
                          placeholder="e.g. B15 1AA"
                          value={form.salePostcode}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="field">
                        <label htmlFor="saleMortgageCombined">Existing mortgage to redeem?</label>
                        <select
                          id="saleMortgageCombined"
                          name="saleMortgageCombined"
                          value={form.saleMortgageCombined}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="managementCompanyCombined">
                          Management company / service charge?
                        </label>
                        <select
                          id="managementCompanyCombined"
                          name="managementCompanyCombined"
                          value={form.managementCompanyCombined}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="numberOfSellersCombined">How many sellers?</label>
                        <select
                          id="numberOfSellersCombined"
                          name="numberOfSellersCombined"
                          value={form.numberOfSellersCombined}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Please select</option>
                          <option value="1">1 seller</option>
                          <option value="2">2 sellers</option>
                          <option value="3">3 or more sellers</option>
                        </select>
                      </div>

                      <div className="field field--full">
                        <label htmlFor="tenantedCombined">Is the sale property tenanted?</label>
                        <select
                          id="tenantedCombined"
                          name="tenantedCombined"
                          value={form.tenantedCombined}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                    </div>

                    <div className="section-heading" style={{ marginTop: "18px" }}>
                      <div>
                        <h2>Purchase Details</h2>
                        <p>Complete the details for the property you are buying.</p>
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor="purchaseTenure">Purchase tenure</label>
                        <select
                          id="purchaseTenure"
                          name="purchaseTenure"
                          value={form.purchaseTenure}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Please select</option>
                          <option value="freehold">Freehold</option>
                          <option value="leasehold">Leasehold</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="purchasePrice">Purchase price (£)</label>
                        <input
                          id="purchasePrice"
                          type="number"
                          name="purchasePrice"
                          placeholder="e.g. 425000"
                          value={form.purchasePrice}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="field">
                        <label htmlFor="purchasePostcode">Purchase postcode</label>
                        <input
                          id="purchasePostcode"
                          type="text"
                          name="purchasePostcode"
                          placeholder="e.g. B91 1AA"
                          value={form.purchasePostcode}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="field">
                        <label htmlFor="purchaseMortgage">Mortgage or cash</label>
                        <select
                          id="purchaseMortgage"
                          name="purchaseMortgage"
                          value={form.purchaseMortgage}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Please select</option>
                          <option value="mortgage">Mortgage</option>
                          <option value="cash">Cash</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="purchaseOwnershipType">Buyer type</label>
                        <select
                          id="purchaseOwnershipType"
                          name="purchaseOwnershipType"
                          value={form.purchaseOwnershipType}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="individual">Individual</option>
                          <option value="joint">Joint buyers</option>
                          <option value="company">Company</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="purchaseFirstTimeBuyer">First time buyer?</label>
                        <select
                          id="purchaseFirstTimeBuyer"
                          name="purchaseFirstTimeBuyer"
                          value={form.purchaseFirstTimeBuyer}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="purchaseAdditionalProperty">
                          Will you own another property after completion?
                        </label>
                        <select
                          id="purchaseAdditionalProperty"
                          name="purchaseAdditionalProperty"
                          value={form.purchaseAdditionalProperty}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="purchaseUkResidentForSdlt">
                          UK resident for SDLT purposes?
                        </label>
                        <select
                          id="purchaseUkResidentForSdlt"
                          name="purchaseUkResidentForSdlt"
                          value={form.purchaseUkResidentForSdlt}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="purchaseBuyToLet">Buy to let?</label>
                        <select
                          id="purchaseBuyToLet"
                          name="purchaseBuyToLet"
                          value={form.purchaseBuyToLet}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="purchaseNewBuild">New build?</label>
                        <select
                          id="purchaseNewBuild"
                          name="purchaseNewBuild"
                          value={form.purchaseNewBuild}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="purchaseSharedOwnership">Shared ownership?</label>
                        <select
                          id="purchaseSharedOwnership"
                          name="purchaseSharedOwnership"
                          value={form.purchaseSharedOwnership}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="purchaseHelpToBuy">Help to Buy / scheme?</label>
                        <select
                          id="purchaseHelpToBuy"
                          name="purchaseHelpToBuy"
                          value={form.purchaseHelpToBuy}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="purchaseIsCompany">Buying via company?</label>
                        <select
                          id="purchaseIsCompany"
                          name="purchaseIsCompany"
                          value={form.purchaseIsCompany}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="purchaseGiftedDeposit">Any gifted deposit?</label>
                        <select
                          id="purchaseGiftedDeposit"
                          name="purchaseGiftedDeposit"
                          value={form.purchaseGiftedDeposit}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="purchaseLifetimeIsa">Using a Lifetime ISA?</label>
                        <select
                          id="purchaseLifetimeIsa"
                          name="purchaseLifetimeIsa"
                          value={form.purchaseLifetimeIsa}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field field--full">
                        <label htmlFor="combinedPurchaseSdltHint">
                          SDLT guidance for purchase
                        </label>
                        <input
                          id="combinedPurchaseSdltHint"
                          type="text"
                          value={combinedPurchaseSdltHint}
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="form-footer" style={{ paddingTop: "0" }}>
                      <p className="form-note">
                        For combined sale and purchase matters, SDLT only applies
                        to the purchase side. Any figure produced later will be
                        an estimate only and may still need solicitor review.
                      </p>
                    </div>
                  </>
                )}

                {isRemortgage && (
                  <>
                    <div className="section-heading" style={{ marginTop: "10px" }}>
                      <div>
                        <h2>Remortgage Details</h2>
                        <p>These questions help us assess the remortgage work involved.</p>
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor="currentLender">Current lender</label>
                        <input
                          id="currentLender"
                          type="text"
                          name="currentLender"
                          placeholder="e.g. Halifax"
                          value={form.currentLender}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="field">
                        <label htmlFor="newLender">New lender (if known)</label>
                        <input
                          id="newLender"
                          type="text"
                          name="newLender"
                          placeholder="e.g. Nationwide"
                          value={form.newLender}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="field">
                        <label htmlFor="additionalBorrowing">Additional borrowing?</label>
                        <select
                          id="additionalBorrowing"
                          name="additionalBorrowing"
                          value={form.additionalBorrowing}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="remortgageTransfer">
                          Transfer of equity at same time?
                        </label>
                        <select
                          id="remortgageTransfer"
                          name="remortgageTransfer"
                          value={form.remortgageTransfer}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {isTransfer && (
                  <>
                    <div className="section-heading" style={{ marginTop: "10px" }}>
                      <div>
                        <h2>Transfer Details</h2>
                        <p>
                          These questions help us understand the ownership
                          change and whether any lender is involved.
                        </p>
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor="transferMortgage">
                          Is there a mortgage on the property?
                        </label>
                        <select
                          id="transferMortgage"
                          name="transferMortgage"
                          value={form.transferMortgage}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="ownersChanging">
                          How many owners are changing?
                        </label>
                        <select
                          id="ownersChanging"
                          name="ownersChanging"
                          value={form.ownersChanging}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="one">One owner</option>
                          <option value="two">Two owners</option>
                          <option value="more">More than two</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {isRemortgageTransfer && (
                  <>
                    <div className="section-heading" style={{ marginTop: "10px" }}>
                      <div>
                        <h2>Property Details</h2>
                        <p>
                          These details apply to the property being remortgaged
                          and transferred.
                        </p>
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor="remortgageTransferTenure">Tenure</label>
                        <select
                          id="remortgageTransferTenure"
                          name="remortgageTransferTenure"
                          value={form.remortgageTransferTenure}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Please select</option>
                          <option value="freehold">Freehold</option>
                          <option value="leasehold">Leasehold</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="remortgageTransferPrice">Property value (£)</label>
                        <input
                          id="remortgageTransferPrice"
                          type="number"
                          name="remortgageTransferPrice"
                          placeholder="e.g. 325000"
                          value={form.remortgageTransferPrice}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="field">
                        <label htmlFor="remortgageTransferPostcode">Property postcode</label>
                        <input
                          id="remortgageTransferPostcode"
                          type="text"
                          name="remortgageTransferPostcode"
                          placeholder="e.g. B15 1AA"
                          value={form.remortgageTransferPostcode}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="section-heading" style={{ marginTop: "18px" }}>
                      <div>
                        <h2>Remortgage Details</h2>
                        <p>These questions help us assess the remortgage element.</p>
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor="remortgageTransferCurrentLender">
                          Current lender
                        </label>
                        <input
                          id="remortgageTransferCurrentLender"
                          type="text"
                          name="remortgageTransferCurrentLender"
                          placeholder="e.g. Halifax"
                          value={form.remortgageTransferCurrentLender}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="field">
                        <label htmlFor="remortgageTransferNewLender">
                          New lender
                        </label>
                        <input
                          id="remortgageTransferNewLender"
                          type="text"
                          name="remortgageTransferNewLender"
                          placeholder="e.g. Nationwide"
                          value={form.remortgageTransferNewLender}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="field">
                        <label htmlFor="remortgageTransferAdditionalBorrowing">
                          Additional borrowing?
                        </label>
                        <select
                          id="remortgageTransferAdditionalBorrowing"
                          name="remortgageTransferAdditionalBorrowing"
                          value={form.remortgageTransferAdditionalBorrowing}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="remortgageTransferOwnershipType">
                          Borrower type
                        </label>
                        <select
                          id="remortgageTransferOwnershipType"
                          name="remortgageTransferOwnershipType"
                          value={form.remortgageTransferOwnershipType}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="individual">Individual</option>
                          <option value="joint">Joint borrowers</option>
                          <option value="company">Company</option>
                        </select>
                      </div>
                    </div>

                    <div className="section-heading" style={{ marginTop: "18px" }}>
                      <div>
                        <h2>Transfer of Equity Details</h2>
                        <p>These questions help us assess the transfer element.</p>
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor="remortgageTransferHasMortgage">
                          Is there a mortgage on the property?
                        </label>
                        <select
                          id="remortgageTransferHasMortgage"
                          name="remortgageTransferHasMortgage"
                          value={form.remortgageTransferHasMortgage}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="remortgageTransferOwnersChanging">
                          How many owners are changing?
                        </label>
                        <select
                          id="remortgageTransferOwnersChanging"
                          name="remortgageTransferOwnersChanging"
                          value={form.remortgageTransferOwnersChanging}
                          onChange={handleChange}
                        >
                          <option value="">Please select</option>
                          <option value="one">One owner</option>
                          <option value="two">Two owners</option>
                          <option value="more">More than two</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {form.type && (
                  <>
                    <div className="section-heading" style={{ marginTop: "10px" }}>
                      <div>
                        <h2>Your Contact Details</h2>
                        <p>
                          Please provide your contact details so we can review
                          your enquiry and respond.
                        </p>
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor="name">Full name</label>
                        <input
                          id="name"
                          type="text"
                          name="name"
                          placeholder="Your full name"
                          value={form.name}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="field">
                        <label htmlFor="email">Email address</label>
                        <input
                          id="email"
                          type="email"
                          name="email"
                          placeholder="you@example.com"
                          value={form.email}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="field field--full">
                        <label htmlFor="phone">Phone number</label>
                        <input
                          id="phone"
                          type="tel"
                          name="phone"
                          placeholder="Your contact number"
                          value={form.phone}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div className="form-footer">
                      <div className="inline-checkbox">
                        <input
                          id="consentToPanel"
                          type="checkbox"
                          name="consentToPanel"
                          checked={form.consentToPanel}
                          onChange={handleChange}
                          required
                        />
                        <label htmlFor="consentToPanel">
                          I agree that the information I provide may be used to
                          prepare my quote, contact me about my enquiry, and be
                          passed to one or more selected panel solicitor firms
                          for the purpose of progressing my conveyancing matter.
                        </label>
                      </div>

                      <p className="form-note">
                        By submitting this form, you are requesting a quote
                        only. No solicitor-client relationship is formed at this
                        stage. Your details may be shared with an appropriate
                        panel solicitor firm in order to progress your enquiry.
                      </p>

                      <button type="submit" className="primary-button">
                        Request My Quote
                      </button>
                    </div>
                  </>
                )}
              </form>
            </section>

            <section className="info-grid">
              <article className="card">
                <h3>How it works</h3>
                <ol className="steps">
                  <li>Select your transaction type.</li>
                  <li>Answer only the questions relevant to your matter.</li>
                  <li>
                    We review the details and then issue your quote by email if
                    appropriate.
                  </li>
                </ol>
              </article>

              <article className="card">
                <h3>About ConveyQuote</h3>
                <p>
                  ConveyQuote is designed to make conveyancing quotes clearer,
                  quicker and easier to request, while still allowing legal
                  oversight before the quote is issued.
                </p>
              </article>
            </section>
          </>
        )}

        {isAdminPage && !isAdminUnlocked && (
          <section className="card card--form" style={{ marginTop: "24px" }}>
            <div className="section-heading">
              <div>
                <h2>Admin Access</h2>
                <p>
                  Enter the internal passcode to access the quote approval area.
                </p>
              </div>
            </div>

            <form className="quote-form" onSubmit={handleAdminUnlock}>
              <div className="form-grid">
                <div className="field field--full">
                  <label htmlFor="adminPasscode">Passcode</label>
                  <input
                    id="adminPasscode"
                    type="password"
                    name="adminPasscode"
                    value={adminPasscode}
                    onChange={(e) => setAdminPasscode(e.target.value)}
                    placeholder="Enter passcode"
                    required
                  />
                </div>
              </div>

              <div className="form-footer">
                <p className="form-note">Internal access only.</p>
                <button type="submit" className="primary-button">
                  Unlock Admin
                </button>
              </div>
            </form>
          </section>
        )}

        {isAdminPage && isAdminUnlocked && (
          <>
            <section className="card card--form" style={{ marginTop: "24px" }}>
              <div className="section-heading">
                <div>
                  <h2>Approve and Send Client Quote</h2>
                  <p>
                    Internal use only. Review the loaded enquiry, check the
                    prebuilt quote and send the client-facing quote email.
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                {isLoadingEnquiry && (
                  <p className="form-note">Loading enquiry from reference...</p>
                )}

                {!isLoadingEnquiry && loadedEnquiryMessage && (
                  <p className="form-note">{loadedEnquiryMessage}</p>
                )}

                {!isLoadingEnquiry && !loadedEnquiryMessage && refFromUrl && (
                  <p className="form-note">
                    Admin page unlocked. Ready to load enquiry reference {refFromUrl}.
                  </p>
                )}
              </div>

              {loadedEnquiry && (
                <div className="admin-stack" style={{ marginBottom: "20px" }}>
                  <SummaryCard title="Loaded Enquiry Snapshot">
                    <SummaryGrid rows={enquirySummaryRows} />
                  </SummaryCard>

                  {matterSpecificRows.length > 0 && (
                    <SummaryCard title="Matter Specific Details">
                      <DetailTable rows={matterSpecificRows} />
                    </SummaryCard>
                  )}

                  <SummaryCard title="Quote Summary">
                    <SummaryGrid rows={quoteSummaryRows} />
                  </SummaryCard>

                  <div className="admin-two-col">
                    <SummaryCard title="VAT Calculator">
                      <div className="form-grid">
                        <div className="field field--full">
                          <label htmlFor="vatCalculatorNet">Net amount (£)</label>
                          <input
                            id="vatCalculatorNet"
                            type="text"
                            value={vatCalculatorNet}
                            onChange={(e) => setVatCalculatorNet(e.target.value)}
                            placeholder="e.g. 1000"
                          />
                        </div>
                      </div>

                      <SummaryGrid
                        rows={[
                          {
                            label: "VAT at 20%",
                            value: formatMoney(vatAmount),
                          },
                          {
                            label: "Gross total",
                            value: formatMoney(vatGross),
                          },
                        ]}
                      />
                    </SummaryCard>

                    <SummaryCard title="SDLT Calculator">
                      <div className="form-grid">
                        <div className="field">
                          <label htmlFor="sdltPrice">Price (£)</label>
                          <input
                            id="sdltPrice"
                            type="text"
                            value={sdltPrice}
                            onChange={(e) => setSdltPrice(e.target.value)}
                          />
                        </div>

                        <div className="field">
                          <label htmlFor="sdltFirstTimeBuyer">First time buyer?</label>
                          <select
                            id="sdltFirstTimeBuyer"
                            value={sdltFirstTimeBuyer}
                            onChange={(e) => setSdltFirstTimeBuyer(e.target.value)}
                          >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </div>

                        <div className="field">
                          <label htmlFor="sdltAdditionalProperty">Additional property?</label>
                          <select
                            id="sdltAdditionalProperty"
                            value={sdltAdditionalProperty}
                            onChange={(e) => setSdltAdditionalProperty(e.target.value)}
                          >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </div>

                        <div className="field">
                          <label htmlFor="sdltUkResident">UK resident?</label>
                          <select
                            id="sdltUkResident"
                            value={sdltUkResident}
                            onChange={(e) => setSdltUkResident(e.target.value)}
                          >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </div>

                        <div className="field">
                          <label htmlFor="sdltIsCompany">Buying via company?</label>
                          <select
                            id="sdltIsCompany"
                            value={sdltIsCompany}
                            onChange={(e) => setSdltIsCompany(e.target.value)}
                          >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </div>

                        <div className="field">
                          <label htmlFor="sdltSharedOwnership">Shared ownership?</label>
                          <select
                            id="sdltSharedOwnership"
                            value={sdltSharedOwnership}
                            onChange={(e) => setSdltSharedOwnership(e.target.value)}
                          >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </div>
                      </div>

                      <SummaryGrid
                        rows={[
                          {
                            label: sdltResult.manualReview
                              ? "SDLT status"
                              : "Estimated SDLT",
                            value: sdltResult.manualReview
                              ? sdltResult.note
                              : formatMoney(sdltResult.amount),
                          },
                        ]}
                      />
                    </SummaryCard>
                  </div>
                </div>
              )}

              <form className="quote-form" onSubmit={handleApprovedQuoteSubmit}>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="clientName">Client name</label>
                    <input
                      id="clientName"
                      type="text"
                      name="clientName"
                      value={approvedQuote.clientName}
                      onChange={handleApprovedQuoteChange}
                      readOnly
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="clientEmail">Client email</label>
                    <input
                      id="clientEmail"
                      type="email"
                      name="clientEmail"
                      value={approvedQuote.clientEmail}
                      onChange={handleApprovedQuoteChange}
                      readOnly
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="transactionType">Transaction type</label>
                    <select
                      id="transactionType"
                      name="transactionType"
                      value={approvedQuote.transactionType}
                      onChange={handleApprovedQuoteChange}
                      disabled
                      required
                    >
                      <option value="">Please select</option>
                      <option value="purchase">Purchase</option>
                      <option value="sale">Sale</option>
                      <option value="sale_purchase">Sale and Purchase</option>
                      <option value="remortgage">Remortgage</option>
                      <option value="transfer">Transfer of Equity</option>
                      <option value="remortgage_transfer">
                        Remortgage and Transfer of Equity
                      </option>
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="approvedTenure">Tenure / summary</label>
                    <input
                      id="approvedTenure"
                      type="text"
                      name="tenure"
                      value={approvedQuote.tenure}
                      onChange={handleApprovedQuoteChange}
                      readOnly
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="propertyPrice">Property price / value (£)</label>
                    <input
                      id="propertyPrice"
                      type="text"
                      name="propertyPrice"
                      value={approvedQuote.propertyPrice}
                      onChange={handleApprovedQuoteChange}
                      readOnly
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="quoteAmount">Approved quote amount</label>
                    <input
                      id="quoteAmount"
                      type="text"
                      name="quoteAmount"
                      value={approvedQuote.quoteAmount}
                      readOnly
                      required
                    />
                  </div>

                  <div className="field field--full">
                    <label htmlFor="quoteReference">Quote reference</label>
                    <input
                      id="quoteReference"
                      type="text"
                      name="quoteReference"
                      value={approvedQuote.quoteReference}
                      onChange={handleApprovedQuoteChange}
                      readOnly
                    />
                  </div>

                  <div className="field field--full">
                    <label>Legal fee items</label>
                    <div className="detail-table">
                      {approvedQuote.quoteData.legalFees.map((item, index) => (
                        <div
                          key={`legal-${item.label}-${index}`}
                          className="detail-row"
                        >
                          <div className="detail-row__label">{item.label}</div>
                          <div className="detail-row__value">
                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                alignItems: "center",
                              }}
                            >
                              <input
                                type="number"
                                step="0.01"
                                value={item.amount}
                                onChange={(e) =>
                                  handleQuoteItemAmountChange(
                                    "legalFees",
                                    index,
                                    e.target.value
                                  )
                                }
                              />
                              <button
                                type="button"
                                className="muted-button"
                                onClick={() =>
                                  handleRemoveQuoteItem("legalFees", index)
                                }
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {approvedQuote.quoteData.legalFees.length === 0 && (
                        <div className="detail-row">
                          <div className="detail-row__label">No fee items loaded yet</div>
                          <div className="detail-row__value">Update pricing engine next</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="field field--full">
                    <label>Disbursement items</label>
                    <div className="detail-table">
                      {approvedQuote.quoteData.disbursements.map((item, index) => (
                        <div
                          key={`disbursement-${item.label}-${index}`}
                          className="detail-row"
                        >
                          <div className="detail-row__label">{item.label}</div>
                          <div className="detail-row__value">
                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                alignItems: "center",
                              }}
                            >
                              {item.note ? (
                                <div>{item.note}</div>
                              ) : (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.amount}
                                  onChange={(e) =>
                                    handleQuoteItemAmountChange(
                                      "disbursements",
                                      index,
                                      e.target.value
                                    )
                                  }
                                />
                              )}
                              <button
                                type="button"
                                className="muted-button"
                                onClick={() =>
                                  handleRemoveQuoteItem("disbursements", index)
                                }
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {approvedQuote.quoteData.disbursements.length === 0 && (
                        <div className="detail-row">
                          <div className="detail-row__label">
                            No disbursements loaded yet
                          </div>
                          <div className="detail-row__value">
                            Update pricing engine next
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="field field--full">
                    <label htmlFor="feeBreakdown">Fee notes / breakdown</label>
                    <textarea
                      id="feeBreakdown"
                      name="feeBreakdown"
                      value={approvedQuote.feeBreakdown}
                      onChange={handleApprovedQuoteChange}
                      rows={10}
                    />
                  </div>

                  <div className="field field--full">
                    <label htmlFor="nextSteps">Next steps</label>
                    <textarea
                      id="nextSteps"
                      name="nextSteps"
                      value={approvedQuote.nextSteps}
                      onChange={handleApprovedQuoteChange}
                      rows={5}
                    />
                  </div>
                </div>

                <div className="form-footer action-row">
                  <p className="form-note">
                    Internal tool only. This sends the approved client-facing
                    quote email using the updated approved figures shown above.
                  </p>

                  <button
                    type="button"
                    className="primary-button muted-button"
                    onClick={() => {
                      setApprovedQuote(initialApprovedQuoteState);
                      setLoadedEnquiryMessage("");
                      setLoadedEnquiry(null);
                    }}
                  >
                    Clear Form
                  </button>

                  <button type="submit" className="primary-button">
                    Send Approved Quote
                  </button>
                </div>
              </form>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
