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

type DashboardEnquiry = {
  id: number;
  reference?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  transaction_type?: string;
  status?: string;
  panel_status?: string;
  assigned_firm_name?: string;
  created_at?: string;
};

type PanelFirm = {
  id: number;
  firm_name?: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  active?: number;
  panel_terms_accepted?: number;
  handles_purchase?: number;
  handles_sale?: number;
  handles_remortgage?: number;
  handles_transfer?: number;
  handles_leasehold?: number;
  handles_new_build?: number;
  handles_company_buyers?: number;
  notes?: string | null;
  lender_count?: number;
};

type PanelLender = {
  id: number;
  lender_name?: string;
  active?: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

type PanelMembership = {
  id: number;
  firm_id: number;
  lender_id: number;
  active?: number;
  notes?: string | null;
  last_checked_at?: string | null;
  created_at?: string;
  updated_at?: string;
  firm_name?: string;
  lender_name?: string;
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
  lender: string;
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
  purchaseLender: string;
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
  lender?: string;
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
  purchase_lender?: string;
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

type AdminTab = "dashboard" | "enquiries" | "firms" | "lenders" | "quote";

type LenderEditorState = {
  id: number | null;
  lender_name: string;
  active: boolean;
  notes: string;
};

type PanelAssignmentState = {
  firm_id: number | "";
  firm_name: string;
  referral_fee_payable: boolean;
  referral_fee_amount: string;
  admin_notes: string;
};

type FirmEditorState = {
  id: number | null;
  firm_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  active: boolean;
  panel_terms_accepted: boolean;
  handles_purchase: boolean;
  handles_sale: boolean;
  handles_remortgage: boolean;
  handles_transfer: boolean;
  handles_leasehold: boolean;
  handles_new_build: boolean;
  handles_company_buyers: boolean;
  notes: string;
};

type MembershipEditorState = {
  id: number | null;
  firm_id: number | "";
  lender_id: number | "";
  active: boolean;
  notes: string;
  last_checked_at: string;
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
  lender: "",
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
  purchaseLender: "",
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
  "If you would like to proceed, please click Accept Quote in this email. Once we receive your instruction, we will move your matter to the next stage and contact you with the next steps and client care documentation. If you have any questions in the meantime, please email info@conveyquote.uk.";

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

const initialFirmEditorState: FirmEditorState = {
  id: null,
  firm_name: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  active: true,
  panel_terms_accepted: false,
  handles_purchase: true,
  handles_sale: true,
  handles_remortgage: true,
  handles_transfer: true,
  handles_leasehold: false,
  handles_new_build: false,
  handles_company_buyers: false,
  notes: "",
};

const initialMembershipEditorState: MembershipEditorState = {
  id: null,
  firm_id: "",
  lender_id: "",
  active: true,
  notes: "",
  last_checked_at: "",
};

const initialLenderEditorState: LenderEditorState = {
  id: null,
  lender_name: "",
  active: true,
  notes: "",
};

const initialPanelAssignmentState: PanelAssignmentState = {
  firm_id: "",
  firm_name: "",
  referral_fee_payable: false,
  referral_fee_amount: "",
  admin_notes: "",
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

  if (value === true || value === 1) return "Yes";
  if (value === false || value === 0) return "No";

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

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "14px",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function App() {
  const [form, setForm] = useState<QuoteForm>(initialFormState);
  const [approvedQuote, setApprovedQuote] = useState<ApprovedQuoteForm>(
    initialApprovedQuoteState
  );

  const [lenders, setLenders] = useState<{ id: number; name: string }[]>([]);
  const [loadingLenders, setLoadingLenders] = useState(false);

  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoginError, setAdminLoginError] = useState("");
  const [isAdminLoggingIn, setIsAdminLoggingIn] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminToken, setAdminToken] = useState("");

  // Firm portal state
  const [firmEmail, setFirmEmail] = useState("");
  const [firmPassword, setFirmPassword] = useState("");
  const [firmLoginError, setFirmLoginError] = useState("");
  const [isFirmLoggingIn, setIsFirmLoggingIn] = useState(false);
  const [firmToken, setFirmToken] = useState("");
  const [firmSession, setFirmSession] = useState<{ firm_id: number; firm_name: string } | null>(null);
  const [firmPortalData, setFirmPortalData] = useState<{
    firm: Record<string, unknown>;
    enquiries: Record<string, unknown>[];
    memberships: Record<string, unknown>[];
  } | null>(null);
  const [isLoadingFirmPortal, setIsLoadingFirmPortal] = useState(false);
  const [firmPortalError, setFirmPortalError] = useState("");
  const [firmRespondMessage, setFirmRespondMessage] = useState("");
  const [firmSetPasswordState, setFirmSetPasswordState] = useState<{
    firm_id: number | "";
    portal_email: string;
    password: string;
    confirm: string;
  }>({ firm_id: "", portal_email: "", password: "", confirm: "" });
  const [firmSetPasswordMessage, setFirmSetPasswordMessage] = useState("");

  const [isLoadingEnquiry, setIsLoadingEnquiry] = useState(false);
  const [loadedEnquiryMessage, setLoadedEnquiryMessage] = useState("");
  const [loadedEnquiry, setLoadedEnquiry] = useState<LoadedEnquiry | null>(
    null
  );

  const [manualReference, setManualReference] = useState("");
  const [dashboardEnquiries, setDashboardEnquiries] = useState<
    DashboardEnquiry[]
  >([]);
  const [dashboardFirms, setDashboardFirms] = useState<PanelFirm[]>([]);
  const [panelLenders, setPanelLenders] = useState<PanelLender[]>([]);
  const [panelMemberships, setPanelMemberships] = useState<PanelMembership[]>(
    []
  );
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);

  const [adminTab, setAdminTab] = useState<AdminTab>("dashboard");

  const [selectedFirmId, setSelectedFirmId] = useState<number | null>(null);
  const [firmEditor, setFirmEditor] = useState<FirmEditorState>(
    initialFirmEditorState
  );
  const [membershipEditor, setMembershipEditor] =
    useState<MembershipEditorState>(initialMembershipEditorState);
  const [firmSaveMessage, setFirmSaveMessage] = useState("");
  const [membershipSaveMessage, setMembershipSaveMessage] = useState("");

  const [lenderEditor, setLenderEditor] = useState<LenderEditorState>(initialLenderEditorState);
  const [lenderSaveMessage, setLenderSaveMessage] = useState("");

  const [panelAssignment, setPanelAssignment] = useState<PanelAssignmentState>(initialPanelAssignmentState);
  const [panelAssignMessage, setPanelAssignMessage] = useState("");
  const [isSavingPanelAssignment, setIsSavingPanelAssignment] = useState(false);

  const [enquirySearchQuery, setEnquirySearchQuery] = useState("");
  const [isSearchingEnquiries, setIsSearchingEnquiries] = useState(false);

  const [statusUpdateMessage, setStatusUpdateMessage] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [vatCalculatorNet, setVatCalculatorNet] = useState("");
  const [sdltPrice, setSdltPrice] = useState("");
  const [sdltFirstTimeBuyer, setSdltFirstTimeBuyer] = useState("no");
  const [sdltAdditionalProperty, setSdltAdditionalProperty] = useState("no");
  const [sdltUkResident, setSdltUkResident] = useState("yes");
  const [sdltIsCompany, setSdltIsCompany] = useState("no");
  const [sdltSharedOwnership, setSdltSharedOwnership] = useState("no");

  const currentPath = window.location.pathname;
  const isAdminPage = currentPath === "/admin" || currentPath === "/admin/";
  const isFirmLoginPage = currentPath === "/firm-login" || currentPath === "/firm-login/";
  const isFirmPortalPage = currentPath === "/firm-portal" || currentPath === "/firm-portal/";
  const currentUrl = new URL(window.location.href);
  const refFromUrl = currentUrl.searchParams.get("ref") || "";

  const selectedFirm = useMemo(
    () => dashboardFirms.find((firm) => firm.id === selectedFirmId) || null,
    [dashboardFirms, selectedFirmId]
  );

  const selectedFirmMemberships = useMemo(() => {
    if (!selectedFirmId) return [];
    return panelMemberships
      .filter((membership) => membership.firm_id === selectedFirmId)
      .sort((a, b) =>
        String(a.lender_name || "").localeCompare(String(b.lender_name || ""))
      );
  }, [panelMemberships, selectedFirmId]);

  const activePanelLenders = useMemo(
    () => panelLenders.filter((lender) => Number(lender.active) === 1),
    [panelLenders]
  );

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

  // Helper: fetch with admin token automatically attached
  const adminFetch = (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${adminToken}`,
      },
    });
  };

  const loadDashboardData = async () => {
    setIsLoadingDashboard(true);

    try {
      const [
        enquiriesResponse,
        firmsResponse,
        panelLendersResponse,
        membershipsResponse,
      ] = await Promise.all([
        adminFetch("/api/list-enquiries"),
        adminFetch("/api/list-panel-firms"),
        adminFetch("/api/list-panel-lenders"),
        adminFetch("/api/list-panel-memberships"),
      ]);

      const enquiriesResult = await enquiriesResponse.json();
      const firmsResult = await firmsResponse.json();
      const panelLendersResult = await panelLendersResponse.json();
      const membershipsResult = await membershipsResponse.json();

      setDashboardEnquiries(
        enquiriesResult.success && Array.isArray(enquiriesResult.enquiries)
          ? enquiriesResult.enquiries
          : []
      );

      setDashboardFirms(
        firmsResult.success && Array.isArray(firmsResult.firms)
          ? firmsResult.firms
          : []
      );

      setPanelLenders(
        panelLendersResult.success && Array.isArray(panelLendersResult.lenders)
          ? panelLendersResult.lenders
          : []
      );

      setPanelMemberships(
        membershipsResult.success &&
          Array.isArray(membershipsResult.memberships)
          ? membershipsResult.memberships
          : []
      );
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      setDashboardEnquiries([]);
      setDashboardFirms([]);
      setPanelLenders([]);
      setPanelMemberships([]);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const mapFirmToEditor = (firm: PanelFirm): FirmEditorState => ({
    id: firm.id,
    firm_name: firm.firm_name || "",
    contact_name: firm.contact_name || "",
    contact_email: firm.contact_email || "",
    contact_phone: firm.contact_phone || "",
    active: Number(firm.active) === 1,
    panel_terms_accepted: Number(firm.panel_terms_accepted) === 1,
    handles_purchase: Number(firm.handles_purchase) === 1,
    handles_sale: Number(firm.handles_sale) === 1,
    handles_remortgage: Number(firm.handles_remortgage) === 1,
    handles_transfer: Number(firm.handles_transfer) === 1,
    handles_leasehold: Number(firm.handles_leasehold) === 1,
    handles_new_build: Number(firm.handles_new_build) === 1,
    handles_company_buyers: Number(firm.handles_company_buyers) === 1,
    notes: firm.notes || "",
  });

  const startNewFirm = () => {
    setSelectedFirmId(null);
    setFirmEditor(initialFirmEditorState);
    setMembershipEditor(initialMembershipEditorState);
    setFirmSaveMessage("");
    setMembershipSaveMessage("");
  };

  const selectFirmForEditing = (firm: PanelFirm) => {
    setSelectedFirmId(firm.id);
    setFirmEditor(mapFirmToEditor(firm));
    setMembershipEditor({
      ...initialMembershipEditorState,
      firm_id: firm.id,
    });
    setFirmSaveMessage("");
    setMembershipSaveMessage("");
  };

  const handleFirmEditorTextChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFirmEditor((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveFirm = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFirmSaveMessage("");

    try {
      const response = await adminFetch("/api/save-panel-firm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(firmEditor),
      });

      const result = await response.json();

      if (!result.success) {
        setFirmSaveMessage(result.error || "Failed to save firm.");
        return;
      }

      await loadDashboardData();

      const savedId =
        typeof result.id === "number"
          ? result.id
          : firmEditor.id ?? selectedFirmId ?? null;

      if (savedId) {
        const savedFirm =
          dashboardFirms.find((firm) => firm.id === savedId) ||
          null;
        setSelectedFirmId(savedId);
        setMembershipEditor((prev) => ({
          ...prev,
          firm_id: savedId,
        }));
        if (savedFirm) {
          setFirmEditor(mapFirmToEditor(savedFirm));
        } else {
          setFirmEditor((prev) => ({
            ...prev,
            id: savedId,
          }));
        }
      }

      setFirmSaveMessage(
        result.mode === "created" ? "Firm created." : "Firm updated."
      );
    } catch (error) {
      console.error("Save firm error:", error);
      setFirmSaveMessage("Something went wrong saving the firm.");
    }
  };

  const handleMembershipTextChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setMembershipEditor((prev) => ({
      ...prev,
      [name]:
        name === "firm_id" || name === "lender_id"
          ? value === ""
            ? ""
            : Number(value)
          : value,
    }));
  };

  const handleSaveMembership = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMembershipSaveMessage("");

    if (!membershipEditor.firm_id || !membershipEditor.lender_id) {
      setMembershipSaveMessage("Please select a firm and lender.");
      return;
    }

    try {
      const response = await adminFetch("/api/save-panel-membership", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(membershipEditor),
      });

      const result = await response.json();

      if (!result.success) {
        setMembershipSaveMessage(result.error || "Failed to save membership.");
        return;
      }

      await loadDashboardData();

      setMembershipEditor((prev) => ({
        ...initialMembershipEditorState,
        firm_id: prev.firm_id,
      }));

      setMembershipSaveMessage(
        result.mode === "created"
          ? "Lender panel entry added."
          : "Lender panel entry updated."
      );
    } catch (error) {
      console.error("Save membership error:", error);
      setMembershipSaveMessage("Something went wrong saving the membership.");
    }
  };

  const handleEditMembership = (membership: PanelMembership) => {
    setMembershipEditor({
      id: membership.id,
      firm_id: membership.firm_id,
      lender_id: membership.lender_id,
      active: Number(membership.active) === 1,
      notes: membership.notes || "",
      last_checked_at: membership.last_checked_at || "",
    });
    setMembershipSaveMessage("");
  };

  const handleDeleteMembership = async (id: number) => {
    const confirmed = window.confirm(
      "Delete this lender panel entry from the firm?"
    );
    if (!confirmed) return;

    try {
      const response = await adminFetch("/api/delete-panel-membership", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const result = await response.json();

      if (!result.success) {
        alert(result.error || "Failed to delete lender panel entry.");
        return;
      }

      await loadDashboardData();

      if (membershipEditor.id === id) {
        setMembershipEditor((prev) => ({
          ...initialMembershipEditorState,
          firm_id: prev.firm_id,
        }));
      }

      setMembershipSaveMessage("Lender panel entry deleted.");
    } catch (error) {
      console.error("Delete membership error:", error);
      alert("Something went wrong deleting the lender panel entry.");
    }
  };

  const handleAdminTabChange = async (tab: AdminTab) => {
    setAdminTab(tab);

    if (tab !== "quote") {
      await loadDashboardData();
    }

    if (tab === "firms" && dashboardFirms.length === 0) {
      startNewFirm();
    }

    if (tab === "lenders") {
      setLenderEditor(initialLenderEditorState);
      setLenderSaveMessage("");
    }
  };

  // ── Lender management ─────────────────────────────────────────────────────

  const handleLenderEditorChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setLenderEditor((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveLender = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLenderSaveMessage("");

    try {
      const response = await adminFetch("/api/save-panel-lender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lenderEditor),
      });
      const result = await response.json();

      if (!result.success) {
        setLenderSaveMessage(result.error || "Failed to save lender.");
        return;
      }

      await loadDashboardData();
      setLenderEditor(initialLenderEditorState);
      setLenderSaveMessage(
        result.mode === "created" ? "Lender created." : "Lender updated."
      );
    } catch (error) {
      console.error("Save lender error:", error);
      setLenderSaveMessage("Something went wrong saving the lender.");
    }
  };

  const handleEditLender = (lender: PanelLender) => {
    setLenderEditor({
      id: lender.id,
      lender_name: lender.lender_name || "",
      active: Number(lender.active) === 1,
      notes: lender.notes || "",
    });
    setLenderSaveMessage("");
  };

  const handleDeleteLender = async (id: number) => {
    const lender = panelLenders.find((l) => l.id === id);
    const confirmed = window.confirm(
      `Deactivate "${lender?.lender_name || "this lender"}" from the panel? It will remain in the system but be marked inactive.`
    );
    if (!confirmed) return;

    try {
      const response = await adminFetch("/api/save-panel-lender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          lender_name: lender?.lender_name || "",
          active: false,
          notes: lender?.notes || "",
        }),
      });
      const result = await response.json();

      if (!result.success) {
        setLenderSaveMessage(result.error || "Failed to deactivate lender.");
        return;
      }

      await loadDashboardData();
      if (lenderEditor.id === id) setLenderEditor(initialLenderEditorState);
      setLenderSaveMessage(`"${lender?.lender_name}" deactivated.`);
    } catch (error) {
      console.error("Deactivate lender error:", error);
      setLenderSaveMessage("Something went wrong.");
    }
  };

  // ── Panel assignment ───────────────────────────────────────────────────────

  const handlePanelAssignmentChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox" && e.target instanceof HTMLInputElement) {
      setPanelAssignment((prev) => ({ ...prev, [name]: e.target.checked }));
      return;
    }
    if (name === "firm_id") {
      const firm = dashboardFirms.find((f) => f.id === Number(value));
      setPanelAssignment((prev) => ({
        ...prev,
        firm_id: value === "" ? "" : Number(value),
        firm_name: firm?.firm_name || "",
      }));
      return;
    }
    setPanelAssignment((prev) => ({ ...prev, [name]: value }));
  };

  const handleAssignPanelFirm = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!loadedEnquiry?.reference || !panelAssignment.firm_id) return;

    setIsSavingPanelAssignment(true);
    setPanelAssignMessage("");

    try {
      const response = await adminFetch("/api/assign-panel-firm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: loadedEnquiry.reference,
          firm_id: panelAssignment.firm_id,
          firm_name: panelAssignment.firm_name,
          referral_fee_payable: panelAssignment.referral_fee_payable,
          referral_fee_amount: panelAssignment.referral_fee_amount,
          admin_notes: panelAssignment.admin_notes,
        }),
      });
      const result = await response.json();

      if (!result.success) {
        setPanelAssignMessage(result.error || "Failed to assign firm.");
        return;
      }

      setPanelAssignMessage(`Assigned to ${panelAssignment.firm_name}.`);
      await loadDashboardData();
    } catch (error) {
      console.error("Assign panel firm error:", error);
      setPanelAssignMessage("Something went wrong assigning the firm.");
    } finally {
      setIsSavingPanelAssignment(false);
    }
  };

  // ── Enquiry status update ──────────────────────────────────────────────────

  const handleUpdateEnquiryStatus = async (newStatus: string) => {
    if (!loadedEnquiry?.reference) return;

    setIsUpdatingStatus(true);
    setStatusUpdateMessage("");

    try {
      const response = await adminFetch("/api/update-enquiry-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: loadedEnquiry.reference,
          status: newStatus,
        }),
      });
      const result = await response.json();

      if (!result.success) {
        setStatusUpdateMessage(result.error || "Failed to update status.");
        return;
      }

      setStatusUpdateMessage(`Status updated to "${prettifyValue(newStatus)}".`);
      // Optimistically update local state
      setLoadedEnquiry((prev) => prev ? { ...prev, status: newStatus } : prev);
    } catch (error) {
      console.error("Status update error:", error);
      setStatusUpdateMessage("Something went wrong updating the status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // ── Enquiry search ─────────────────────────────────────────────────────────

  const handleEnquirySearch = async (q: string) => {
    setIsSearchingEnquiries(true);
    try {
      const url = q.trim()
        ? `/api/list-enquiries?q=${encodeURIComponent(q.trim())}`
        : "/api/list-enquiries";
      const response = await adminFetch(url);
      const result = await response.json();
      setDashboardEnquiries(
        result.success && Array.isArray(result.enquiries)
          ? result.enquiries
          : []
      );
    } catch (error) {
      console.error("Enquiry search error:", error);
    } finally {
      setIsSearchingEnquiries(false);
    }
  };

  // ── Admin login ───────────────────────────────────────────────────────────

  const handleAdminUnlock = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAdminLoginError("");
    setIsAdminLoggingIn(true);

    try {
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const result = await response.json();

      if (result.success) {
        setAdminToken(result.token);
        setIsAdminUnlocked(true);
        setAdminPassword("");
        setManualReference(refFromUrl);
        if (!refFromUrl) {
          setAdminTab("dashboard");
          await loadDashboardData();
        }
      } else {
        setAdminLoginError(result.error || "Login failed. Please try again.");
      }
    } catch {
      setAdminLoginError("Something went wrong. Please try again.");
    } finally {
      setIsAdminLoggingIn(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await fetch("/api/admin-logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    } catch {}
    setIsAdminUnlocked(false);
    setAdminToken("");
    setAdminEmail("");
    setLoadedEnquiry(null);
    setDashboardEnquiries([]);
  };

  // ── Firm login ────────────────────────────────────────────────────────────

  const handleFirmLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFirmLoginError("");
    setIsFirmLoggingIn(true);

    try {
      const response = await fetch("/api/firm-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: firmEmail, password: firmPassword }),
      });
      const result = await response.json();

      if (result.success) {
        setFirmToken(result.token);
        setFirmSession({ firm_id: result.firm_id, firm_name: result.firm_name });
        setFirmPassword("");
        window.history.pushState({}, "", "/firm-portal");
        await loadFirmPortalData(result.token);
      } else {
        setFirmLoginError(result.error || "Login failed. Please check your details.");
      }
    } catch {
      setFirmLoginError("Something went wrong. Please try again.");
    } finally {
      setIsFirmLoggingIn(false);
    }
  };

  const handleFirmLogout = async () => {
    try {
      await fetch("/api/firm-logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${firmToken}` },
      });
    } catch {}
    setFirmToken("");
    setFirmSession(null);
    setFirmPortalData(null);
    setFirmEmail("");
    window.history.pushState({}, "", "/firm-login");
  };

  // ── Firm portal data ──────────────────────────────────────────────────────

  const loadFirmPortalData = async (token: string) => {
    setIsLoadingFirmPortal(true);
    setFirmPortalError("");

    try {
      const response = await fetch("/api/firm-portal-data", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      if (result.success) {
        setFirmPortalData(result);
      } else {
        setFirmPortalError(result.error || "Failed to load portal data.");
        if (response.status === 401) {
          setFirmToken("");
          setFirmSession(null);
          window.history.pushState({}, "", "/firm-login");
        }
      }
    } catch {
      setFirmPortalError("Something went wrong loading your data.");
    } finally {
      setIsLoadingFirmPortal(false);
    }
  };

  // ── Firm respond to referral ──────────────────────────────────────────────

  const handleFirmRespond = async (
    reference: string,
    response: "accepted" | "declined",
    notes = ""
  ) => {
    setFirmRespondMessage("");

    try {
      const res = await fetch("/api/firm-respond-referral", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firmToken}`,
        },
        body: JSON.stringify({ reference, response, notes }),
      });
      const result = await res.json();

      if (result.success) {
        setFirmRespondMessage(
          `You have ${response === "accepted" ? "accepted" : "declined"} referral ${reference}.`
        );
        await loadFirmPortalData(firmToken);
      } else {
        setFirmRespondMessage(result.error || "Failed to submit response.");
      }
    } catch {
      setFirmRespondMessage("Something went wrong. Please try again.");
    }
  };

  // ── Admin: set firm portal password ──────────────────────────────────────

  const handleSetFirmPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFirmSetPasswordMessage("");

    if (!firmSetPasswordState.firm_id || !firmSetPasswordState.portal_email || !firmSetPasswordState.password) {
      setFirmSetPasswordMessage("All fields are required.");
      return;
    }
    if (firmSetPasswordState.password !== firmSetPasswordState.confirm) {
      setFirmSetPasswordMessage("Passwords do not match.");
      return;
    }
    if (firmSetPasswordState.password.length < 8) {
      setFirmSetPasswordMessage("Password must be at least 8 characters.");
      return;
    }

    try {
      const response = await fetch("/api/set-firm-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          firm_id: firmSetPasswordState.firm_id,
          portal_email: firmSetPasswordState.portal_email,
          password: firmSetPasswordState.password,
          portal_active: true,
        }),
      });
      const result = await response.json();

      if (result.success) {
        setFirmSetPasswordMessage("Portal credentials saved. The firm can now log in.");
        setFirmSetPasswordState({ firm_id: "", portal_email: "", password: "", confirm: "" });
        await loadDashboardData();
      } else {
        setFirmSetPasswordMessage(result.error || "Failed to save credentials.");
      }
    } catch {
      setFirmSetPasswordMessage("Something went wrong.");
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
      lender: enquiry.lender || "",
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
      purchaseLender: enquiry.purchase_lender || "",
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
      const response = await adminFetch("/api/send-approved-quote", {
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
        setAdminTab("dashboard");

        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete("ref");
        window.history.replaceState({}, "", nextUrl.toString());

        setManualReference("");
        await loadDashboardData();
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
      const response = await adminFetch(
        `/api/get-enquiry?ref=${encodeURIComponent(reference)}`
      );
      const result = await response.json();

      if (result.success && result.enquiry) {
        const enquiry: LoadedEnquiry = result.enquiry;
        const quote: LoadedQuote | null =
          result.adminQuote || enquiry.quote || null;

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
              typeof quote.sdltAmount === "number"
                ? quote.sdltAmount
                : undefined,
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
              quote.feeBreakdown ||
              rebuilt.feeBreakdown ||
              buildFeeBreakdown(quote),
            nextSteps: defaultApprovedNextSteps,
            quoteData: rebuilt.quoteData,
          });

          if (typeof quote.legalFeesExVat === "number") {
            setVatCalculatorNet(quote.legalFeesExVat.toFixed(2));
          } else {
            const recalculatedLegalFeesExVat = quoteData.legalFees.reduce(
              (sum, item) => sum + Number(item.amount || 0),
              0
            );
            setVatCalculatorNet(recalculatedLegalFeesExVat.toFixed(2));
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

        // Seed panel assignment state
        setPanelAssignment(initialPanelAssignmentState);
        setPanelAssignMessage("");
        setStatusUpdateMessage("");

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

  const handleManualReferenceLoad = async () => {
    if (!manualReference.trim()) {
      alert("Please enter a reference.");
      return;
    }

    const nextReference = manualReference.trim();
    setAdminTab("quote");

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("ref", nextReference);
    window.history.replaceState({}, "", nextUrl.toString());

    await loadEnquiryByReference(nextReference);
  };

  const handleOpenDashboardEnquiry = async (reference: string) => {
    if (!reference) return;

    setManualReference(reference);
    setAdminTab("quote");

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("ref", reference);
    window.history.replaceState({}, "", nextUrl.toString());

    await loadEnquiryByReference(reference);
  };

  const handleBackToDashboard = async () => {
    setAdminTab("dashboard");
    setLoadedEnquiry(null);
    setLoadedEnquiryMessage("");
    setApprovedQuote(initialApprovedQuoteState);

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("ref");
    window.history.replaceState({}, "", nextUrl.toString());

    setManualReference("");
    await loadDashboardData();
  };

  useEffect(() => {
    async function loadPublicLenders() {
      setLoadingLenders(true);

      try {
        const publicResponse = await fetch("/api/lenders");
        const publicResult = await publicResponse.json();

        if (publicResult.success && Array.isArray(publicResult.lenders)) {
          setLenders(
            publicResult.lenders.map((item: any) => ({
              id: Number(item.id),
              name: String(item.name || item.lender_name || ""),
            }))
          );
          return;
        }
      } catch (error) {
        console.error("Public lenders endpoint failed, trying panel lenders.");
      }

      try {
        const response = await fetch("/api/list-panel-lenders");
        const result = await response.json();

        if (result.success && Array.isArray(result.lenders)) {
          setLenders(
            result.lenders
              .filter((item: PanelLender) => Number(item.active) === 1)
              .map((item: PanelLender) => ({
                id: Number(item.id),
                name: String(item.lender_name || ""),
              }))
          );
        } else {
          setLenders([]);
        }
      } catch (error) {
        console.error("Failed to load lenders:", error);
        setLenders([]);
      } finally {
        setLoadingLenders(false);
      }
    }

    loadPublicLenders();
  }, []);

  useEffect(() => {
    if (!isAdminPage || !isAdminUnlocked) return;

    if (refFromUrl) {
      setManualReference(refFromUrl);
      setAdminTab("quote");
      void loadEnquiryByReference(refFromUrl);
    } else {
      setAdminTab("dashboard");
      void loadDashboardData();
    }
  }, [isAdminPage, isAdminUnlocked, refFromUrl]);

  // If the user lands directly on /firm-portal with a token in memory, load data
  useEffect(() => {
    if (isFirmPortalPage && firmToken && !firmPortalData && !isLoadingFirmPortal) {
      void loadFirmPortalData(firmToken);
    }
  }, [isFirmPortalPage, firmToken]);

  useEffect(() => {
    if (!selectedFirmId && dashboardFirms.length > 0 && adminTab === "firms") {
      selectFirmForEditing(dashboardFirms[0]);
    }
  }, [dashboardFirms, selectedFirmId, adminTab]);

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

  const vatAmount = toNumber(vatCalculatorNet) * 0.2;
  const vatGross = toNumber(vatCalculatorNet) + vatAmount;

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
          label: "Lender",
          value: prettifyValue(loadedEnquiry.lender),
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
          label: "Purchase lender",
          value: prettifyValue(loadedEnquiry.purchase_lender),
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

  const dashboardSummaryRows: SummaryRow[] = [
    {
      label: "Recent enquiries",
      value: String(dashboardEnquiries.length),
    },
    {
      label: "Active panel firms",
      value: String(
        dashboardFirms.filter((firm) => Number(firm.active) === 1).length
      ),
    },
    {
      label: "Panel lenders",
      value: String(activePanelLenders.length),
    },
    {
      label: "Active lender memberships",
      value: String(
        panelMemberships.filter((membership) => Number(membership.active) === 1)
          .length
      ),
    },
    {
      label: "Purchase enquiries",
      value: String(
        dashboardEnquiries.filter(
          (enquiry) => enquiry.transaction_type === "purchase"
        ).length
      ),
    },
    {
      label: "Sale enquiries",
      value: String(
        dashboardEnquiries.filter(
          (enquiry) => enquiry.transaction_type === "sale"
        ).length
      ),
    },
  ];

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
                ? "Approve quotes and manage panel firms"
                : "Fast, clear conveyancing quotes with solicitor oversight"}
            </h1>
            <p className="hero__summary">
              {isAdminPage
                ? "Use this internal page to review enquiries, send approved quotes, manage panel firms and control lender memberships."
                : "Get a tailored quote for your sale, purchase, sale and purchase, remortgage, transfer of equity, or remortgage with transfer of equity. We review the details before issuing your quote so you get a clearer starting point."}
            </p>

            <div className="hero__points">
              {isAdminPage ? (
                <>
                  <span>Internal use only</span>
                  <span>Firm management</span>
                  <span>Lender panel control</span>
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

                      {form.mortgage === "mortgage" && (
                        <div className="field">
                          <label htmlFor="lender">Lender</label>
                          <select
                            id="lender"
                            name="lender"
                            value={form.lender}
                            onChange={handleChange}
                            required
                          >
                            <option value="">
                              {loadingLenders ? "Loading lenders..." : "Please select"}
                            </option>
                            {lenders.map((lender) => (
                              <option key={lender.id} value={lender.name}>
                                {lender.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

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
                  </>
                )}

                {isSale && (
                  <>
                    <div className="section-heading" style={{ marginTop: "10px" }}>
                      <div>
                        <h2>Sale Details</h2>
                        <p>
                          These questions help us understand the likely work
                          involved in the sale.
                        </p>
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
                        <label htmlFor="saleMortgageCombined">
                          Existing mortgage to redeem?
                        </label>
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
                        <label htmlFor="numberOfSellersCombined">
                          How many sellers?
                        </label>
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
                        <label htmlFor="tenantedCombined">
                          Is the sale property tenanted?
                        </label>
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

                      {form.purchaseMortgage === "mortgage" && (
                        <div className="field">
                          <label htmlFor="purchaseLender">Purchase lender</label>
                          <select
                            id="purchaseLender"
                            name="purchaseLender"
                            value={form.purchaseLender}
                            onChange={handleChange}
                            required
                          >
                            <option value="">
                              {loadingLenders ? "Loading lenders..." : "Please select"}
                            </option>
                            {lenders.map((lender) => (
                              <option key={lender.id} value={lender.name}>
                                {lender.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

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
                  </>
                )}

                {isRemortgage && (
                  <>
                    <div className="section-heading" style={{ marginTop: "10px" }}>
                      <div>
                        <h2>Remortgage Details</h2>
                        <p>
                          These questions help us assess the remortgage work
                          involved.
                        </p>
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
                        <label htmlFor="newLender">New lender</label>
                        <select
                          id="newLender"
                          name="newLender"
                          value={form.newLender}
                          onChange={handleChange}
                        >
                          <option value="">
                            {loadingLenders ? "Loading lenders..." : "Please select"}
                          </option>
                          {lenders.map((lender) => (
                            <option key={lender.id} value={lender.name}>
                              {lender.name}
                            </option>
                          ))}
                        </select>
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
                        <label htmlFor="ownersChanging">How many owners are changing?</label>
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
                        <p>
                          These questions help us assess the remortgage element.
                        </p>
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
                        <label htmlFor="remortgageTransferNewLender">New lender</label>
                        <select
                          id="remortgageTransferNewLender"
                          name="remortgageTransferNewLender"
                          value={form.remortgageTransferNewLender}
                          onChange={handleChange}
                        >
                          <option value="">
                            {loadingLenders ? "Loading lenders..." : "Please select"}
                          </option>
                          {lenders.map((lender) => (
                            <option key={lender.id} value={lender.name}>
                              {lender.name}
                            </option>
                          ))}
                        </select>
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
                        <p>
                          These questions help us assess the transfer element.
                        </p>
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
                        By submitting this form, you are requesting a quote only.
                        No solicitor-client relationship is formed at this stage.
                        Your details may be shared with an appropriate panel
                        solicitor firm in order to progress your enquiry.
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

        {/* ── Firm Login Page ─────────────────────────────────────── */}
        {isFirmLoginPage && !firmSession && (
          <section className="card card--form" style={{ marginTop: "24px", maxWidth: "460px", margin: "40px auto" }}>
            <div className="section-heading">
              <div>
                <h2>Firm Portal Login</h2>
                <p>Log in to view your referred matters and manage your panel profile.</p>
              </div>
            </div>

            <form className="quote-form" onSubmit={(e) => void handleFirmLogin(e)}>
              <div className="form-grid">
                <div className="field field--full">
                  <label htmlFor="firmEmail">Email address</label>
                  <input
                    id="firmEmail"
                    type="email"
                    value={firmEmail}
                    onChange={(e) => setFirmEmail(e.target.value)}
                    placeholder="your@firm.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="field field--full">
                  <label htmlFor="firmPassword">Password</label>
                  <input
                    id="firmPassword"
                    type="password"
                    value={firmPassword}
                    onChange={(e) => setFirmPassword(e.target.value)}
                    placeholder="Your password"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {firmLoginError && (
                <p className="form-note" style={{ color: "#dc2626", marginTop: "10px" }}>
                  {firmLoginError}
                </p>
              )}

              <div className="form-footer">
                <p className="form-note">
                  Access is provided by ConveyQuote. Contact{" "}
                  <a href="mailto:info@conveyquote.uk">info@conveyquote.uk</a> if
                  you need help logging in.
                </p>
                <button type="submit" className="primary-button" disabled={isFirmLoggingIn}>
                  {isFirmLoggingIn ? "Logging in…" : "Log In"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ── Firm Portal Page ─────────────────────────────────────── */}
        {(isFirmPortalPage || (isFirmLoginPage && firmSession)) && firmSession && (
          <section className="card card--form" style={{ marginTop: "24px" }}>
            <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h2>{firmSession.firm_name}</h2>
                <p>Firm portal — referred matters and panel information.</p>
              </div>
              <button
                type="button"
                className="muted-button"
                onClick={() => void handleFirmLogout()}
              >
                Log out
              </button>
            </div>

            {isLoadingFirmPortal && <p className="form-note">Loading portal data…</p>}
            {firmPortalError && <p className="form-note" style={{ color: "#dc2626" }}>{firmPortalError}</p>}
            {firmRespondMessage && (
              <p className="form-note" style={{ background: "#d1fae5", padding: "10px 14px", borderRadius: "6px", color: "#065f46" }}>
                {firmRespondMessage}
              </p>
            )}

            {firmPortalData && (
              <div className="admin-stack" style={{ marginTop: "20px" }}>

                {/* Referred Enquiries */}
                <SummaryCard title="Referred Matters">
                  {firmPortalData.enquiries.length === 0 ? (
                    <p className="form-note">No matters have been referred to your firm yet.</p>
                  ) : (
                    <div className="detail-table">
                      {(firmPortalData.enquiries as Record<string, unknown>[]).map((enq) => {
                        const ref = String(enq.reference || "");
                        const responded = !!enq.firm_response;
                        const firmResp = String(enq.firm_response || "");
                        return (
                          <div key={ref} className="detail-row">
                            <div className="detail-row__label">
                              <strong>{ref}</strong>
                              <div>{String(enq.transaction_type || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</div>
                              <div>
                                {enq.price ? `£${Number(enq.price).toLocaleString("en-GB")}` : ""}
                                {enq.tenure ? ` · ${String(enq.tenure).charAt(0).toUpperCase() + String(enq.tenure).slice(1)}` : ""}
                              </div>
                              {enq.postcode && <div style={{ color: "#6b7280", fontSize: "12px" }}>{String(enq.postcode)}</div>}
                              {Number(enq.referral_fee_payable) === 1 && (
                                <div style={{ fontSize: "12px", color: "#7c3aed" }}>
                                  Referral fee: £{Number(enq.referral_fee_amount || 0).toFixed(2)}
                                </div>
                              )}
                              <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                                Referred: {enq.referred_at ? new Date(String(enq.referred_at)).toLocaleDateString("en-GB") : "—"}
                              </div>
                            </div>
                            <div className="detail-row__value">
                              {responded ? (
                                <div
                                  style={{
                                    display: "inline-block",
                                    padding: "4px 10px",
                                    borderRadius: "12px",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    background: firmResp === "accepted" ? "#d1fae5" : "#fee2e2",
                                    color: firmResp === "accepted" ? "#065f46" : "#991b1b",
                                  }}
                                >
                                  {firmResp === "accepted" ? "✓ Accepted" : "✗ Declined"}
                                </div>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  <button
                                    type="button"
                                    className="primary-button"
                                    style={{ fontSize: "13px" }}
                                    onClick={() => void handleFirmRespond(ref, "accepted")}
                                  >
                                    Accept
                                  </button>
                                  <button
                                    type="button"
                                    className="muted-button"
                                    style={{ fontSize: "13px" }}
                                    onClick={() => {
                                      const notes = window.prompt("Please give a brief reason for declining (optional):");
                                      void handleFirmRespond(ref, "declined", notes || "");
                                    }}
                                  >
                                    Decline
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SummaryCard>

                {/* Lender Panel Memberships */}
                <SummaryCard title="Your Lender Panel Memberships">
                  {firmPortalData.memberships.length === 0 ? (
                    <p className="form-note">No lender panel memberships are recorded for your firm yet.</p>
                  ) : (
                    <div className="detail-table">
                      {(firmPortalData.memberships as Record<string, unknown>[]).map((m) => (
                        <div key={String(m.id)} className="detail-row">
                          <div className="detail-row__label">
                            <strong>{String(m.lender_name || "")}</strong>
                            {m.notes && <div style={{ fontSize: "12px", color: "#6b7280" }}>{String(m.notes)}</div>}
                          </div>
                          <div className="detail-row__value">
                            <div
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "10px",
                                fontSize: "12px",
                                fontWeight: 600,
                                background: Number(m.active) === 1 ? "#d1fae5" : "#f3f4f6",
                                color: Number(m.active) === 1 ? "#065f46" : "#6b7280",
                              }}
                            >
                              {Number(m.active) === 1 ? "Active" : "Inactive"}
                            </div>
                            {m.last_checked_at && (
                              <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
                                Checked: {new Date(String(m.last_checked_at)).toLocaleDateString("en-GB")}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SummaryCard>

                {/* Firm Profile */}
                <SummaryCard title="Your Firm Profile">
                  <SummaryGrid rows={[
                    { label: "Firm name", value: String((firmPortalData.firm as Record<string, unknown>).firm_name || "") },
                    { label: "Contact name", value: String((firmPortalData.firm as Record<string, unknown>).contact_name || "Not set") },
                    { label: "Contact email", value: String((firmPortalData.firm as Record<string, unknown>).contact_email || "Not set") },
                    { label: "Contact phone", value: String((firmPortalData.firm as Record<string, unknown>).contact_phone || "Not set") },
                    { label: "Panel terms accepted", value: Number((firmPortalData.firm as Record<string, unknown>).panel_terms_accepted) === 1 ? "Yes" : "No" },
                  ]} />
                  <p className="form-note" style={{ marginTop: "12px" }}>
                    To update your profile details, please contact{" "}
                    <a href="mailto:info@conveyquote.uk">info@conveyquote.uk</a>.
                  </p>
                </SummaryCard>
              </div>
            )}
          </section>
        )}

        {/* ── Admin Login ──────────────────────────────────────────── */}
        {isAdminPage && !isAdminUnlocked && (
          <section className="card card--form" style={{ marginTop: "24px", maxWidth: "460px", margin: "40px auto" }}>
            <div className="section-heading">
              <div>
                <h2>Admin Login</h2>
                <p>Authorised staff only.</p>
              </div>
            </div>

            <form className="quote-form" onSubmit={(e) => void handleAdminUnlock(e)}>
              <div className="form-grid">
                <div className="field field--full">
                  <label htmlFor="adminEmail">Email address</label>
                  <input
                    id="adminEmail"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@conveyquote.uk"
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="field field--full">
                  <label htmlFor="adminPassword">Password</label>
                  <input
                    id="adminPassword"
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Your password"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {adminLoginError && (
                <p className="form-note" style={{ color: "#dc2626", marginTop: "10px" }}>
                  {adminLoginError}
                </p>
              )}

              <div className="form-footer">
                <button type="submit" className="primary-button" disabled={isAdminLoggingIn}>
                  {isAdminLoggingIn ? "Logging in…" : "Log In"}
                </button>
              </div>
            </form>
          </section>
        )}

        {isAdminPage && isAdminUnlocked && (
          <section className="card card--form" style={{ marginTop: "24px" }}>
            <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h2>Admin Dashboard</h2>
                <p>
                  Review enquiries, manage panel firms, edit lender panel
                  memberships and send approved quotes.
                </p>
              </div>
              <button type="button" className="muted-button" onClick={() => void handleAdminLogout()}>
                Log out
              </button>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                marginBottom: "20px",
              }}
            >
              <button
                type="button"
                className={adminTab === "dashboard" ? "primary-button" : "muted-button"}
                onClick={() => void handleAdminTabChange("dashboard")}
              >
                Dashboard
              </button>

              <button
                type="button"
                className={adminTab === "enquiries" ? "primary-button" : "muted-button"}
                onClick={() => void handleAdminTabChange("enquiries")}
              >
                Enquiries
              </button>

              <button
                type="button"
                className={adminTab === "firms" ? "primary-button" : "muted-button"}
                onClick={() => void handleAdminTabChange("firms")}
              >
                Firms
              </button>

              <button
                type="button"
                className={adminTab === "lenders" ? "primary-button" : "muted-button"}
                onClick={() => void handleAdminTabChange("lenders")}
              >
                Lenders
              </button>

              <button
                type="button"
                className={adminTab === "quote" ? "primary-button" : "muted-button"}
                onClick={() => setAdminTab("quote")}
              >
                Quote Review
              </button>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <SummaryCard title="Quick Actions">
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="manualReference">Load enquiry by reference</label>
                    <input
                      id="manualReference"
                      type="text"
                      value={manualReference}
                      onChange={(e) => setManualReference(e.target.value)}
                      placeholder="e.g. CQ-20260409-5757"
                    />
                  </div>

                  <div className="field" style={{ alignSelf: "end" }}>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={handleManualReferenceLoad}
                    >
                      Load Enquiry
                    </button>
                  </div>

                  <div className="field" style={{ alignSelf: "end" }}>
                    <button
                      type="button"
                      className="muted-button"
                      onClick={() => void loadDashboardData()}
                    >
                      Refresh Admin Data
                    </button>
                  </div>

                  {loadedEnquiry && (
                    <div className="field" style={{ alignSelf: "end" }}>
                      <button
                        type="button"
                        className="muted-button"
                        onClick={() => void handleBackToDashboard()}
                      >
                        Back to Dashboard
                      </button>
                    </div>
                  )}
                </div>

                {isLoadingEnquiry && (
                  <p className="form-note">Loading enquiry from reference...</p>
                )}

                {!isLoadingEnquiry && loadedEnquiryMessage && (
                  <p className="form-note">{loadedEnquiryMessage}</p>
                )}

                {!loadedEnquiry && isLoadingDashboard && (
                  <p className="form-note">Loading dashboard...</p>
                )}
              </SummaryCard>
            </div>

            {adminTab === "dashboard" && !loadedEnquiry && !isLoadingDashboard && (
              <div className="admin-stack" style={{ marginTop: "20px" }}>
                <SummaryCard title="Dashboard Overview">
                  <SummaryGrid rows={dashboardSummaryRows} />
                </SummaryCard>

                <div className="admin-two-col">
                  <SummaryCard title="Recent Enquiries">
                    {dashboardEnquiries.length === 0 ? (
                      <p className="form-note">No enquiries found.</p>
                    ) : (
                      <div className="detail-table">
                        {dashboardEnquiries.slice(0, 8).map((enquiry) => (
                          <div
                            key={`${enquiry.id}-${enquiry.reference}`}
                            className="detail-row"
                          >
                            <div className="detail-row__label">
                              <strong>{enquiry.reference || "No reference"}</strong>
                              <div>{prettifyValue(enquiry.client_name)}</div>
                              <div>{getTransactionLabel(enquiry.transaction_type)}</div>
                            </div>
                            <div className="detail-row__value">
                              <div>{prettifyValue(enquiry.created_at)}</div>
                              {enquiry.reference && (
                                <button
                                  type="button"
                                  className="muted-button"
                                  onClick={() =>
                                    void handleOpenDashboardEnquiry(
                                      enquiry.reference || ""
                                    )
                                  }
                                >
                                  Open
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </SummaryCard>

                  <SummaryCard title="Panel Firms Snapshot">
                    {dashboardFirms.length === 0 ? (
                      <p className="form-note">No panel firms found.</p>
                    ) : (
                      <div className="detail-table">
                        {dashboardFirms.slice(0, 8).map((firm) => (
                          <div
                            key={firm.id}
                            className="detail-row"
                          >
                            <div className="detail-row__label">
                              <strong>{prettifyValue(firm.firm_name)}</strong>
                              <div>{prettifyValue(firm.contact_email)}</div>
                            </div>
                            <div className="detail-row__value">
                              <div>Active: {prettifyValue(firm.active)}</div>
                              <div>
                                Lenders: {String(Number(firm.lender_count || 0))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </SummaryCard>
                </div>
              </div>
            )}

            {adminTab === "enquiries" && !loadedEnquiry && !isLoadingDashboard && (
              <div className="admin-stack" style={{ marginTop: "20px" }}>
                <SummaryCard title="All Recent Enquiries">
                  <div className="form-grid" style={{ marginBottom: "16px" }}>
                    <div className="field field--full" style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                      <div style={{ flex: 1 }}>
                        <label htmlFor="enquirySearch">Search enquiries</label>
                        <input
                          id="enquirySearch"
                          type="text"
                          value={enquirySearchQuery}
                          placeholder="Reference, name or email…"
                          onChange={(e) => setEnquirySearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              void handleEnquirySearch(enquirySearchQuery);
                            }
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => void handleEnquirySearch(enquirySearchQuery)}
                        disabled={isSearchingEnquiries}
                      >
                        {isSearchingEnquiries ? "Searching…" : "Search"}
                      </button>
                      <button
                        type="button"
                        className="muted-button"
                        onClick={() => {
                          setEnquirySearchQuery("");
                          void loadDashboardData();
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {dashboardEnquiries.length === 0 ? (
                    <p className="form-note">No enquiries found.</p>
                  ) : (
                    <div className="detail-table">
                      {dashboardEnquiries.map((enquiry) => (
                        <div
                          key={`${enquiry.id}-${enquiry.reference}`}
                          className="detail-row"
                        >
                          <div className="detail-row__label">
                            <strong>{enquiry.reference || "No reference"}</strong>
                            <div>{prettifyValue(enquiry.client_name)}</div>
                            <div>{prettifyValue(enquiry.client_email)}</div>
                            <div>{getTransactionLabel(enquiry.transaction_type)}</div>
                          </div>
                          <div className="detail-row__value">
                            <div
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "12px",
                                fontSize: "12px",
                                fontWeight: 600,
                                background:
                                  enquiry.status === "accepted" ? "#d1fae5" :
                                  enquiry.status === "rejected" ? "#fee2e2" :
                                  enquiry.status === "quoted"   ? "#dbeafe" :
                                  "#f3f4f6",
                                color:
                                  enquiry.status === "accepted" ? "#065f46" :
                                  enquiry.status === "rejected" ? "#991b1b" :
                                  enquiry.status === "quoted"   ? "#1e40af" :
                                  "#374151",
                              }}
                            >
                              {prettifyValue(enquiry.status || "new")}
                            </div>
                            {enquiry.assigned_firm_name && (
                              <div style={{ fontSize: "12px", color: "#6b7280" }}>
                                → {enquiry.assigned_firm_name}
                              </div>
                            )}
                            <div style={{ fontSize: "12px", color: "#9ca3af" }}>{prettifyValue(enquiry.created_at)}</div>
                            {enquiry.reference && (
                              <button
                                type="button"
                                className="muted-button"
                                onClick={() =>
                                  void handleOpenDashboardEnquiry(
                                    enquiry.reference || ""
                                  )
                                }
                              >
                                Open Quote
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SummaryCard>
              </div>
            )}

            {adminTab === "firms" && !loadedEnquiry && !isLoadingDashboard && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(300px, 1fr) minmax(380px, 1.4fr)",
                  gap: "20px",
                  alignItems: "start",
                }}
              >
                <div className="admin-stack">
                  <SummaryCard title="Panel Firms">
                    <div style={{ marginBottom: "12px" }}>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={startNewFirm}
                      >
                        Add New Firm
                      </button>
                    </div>

                    {dashboardFirms.length === 0 ? (
                      <p className="form-note">No panel firms found.</p>
                    ) : (
                      <div className="detail-table">
                        {dashboardFirms.map((firm) => (
                          <div
                            key={firm.id}
                            className="detail-row"
                            style={{
                              border:
                                selectedFirmId === firm.id
                                  ? "2px solid #0f2747"
                                  : undefined,
                              borderRadius: "10px",
                              padding: "8px",
                            }}
                          >
                            <div className="detail-row__label">
                              <strong>{prettifyValue(firm.firm_name)}</strong>
                              <div>{prettifyValue(firm.contact_name)}</div>
                              <div>{prettifyValue(firm.contact_email)}</div>
                            </div>
                            <div className="detail-row__value">
                              <div>Active: {prettifyValue(firm.active)}</div>
                              <div>
                                Lenders: {String(Number(firm.lender_count || 0))}
                              </div>
                              <button
                                type="button"
                                className="muted-button"
                                onClick={() => selectFirmForEditing(firm)}
                              >
                                Edit Firm
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </SummaryCard>
                </div>

                <div className="admin-stack">
                  <SummaryCard
                    title={
                      firmEditor.id ? "Edit Panel Firm" : "Create Panel Firm"
                    }
                  >
                    <form className="quote-form" onSubmit={handleSaveFirm}>
                      <div className="form-grid">
                        <div className="field">
                          <label htmlFor="firm_name">Firm name</label>
                          <input
                            id="firm_name"
                            name="firm_name"
                            type="text"
                            value={firmEditor.firm_name}
                            onChange={handleFirmEditorTextChange}
                            required
                          />
                        </div>

                        <div className="field">
                          <label htmlFor="contact_name">Contact name</label>
                          <input
                            id="contact_name"
                            name="contact_name"
                            type="text"
                            value={firmEditor.contact_name}
                            onChange={handleFirmEditorTextChange}
                          />
                        </div>

                        <div className="field">
                          <label htmlFor="contact_email">Contact email</label>
                          <input
                            id="contact_email"
                            name="contact_email"
                            type="email"
                            value={firmEditor.contact_email}
                            onChange={handleFirmEditorTextChange}
                          />
                        </div>

                        <div className="field">
                          <label htmlFor="contact_phone">Contact phone</label>
                          <input
                            id="contact_phone"
                            name="contact_phone"
                            type="text"
                            value={firmEditor.contact_phone}
                            onChange={handleFirmEditorTextChange}
                          />
                        </div>

                        <div className="field field--full">
                          <label htmlFor="firm_notes">Notes</label>
                          <textarea
                            id="firm_notes"
                            name="notes"
                            rows={4}
                            value={firmEditor.notes}
                            onChange={handleFirmEditorTextChange}
                          />
                        </div>

                        <div className="field field--full">
                          <div
                            style={{
                              display: "grid",
                              gap: "10px",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(180px, 1fr))",
                            }}
                          >
                            <CheckboxField
                              label="Active"
                              checked={firmEditor.active}
                              onChange={(checked) =>
                                setFirmEditor((prev) => ({
                                  ...prev,
                                  active: checked,
                                }))
                              }
                            />
                            <CheckboxField
                              label="Panel terms accepted"
                              checked={firmEditor.panel_terms_accepted}
                              onChange={(checked) =>
                                setFirmEditor((prev) => ({
                                  ...prev,
                                  panel_terms_accepted: checked,
                                }))
                              }
                            />
                            <CheckboxField
                              label="Handles purchase"
                              checked={firmEditor.handles_purchase}
                              onChange={(checked) =>
                                setFirmEditor((prev) => ({
                                  ...prev,
                                  handles_purchase: checked,
                                }))
                              }
                            />
                            <CheckboxField
                              label="Handles sale"
                              checked={firmEditor.handles_sale}
                              onChange={(checked) =>
                                setFirmEditor((prev) => ({
                                  ...prev,
                                  handles_sale: checked,
                                }))
                              }
                            />
                            <CheckboxField
                              label="Handles remortgage"
                              checked={firmEditor.handles_remortgage}
                              onChange={(checked) =>
                                setFirmEditor((prev) => ({
                                  ...prev,
                                  handles_remortgage: checked,
                                }))
                              }
                            />
                            <CheckboxField
                              label="Handles transfer"
                              checked={firmEditor.handles_transfer}
                              onChange={(checked) =>
                                setFirmEditor((prev) => ({
                                  ...prev,
                                  handles_transfer: checked,
                                }))
                              }
                            />
                            <CheckboxField
                              label="Handles leasehold"
                              checked={firmEditor.handles_leasehold}
                              onChange={(checked) =>
                                setFirmEditor((prev) => ({
                                  ...prev,
                                  handles_leasehold: checked,
                                }))
                              }
                            />
                            <CheckboxField
                              label="Handles new build"
                              checked={firmEditor.handles_new_build}
                              onChange={(checked) =>
                                setFirmEditor((prev) => ({
                                  ...prev,
                                  handles_new_build: checked,
                                }))
                              }
                            />
                            <CheckboxField
                              label="Handles company buyers"
                              checked={firmEditor.handles_company_buyers}
                              onChange={(checked) =>
                                setFirmEditor((prev) => ({
                                  ...prev,
                                  handles_company_buyers: checked,
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <div className="form-footer action-row">
                        <p className="form-note">
                          {firmSaveMessage || "Save the selected firm details here."}
                        </p>

                        <button
                          type="button"
                          className="muted-button"
                          onClick={startNewFirm}
                        >
                          Clear Firm Form
                        </button>

                        <button type="submit" className="primary-button">
                          {firmEditor.id ? "Update Firm" : "Create Firm"}
                        </button>
                      </div>
                    </form>
                  </SummaryCard>

                  <SummaryCard title="Lender Panel Management">
                    {!selectedFirmId ? (
                      <p className="form-note">
                        Select a firm first to manage its lender panel.
                      </p>
                    ) : (
                      <>
                        <p className="form-note" style={{ marginBottom: "12px" }}>
                          Managing lender memberships for{" "}
                          <strong>{selectedFirm?.firm_name || "selected firm"}</strong>.
                        </p>

                        <form className="quote-form" onSubmit={handleSaveMembership}>
                          <div className="form-grid">
                            <div className="field">
                              <label htmlFor="membership_firm_id">Firm</label>
                              <select
                                id="membership_firm_id"
                                name="firm_id"
                                value={membershipEditor.firm_id}
                                onChange={handleMembershipTextChange}
                                required
                              >
                                <option value="">Please select</option>
                                {dashboardFirms.map((firm) => (
                                  <option key={firm.id} value={firm.id}>
                                    {firm.firm_name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="field">
                              <label htmlFor="membership_lender_id">Lender</label>
                              <select
                                id="membership_lender_id"
                                name="lender_id"
                                value={membershipEditor.lender_id}
                                onChange={handleMembershipTextChange}
                                required
                              >
                                <option value="">Please select</option>
                                {activePanelLenders.map((lender) => (
                                  <option key={lender.id} value={lender.id}>
                                    {lender.lender_name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="field">
                              <label htmlFor="membership_last_checked_at">
                                Last checked at
                              </label>
                              <input
                                id="membership_last_checked_at"
                                name="last_checked_at"
                                type="text"
                                placeholder="e.g. 2026-04-10"
                                value={membershipEditor.last_checked_at}
                                onChange={handleMembershipTextChange}
                              />
                            </div>

                            <div className="field field--full">
                              <label htmlFor="membership_notes">Notes</label>
                              <textarea
                                id="membership_notes"
                                name="notes"
                                rows={3}
                                value={membershipEditor.notes}
                                onChange={handleMembershipTextChange}
                              />
                            </div>

                            <div className="field field--full">
                              <CheckboxField
                                label="Membership active"
                                checked={membershipEditor.active}
                                onChange={(checked) =>
                                  setMembershipEditor((prev) => ({
                                    ...prev,
                                    active: checked,
                                  }))
                                }
                              />
                            </div>
                          </div>

                          <div className="form-footer action-row">
                            <p className="form-note">
                              {membershipSaveMessage ||
                                "Add a lender to the selected firm, or edit an existing lender panel entry."}
                            </p>

                            <button
                              type="button"
                              className="muted-button"
                              onClick={() =>
                                setMembershipEditor({
                                  ...initialMembershipEditorState,
                                  firm_id: selectedFirmId,
                                })
                              }
                            >
                              Clear Membership Form
                            </button>

                            <button type="submit" className="primary-button">
                              {membershipEditor.id
                                ? "Update Membership"
                                : "Add Lender to Firm"}
                            </button>
                          </div>
                        </form>

                        <div style={{ marginTop: "20px" }}>
                          <h4 style={{ marginTop: 0 }}>Current Lender Memberships</h4>

                          {selectedFirmMemberships.length === 0 ? (
                            <p className="form-note">
                              No lenders linked to this firm yet.
                            </p>
                          ) : (
                            <div className="detail-table">
                              {selectedFirmMemberships.map((membership) => (
                                <div
                                  key={membership.id}
                                  className="detail-row"
                                >
                                  <div className="detail-row__label">
                                    <strong>
                                      {prettifyValue(membership.lender_name)}
                                    </strong>
                                    <div>
                                      Active: {prettifyValue(membership.active)}
                                    </div>
                                    <div>
                                      Last checked:{" "}
                                      {prettifyValue(membership.last_checked_at)}
                                    </div>
                                    <div>{prettifyValue(membership.notes)}</div>
                                  </div>
                                  <div className="detail-row__value">
                                    <button
                                      type="button"
                                      className="muted-button"
                                      onClick={() =>
                                        handleEditMembership(membership)
                                      }
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="muted-button"
                                      onClick={() =>
                                        void handleDeleteMembership(membership.id)
                                      }
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </SummaryCard>
                </div>
              </div>
            )}

            {adminTab === "firms" && !loadedEnquiry && !isLoadingDashboard && (
              <div style={{ marginTop: "20px" }}>
                <SummaryCard title="Set Firm Portal Access">
                  <p className="form-note" style={{ marginTop: 0 }}>
                    Use this form to create or update the login credentials for a panel firm's portal account.
                    The firm will be able to log in at <strong>conveyquote.uk/firm-login</strong>.
                  </p>

                  <form onSubmit={(e) => void handleSetFirmPassword(e)}>
                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor="portalFirmId">Firm</label>
                        <select
                          id="portalFirmId"
                          value={firmSetPasswordState.firm_id}
                          onChange={(e) => {
                            const firm = dashboardFirms.find((f) => f.id === Number(e.target.value));
                            setFirmSetPasswordState((prev) => ({
                              ...prev,
                              firm_id: e.target.value === "" ? "" : Number(e.target.value),
                              portal_email: firm?.contact_email || prev.portal_email,
                            }));
                          }}
                          required
                        >
                          <option value="">Select a firm…</option>
                          {dashboardFirms.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.firm_name}{f.portal_active ? " ✓" : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="portalEmail">Portal login email</label>
                        <input
                          id="portalEmail"
                          type="email"
                          value={firmSetPasswordState.portal_email}
                          onChange={(e) =>
                            setFirmSetPasswordState((prev) => ({ ...prev, portal_email: e.target.value }))
                          }
                          placeholder="firm@example.com"
                          required
                        />
                      </div>

                      <div className="field">
                        <label htmlFor="portalPassword">New password</label>
                        <input
                          id="portalPassword"
                          type="password"
                          value={firmSetPasswordState.password}
                          onChange={(e) =>
                            setFirmSetPasswordState((prev) => ({ ...prev, password: e.target.value }))
                          }
                          placeholder="Minimum 8 characters"
                          required
                        />
                      </div>

                      <div className="field">
                        <label htmlFor="portalConfirm">Confirm password</label>
                        <input
                          id="portalConfirm"
                          type="password"
                          value={firmSetPasswordState.confirm}
                          onChange={(e) =>
                            setFirmSetPasswordState((prev) => ({ ...prev, confirm: e.target.value }))
                          }
                          placeholder="Repeat password"
                          required
                        />
                      </div>
                    </div>

                    {firmSetPasswordMessage && (
                      <p
                        className="form-note"
                        style={{
                          marginTop: "10px",
                          color: firmSetPasswordMessage.includes("saved") ? "#065f46" : "#dc2626",
                        }}
                      >
                        {firmSetPasswordMessage}
                      </p>
                    )}

                    <div className="form-footer action-row" style={{ marginTop: "14px" }}>
                      <button type="submit" className="primary-button">
                        Save Portal Access
                      </button>
                    </div>
                  </form>
                </SummaryCard>
              </div>
            )}

            {adminTab === "lenders" && !loadedEnquiry && !isLoadingDashboard && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(300px, 1fr) minmax(360px, 1.2fr)",
                  gap: "20px",
                  alignItems: "start",
                  marginTop: "20px",
                }}
              >
                <div className="admin-stack">
                  <SummaryCard title="Panel Lenders">
                    {panelLenders.length === 0 ? (
                      <p className="form-note">No lenders found.</p>
                    ) : (
                      <div className="detail-table">
                        {panelLenders.map((lender) => (
                          <div key={lender.id} className="detail-row">
                            <div className="detail-row__label">
                              <strong>{prettifyValue(lender.lender_name)}</strong>
                              <div style={{ fontSize: "12px", color: Number(lender.active) === 1 ? "#065f46" : "#9ca3af" }}>
                                {Number(lender.active) === 1 ? "● Active" : "○ Inactive"}
                              </div>
                              {lender.notes && (
                                <div style={{ fontSize: "12px", color: "#6b7280" }}>{lender.notes}</div>
                              )}
                            </div>
                            <div className="detail-row__value">
                              <button
                                type="button"
                                className="muted-button"
                                onClick={() => handleEditLender(lender)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="muted-button"
                                onClick={() => void handleDeleteLender(lender.id)}
                              >
                                Deactivate
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </SummaryCard>
                </div>

                <div className="admin-stack">
                  <SummaryCard title={lenderEditor.id ? "Edit Lender" : "Add Lender"}>
                    <form onSubmit={(e) => void handleSaveLender(e)}>
                      <div className="form-grid">
                        <div className="field field--full">
                          <label htmlFor="lender_name">Lender name</label>
                          <input
                            id="lender_name"
                            type="text"
                            name="lender_name"
                            value={lenderEditor.lender_name}
                            onChange={handleLenderEditorChange}
                            required
                          />
                        </div>

                        <div className="field field--full">
                          <CheckboxField
                            label="Active"
                            checked={lenderEditor.active}
                            onChange={(checked) =>
                              setLenderEditor((prev) => ({ ...prev, active: checked }))
                            }
                          />
                        </div>

                        <div className="field field--full">
                          <label htmlFor="lender_notes">Notes</label>
                          <textarea
                            id="lender_notes"
                            name="notes"
                            value={lenderEditor.notes}
                            onChange={handleLenderEditorChange}
                            rows={3}
                          />
                        </div>
                      </div>

                      {lenderSaveMessage && (
                        <p className="form-note" style={{ marginTop: "10px" }}>
                          {lenderSaveMessage}
                        </p>
                      )}

                      <div className="form-footer action-row" style={{ marginTop: "14px" }}>
                        {lenderEditor.id && (
                          <button
                            type="button"
                            className="muted-button"
                            onClick={() => {
                              setLenderEditor(initialLenderEditorState);
                              setLenderSaveMessage("");
                            }}
                          >
                            Clear
                          </button>
                        )}
                        <button type="submit" className="primary-button">
                          {lenderEditor.id ? "Update Lender" : "Add Lender"}
                        </button>
                      </div>
                    </form>
                  </SummaryCard>
                </div>
              </div>
            )}

            {adminTab === "quote" && !loadedEnquiry && !isLoadingEnquiry && (
              <SummaryCard title="Quote Review">
                <p className="form-note">
                  No enquiry is currently loaded. Open one from the Enquiries tab
                  or load a reference above.
                </p>
              </SummaryCard>
            )}

            {adminTab === "quote" && loadedEnquiry && (
              <>
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
                    <SummaryCard title="Update Status">
                      <p className="form-note" style={{ marginTop: 0 }}>
                        Current status:{" "}
                        <strong>{prettifyValue(loadedEnquiry.status || "new")}</strong>
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                        {["new", "reviewed", "quoted", "accepted", "rejected", "instructed", "on_hold"].map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={loadedEnquiry.status === s ? "primary-button" : "muted-button"}
                            style={{ fontSize: "13px", padding: "6px 12px" }}
                            disabled={isUpdatingStatus || loadedEnquiry.status === s}
                            onClick={() => void handleUpdateEnquiryStatus(s)}
                          >
                            {prettifyValue(s)}
                          </button>
                        ))}
                      </div>
                      {statusUpdateMessage && (
                        <p className="form-note">{statusUpdateMessage}</p>
                      )}
                    </SummaryCard>

                    <SummaryCard title="Assign to Panel Firm">
                      <form onSubmit={(e) => void handleAssignPanelFirm(e)}>
                        <div className="form-grid">
                          <div className="field field--full">
                            <label htmlFor="assignFirmId">Panel firm</label>
                            <select
                              id="assignFirmId"
                              name="firm_id"
                              value={panelAssignment.firm_id}
                              onChange={handlePanelAssignmentChange}
                              required
                            >
                              <option value="">Select a firm…</option>
                              {dashboardFirms
                                .filter((f) => Number(f.active) === 1)
                                .map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.firm_name}
                                    {f.panel_terms_accepted ? " ✓" : ""}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="field field--full">
                            <CheckboxField
                              label="Referral fee payable"
                              checked={panelAssignment.referral_fee_payable}
                              onChange={(checked) =>
                                setPanelAssignment((prev) => ({
                                  ...prev,
                                  referral_fee_payable: checked,
                                }))
                              }
                            />
                          </div>

                          {panelAssignment.referral_fee_payable && (
                            <div className="field field--full">
                              <label htmlFor="referralFeeAmount">Referral fee amount (£)</label>
                              <input
                                id="referralFeeAmount"
                                type="number"
                                step="0.01"
                                name="referral_fee_amount"
                                value={panelAssignment.referral_fee_amount}
                                onChange={handlePanelAssignmentChange}
                                placeholder="e.g. 150.00"
                              />
                            </div>
                          )}

                          <div className="field field--full">
                            <label htmlFor="assignAdminNotes">Admin notes</label>
                            <textarea
                              id="assignAdminNotes"
                              name="admin_notes"
                              value={panelAssignment.admin_notes}
                              onChange={handlePanelAssignmentChange}
                              rows={3}
                              placeholder="Optional notes for this referral…"
                            />
                          </div>
                        </div>

                        {panelAssignMessage && (
                          <p className="form-note" style={{ marginTop: "10px" }}>
                            {panelAssignMessage}
                          </p>
                        )}

                        <div className="form-footer action-row" style={{ marginTop: "14px" }}>
                          <button
                            type="submit"
                            className="primary-button"
                            disabled={isSavingPanelAssignment || !panelAssignment.firm_id}
                          >
                            {isSavingPanelAssignment ? "Assigning…" : "Assign Firm"}
                          </button>
                        </div>
                      </form>
                    </SummaryCard>
                  </div>

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
                            onChange={(e) =>
                              setSdltAdditionalProperty(e.target.value)
                            }
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
                      className="muted-button"
                      onClick={() => {
                        setApprovedQuote(initialApprovedQuoteState);
                        setLoadedEnquiryMessage("");
                        setLoadedEnquiry(null);
                        setAdminTab("dashboard");

                        const nextUrl = new URL(window.location.href);
                        nextUrl.searchParams.delete("ref");
                        window.history.replaceState({}, "", nextUrl.toString());

                        setManualReference("");
                      }}
                    >
                      Clear Form
                    </button>

                    <button type="submit" className="primary-button">
                      Send Approved Quote
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;