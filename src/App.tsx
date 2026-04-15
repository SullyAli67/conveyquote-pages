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
  suspended?: number;
  default_referral_fee?: number;

  portal_active?: number;
  portal_email?: string | null;

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
  status?: string;
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

type AdminTab = "dashboard" | "enquiries" | "firms" | "lenders" | "quote" | "settings" | "referrers" | "invoices" | "pipeline" | "audit";

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
  suspended: boolean;
  panel_terms_accepted: boolean;
  handles_purchase: boolean;
  handles_sale: boolean;
  handles_remortgage: boolean;
  handles_transfer: boolean;
  handles_leasehold: boolean;
  handles_new_build: boolean;
  handles_company_buyers: boolean;
  notes: string;
  default_referral_fee: string;
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
  suspended: false,
  panel_terms_accepted: false,
  handles_purchase: true,
  handles_sale: true,
  handles_remortgage: true,
  handles_transfer: true,
  handles_leasehold: false,
  handles_new_build: false,
  handles_company_buyers: false,
  notes: "",
  default_referral_fee: "",
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

function AdminPasswordForm({ adminFetch }: { adminFetch: (url: string, opts?: RequestInit) => Promise<Response> }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (newPassword !== confirm) { setMessage("Passwords do not match."); return; }
    if (newPassword.length < 8) { setMessage("Password must be at least 8 characters."); return; }
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin-change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: newPassword }),
      });
      const result = await res.json();
      if (result.success) {
        setMessage("Password changed. You will need to log in again.");
        setNewPassword(""); setConfirm("");
      } else {
        setMessage(result.error || "Failed to change password.");
      }
    } catch { setMessage("Something went wrong."); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="newAdminPw">New password</label>
          <input id="newAdminPw" type="password" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 8 characters" required />
        </div>
        <div className="field">
          <label htmlFor="confirmAdminPw">Confirm password</label>
          <input id="confirmAdminPw" type="password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" required />
        </div>
      </div>
      {message && <p className="form-note" style={{ marginTop: "10px", color: message.includes("changed") ? "#065f46" : "#dc2626" }}>{message}</p>}
      <div className="form-footer action-row" style={{ marginTop: "14px" }}>
        <button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving…" : "Change Password"}</button>
      </div>
    </form>
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

  // Case acceptance modal state
  const [acceptanceModal, setAcceptanceModal] = useState<{
    open: boolean;
    reference: string;
    hasAcceptedTerms: boolean;
  }>({ open: false, reference: "", hasAcceptedTerms: false });

  // Case status update state  
  const [caseStatusUpdate, setCaseStatusUpdate] = useState<{
    reference: string;
    status: string;
    notes: string;
  }>({ reference: "", status: "", notes: "" });
  const [caseStatusMessage, setCaseStatusMessage] = useState("");
  const [isUpdatingCaseStatus, setIsUpdatingCaseStatus] = useState(false);

  // Invoice state
  const [invoiceData, setInvoiceData] = useState<Record<string, unknown> | null>(null);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [invoiceMessage, setInvoiceMessage] = useState("");

  // Admin settings state
  const [adminSettings, setAdminSettings] = useState<Record<string, string>>({});
  const [adminSettingsMessage, setAdminSettingsMessage] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Referrer management state
  type ReferrerRow = { id: number; referrer_name: string; contact_email: string; contact_phone: string; referral_fee: number; portal_email: string; portal_active: number; notes: string; created_at: string };
  const [allReferrers, setAllReferrers] = useState<ReferrerRow[]>([]);
  const [isLoadingReferrers, setIsLoadingReferrers] = useState(false);
  const [referrerEditor, setReferrerEditor] = useState<{ id: number | null; referrer_name: string; contact_email: string; contact_phone: string; referral_fee: string; portal_email: string; portal_active: boolean; notes: string; password: string }>({
    id: null, referrer_name: "", contact_email: "", contact_phone: "",
    referral_fee: "", portal_email: "", portal_active: false, notes: "", password: "",
  });
  const [referrerSaveMessage, setReferrerSaveMessage] = useState("");
  const [isSavingReferrer, setIsSavingReferrer] = useState(false);

  // Invoices state
  type InvoiceRow = { reference: string; invoice_ref: string; invoice_json: string; invoice_status: string; voided_invoice_ref: string; voided_invoice_json: string; client_name: string; assigned_firm_name: string; case_status: string; created_at: string };
  const [allInvoices, setAllInvoices] = useState<InvoiceRow[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Record<string, unknown> | null>(null);
  const [isVoidingInvoice, setIsVoidingInvoice] = useState(false);
  const [voidInvoiceMessage, setVoidInvoiceMessage] = useState("");
  const [isDeletingQuote, setIsDeletingQuote] = useState<string | null>(null);
  const [deleteQuoteMessage, setDeleteQuoteMessage] = useState<{ ref: string; text: string } | null>(null);
  const [isMarkingPaid, setIsMarkingPaid] = useState<string | null>(null);

  // Audit log state
  type AuditEntry = { id: number; action: string; reference: string | null; firm_id: number | null; firm_name: string | null; actor: string; details: string | null; created_at: string };
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditFilter, setAuditFilter] = useState("");

  // Firm history state
  type FirmHistoryEnquiry = { reference: string; client_name: string; transaction_type: string; case_status: string; invoice_ref: string | null; invoice_status: string | null; invoice_json: string | null; referral_fee_amount: number; referred_at: string | null; created_at: string };
  type FirmHistorySummary = { totalReferrals: number; totalInvoiced: number; totalPaid: number };
  const [firmHistory, setFirmHistory] = useState<{ enquiries: FirmHistoryEnquiry[]; summary: FirmHistorySummary } | null>(null);
  const [isLoadingFirmHistory, setIsLoadingFirmHistory] = useState(false);
  const [showFirmHistory, setShowFirmHistory] = useState(false);

  // Pipeline state
  type PipelineRow = { reference: string; client_name: string; transaction_type: string; assigned_firm_name: string; case_status: string; eta_date: string; firm_response: string; invoice_ref: string; referrer_id: number; created_at: string; property_address: string; target_completion_date: string; fall_through_reason: string; negotiator_name: string; referrer_name: string; };
  const [pipeline, setPipeline] = useState<PipelineRow[]>([]);
  const [isLoadingPipeline, setIsLoadingPipeline] = useState(false);
  const [pipelineFilter, setPipelineFilter] = useState("all");

  // Firm quotes state
  type FirmFeeItem = { label: string; amount: number; includes_vat: boolean; is_disbursement: boolean };
  type FirmQuoteRow = { id: number; firm_reference: string; internal_reference: string; client_name: string; client_email: string; transaction_type: string; price: number; status: string; sent_at: string; accepted_at: string; created_at: string };

  const [firmPortalTab, setFirmPortalTab] = useState<"referrals" | "quotes" | "fees" | "profile">("referrals");
  const [firmQuotes, setFirmQuotes] = useState<FirmQuoteRow[]>([]);
  const [isLoadingFirmQuotes, setIsLoadingFirmQuotes] = useState(false);
  const [firmQuotesMessage, setFirmQuotesMessage] = useState("");

  // Fee config state
  const [feeConfigType, setFeeConfigType] = useState("purchase");
  const [feeConfigItems, setFeeConfigItems] = useState<FirmFeeItem[]>([]);
  const [includeQuoteSdlt, setIncludeQuoteSdlt] = useState(false);
  const [quoteSdltAmount, setQuoteSdltAmount] = useState("");
  const [isSavingFees, setIsSavingFees] = useState(false);
  const [feeConfigMessage, setFeeConfigMessage] = useState("");

  // Quote builder state
  const [isCreatingQuote, setIsCreatingQuote] = useState(false);
  const [isSavingAndSending, setIsSavingAndSending] = useState(false);
  const [quoteBuilderMode, setQuoteBuilderMode] = useState<"list" | "new" | "edit">("list");
  const [isDeletingFirmQuote, setIsDeletingFirmQuote] = useState<string | null>(null);
  const [firmQuoteManageMessage, setFirmQuoteManageMessage] = useState("");
  const [firmQuoteForm, setFirmQuoteForm] = useState({
    firm_reference: "",
    client_name: "",
    client_email: "",
    client_phone: "",
    transaction_type: "purchase",
    tenure: "freehold",
    price: "",
    postcode: "",
    email_signature: "",
    internal_reference: "",
  });
  const [firmQuoteLineItems, setFirmQuoteLineItems] = useState<FirmFeeItem[]>([]);
  const [firmQuoteSendMessage, setFirmQuoteSendMessage] = useState("");

  // ── Referrer portal state ──────────────────────────────────────────────
  type ReferrerEnquiry = Record<string, unknown>;
  type ReferrerInfo = { id: number; referrer_name: string; contact_email: string; referral_fee: number };

  const [referrerEmail, setReferrerEmail] = useState("");
  const [referrerPassword, setReferrerPassword] = useState("");
  const [referrerLoginError, setReferrerLoginError] = useState("");
  const [isReferrerLoggingIn, setIsReferrerLoggingIn] = useState(false);
  const [referrerToken, setReferrerToken] = useState("");
  const [referrerSession, setReferrerSession] = useState<{ referrer_id: number; referrer_name: string } | null>(null);
  const [referrerPortalData, setReferrerPortalData] = useState<{ referrer: ReferrerInfo; enquiries: ReferrerEnquiry[] } | null>(null);
  const [isLoadingReferrerPortal, setIsLoadingReferrerPortal] = useState(false);
  const [referrerPortalError, setReferrerPortalError] = useState("");
  const [referrerPortalTab, setReferrerPortalTab] = useState<"dashboard" | "my_referrals" | "new_referral" | "payments">("dashboard");
  const [referrerUpdateMessage, setReferrerUpdateMessage] = useState("");
  const [referrerSubmitMessage, setReferrerSubmitMessage] = useState("");
  const [isSubmittingReferrerEnquiry, setIsSubmittingReferrerEnquiry] = useState(false);
  const [referrerQuotePreview, setReferrerQuotePreview] = useState<import("./buildQuoteData").BuiltQuoteData | null>(null);
  const [referrerSimpleForm, setReferrerSimpleForm] = useState({
    property_address: "", name: "", email: "", phone: "",
    type: "purchase", price: "", tenure: "freehold", negotiator_name: "",
    mortgage: "yes", firstTimeBuyer: "no", additionalProperty: "no",
    ukResidentForSdlt: "yes", newBuild: "no",
    saleMortgage: "no", managementCompany: "no",
  });
  const [referrerEnquiryForm, setReferrerEnquiryForm] = useState({
    name: "", email: "", phone: "",
    type: "purchase", tenure: "freehold", price: "", postcode: "",
    mortgage: "mortgage", firstTimeBuyer: "no", additionalProperty: "no",
    ukResidentForSdlt: "yes", newBuild: "no", sharedOwnership: "no",
    helpToBuy: "no", isCompany: "no", buyToLet: "no", giftedDeposit: "no",
    saleMortgage: "no", managementCompany: "no", tenanted: "no", numberOfSellers: "1",
  });

  // ── Admin referrers state ──────────────────────────────────────────────
  type ReferrerRow = { id: number; referrer_name: string; contact_email: string; referral_fee: number; portal_email: string; portal_active: number };
  const [referrers, setReferrers] = useState<ReferrerRow[]>([]);
  const [loadedEnquiryMessage, setLoadedEnquiryMessage] = useState("");
  const [loadedEnquiry, setLoadedEnquiry] = useState<LoadedEnquiry | null>(
    null
  );
  const [isLoadingEnquiry, setIsLoadingEnquiry] = useState(false);

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
  const [isAddingNewFirm, setIsAddingNewFirm] = useState(false);
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
  const isReferrerLoginPage = currentPath === "/referrer-login" || currentPath === "/referrer-login/";
  const isReferrerPortalPage = currentPath === "/referrer-portal" || currentPath === "/referrer-portal/";
  const isAboutPage = currentPath === "/about" || currentPath === "/about/";
  const isTermsPage = currentPath === "/terms" || currentPath === "/terms/";
  const isPrivacyPage = currentPath === "/privacy" || currentPath === "/privacy/";
  const isSdltPage = currentPath === "/sdlt-calculator" || currentPath === "/sdlt-calculator/";
  const isFeesArticlePage = currentPath === "/conveyancing-fees" || currentPath === "/conveyancing-fees/";
  const isFeesPage = isFeesArticlePage;
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
    suspended: Number(firm.suspended) === 1,
    panel_terms_accepted: Number(firm.panel_terms_accepted) === 1,
    handles_purchase: Number(firm.handles_purchase) === 1,
    handles_sale: Number(firm.handles_sale) === 1,
    handles_remortgage: Number(firm.handles_remortgage) === 1,
    handles_transfer: Number(firm.handles_transfer) === 1,
    handles_leasehold: Number(firm.handles_leasehold) === 1,
    handles_new_build: Number(firm.handles_new_build) === 1,
    handles_company_buyers: Number(firm.handles_company_buyers) === 1,
    notes: firm.notes || "",
    default_referral_fee: firm.default_referral_fee ? String(firm.default_referral_fee) : "",
  });

  const startNewFirm = () => {
    setSelectedFirmId(null);
    setIsAddingNewFirm(true);
    setFirmEditor(initialFirmEditorState);
    setMembershipEditor(initialMembershipEditorState);
    setFirmSaveMessage("");
    setMembershipSaveMessage("");
  };

  const selectFirmForEditing = (firm: PanelFirm) => {
    setSelectedFirmId(firm.id);
    setIsAddingNewFirm(false);
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

      setIsAddingNewFirm(false);
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

    // Always clear the loaded enquiry when switching tabs so other tab
    // renders are not blocked by the !loadedEnquiry guards
    if (tab !== "quote") {
      setLoadedEnquiry(null);
      setLoadedEnquiryMessage("");
      // Remove ?ref= from the URL without adding to history
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("ref");
      window.history.replaceState({}, "", cleanUrl.toString());
    }

    if (tab !== "quote" && tab !== "referrers" && tab !== "invoices" && tab !== "pipeline" && tab !== "settings" && tab !== "audit") {
      await loadDashboardData();
    }

    if (tab === "firms" && dashboardFirms.length === 0) {
      startNewFirm();
    }

    if (tab === "lenders") {
      setLenderEditor(initialLenderEditorState);
      setLenderSaveMessage("");
    }

    if (tab === "referrers") {
      void loadAllReferrers();
    }

    if (tab === "invoices") {
      void loadAllInvoices();
    }

    if (tab === "pipeline") {
      void loadPipeline();
    }

    if (tab === "settings") {
      void loadAdminSettings();
    }

    if (tab === "audit") {
      void handleLoadAuditLog();
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
      const defaultFee = firm?.default_referral_fee ?? 0;
      setPanelAssignment((prev) => ({
        ...prev,
        firm_id: value === "" ? "" : Number(value),
        firm_name: firm?.firm_name || "",
        // Auto-fill default fee if one is set on the firm
        referral_fee_payable: defaultFee > 0 ? true : prev.referral_fee_payable,
        referral_fee_amount: defaultFee > 0 ? String(defaultFee) : prev.referral_fee_amount,
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

  // ── Admin settings ────────────────────────────────────────────────────────

  const loadAdminSettings = async () => {
    try {
      const res = await adminFetch("/api/admin-settings");
      const result = await res.json();
      if (result.success && Array.isArray(result.settings)) {
        const map: Record<string, string> = {};
        result.settings.forEach((s: { setting_key: string; setting_value: string }) => {
          map[s.setting_key] = s.setting_value;
        });
        setAdminSettings(map);
      }
    } catch {}
  };

  const handleSaveAdminSetting = async (key: string, value: string) => {
    setIsSavingSettings(true);
    setAdminSettingsMessage("");
    try {
      const res = await adminFetch("/api/admin-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const result = await res.json();
      if (result.success) {
        setAdminSettings((prev) => ({ ...prev, [key]: value }));
        setAdminSettingsMessage("Saved.");
      } else {
        setAdminSettingsMessage(result.error || "Failed to save.");
      }
    } catch {
      setAdminSettingsMessage("Something went wrong.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // ── Case acceptance modal ─────────────────────────────────────────────────

  const openAcceptanceModal = (reference: string) => {
    setAcceptanceModal({ open: true, reference, hasAcceptedTerms: false });
  };

  const handleConfirmAcceptance = async () => {
    if (!acceptanceModal.hasAcceptedTerms) return;
    const { reference } = acceptanceModal;
    setAcceptanceModal({ open: false, reference: "", hasAcceptedTerms: false });

    // Submit accepted status
    setIsUpdatingCaseStatus(true);
    setCaseStatusMessage("");
    try {
      const res = await fetch("/api/firm-update-case-status", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${firmToken}` },
        body: JSON.stringify({ reference, status: "accepted", notes: "" }),
      });
      const result = await res.json();
      if (result.success) {
        setCaseStatusMessage(`Case ${reference} accepted. Estimated completion: ${result.eta_date ? new Date(result.eta_date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : ""}`);
        await loadFirmPortalData(firmToken);
      } else {
        setCaseStatusMessage(result.error || "Failed to accept case.");
      }
    } catch {
      setCaseStatusMessage("Something went wrong.");
    } finally {
      setIsUpdatingCaseStatus(false);
    }
  };

  // ── Case status update ────────────────────────────────────────────────────

  const handleUpdateCaseStatus = async (reference: string, status: string, notes = "") => {
    // Fallen through requires a reason
    let fall_through_reason: string | undefined;
    let target_completion_date: string | undefined;
    if (status === "fallen_through") {
      const reason = window.prompt("Reason for falling through:\n\nOptions: buyer withdrew, survey issue, mortgage refused, chain collapse, other");
      if (!reason) return;
      fall_through_reason = reason;
    }
    if (status === "exchanged") {
      const completionDate = window.prompt("Target completion date (YYYY-MM-DD):");
      if (completionDate) target_completion_date = completionDate;
    }
    setIsUpdatingCaseStatus(true);
    setCaseStatusMessage("");
    try {
      const res = await fetch("/api/firm-update-case-status", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${firmToken}` },
        body: JSON.stringify({ reference, status, notes, fall_through_reason, target_completion_date }),
      });
      const result = await res.json();

      if (result.success) {
        const eta = result.eta_date
          ? new Date(result.eta_date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
          : null;
        setCaseStatusMessage(`Status updated${eta ? `. ETA: ${eta}` : ""}.`);

        // If completed, auto-generate invoice
        if (status === "completed") {
          await handleGenerateInvoice(reference);
        }
        await loadFirmPortalData(firmToken);
      } else {
        setCaseStatusMessage(result.error || "Failed to update status.");
      }
    } catch {
      setCaseStatusMessage("Something went wrong.");
    } finally {
      setIsUpdatingCaseStatus(false);
    }
  };

  // ── Invoice generation ────────────────────────────────────────────────────

  const handleGenerateInvoice = async (reference: string) => {
    setIsGeneratingInvoice(true);
    setInvoiceMessage("");
    try {
      const res = await fetch("/api/generate-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${firmToken}` },
        body: JSON.stringify({ reference }),
      });
      const result = await res.json();
      if (result.success) {
        setInvoiceData(result.invoice || null);
        setInvoiceMessage(`Invoice ${result.invoice_ref} generated and emailed to your firm.`);
      } else {
        setInvoiceMessage(result.error || "Failed to generate invoice.");
      }
    } catch {
      setInvoiceMessage("Something went wrong generating the invoice.");
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  // ── Referrer management ───────────────────────────────────────────────────

  const loadAllReferrers = async () => {
    setIsLoadingReferrers(true);
    try {
      const res = await adminFetch("/api/manage-referrers");
      const result = await res.json();
      if (result.success) setAllReferrers(result.referrers || []);
    } catch {}
    finally { setIsLoadingReferrers(false); }
  };

  const handleSaveReferrer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingReferrer(true);
    setReferrerSaveMessage("");
    try {
      const res = await adminFetch("/api/manage-referrers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...referrerEditor,
          referral_fee: Number(referrerEditor.referral_fee) || 0,
          password: referrerEditor.password || undefined,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setReferrerSaveMessage(result.mode === "created" ? "Referrer created." : "Referrer updated.");
        setReferrerEditor({ id: null, referrer_name: "", contact_email: "", contact_phone: "", referral_fee: "", portal_email: "", portal_active: false, notes: "", password: "" });
        await loadAllReferrers();
      } else {
        setReferrerSaveMessage(result.error || "Failed to save referrer.");
      }
    } catch {
      setReferrerSaveMessage("Something went wrong.");
    } finally {
      setIsSavingReferrer(false);
    }
  };

  // ── Invoice list ──────────────────────────────────────────────────────────

  const loadAllInvoices = async () => {
    setIsLoadingInvoices(true);
    try {
      const res = await adminFetch("/api/list-enquiries?invoiced=1");
      const result = await res.json();
      if (result.success) {
        setAllInvoices((result.enquiries || []).filter((e: { invoice_ref?: string; voided_invoice_ref?: string }) => e.invoice_ref || e.voided_invoice_ref));
      }
    } catch {}
    finally { setIsLoadingInvoices(false); }
  };

  // ── Pipeline ──────────────────────────────────────────────────────────────

  const loadPipeline = async () => {
    setIsLoadingPipeline(true);
    try {
      const res = await adminFetch("/api/list-enquiries?assigned=1");
      const result = await res.json();
      if (result.success) setPipeline(result.enquiries || []);
    } catch {}
    finally { setIsLoadingPipeline(false); }
  };

  // ── Firm fee config ───────────────────────────────────────────────────────

  const loadFeeConfig = async (type: string) => {
    try {
      const res = await fetch(`/api/firm-fee-config?type=${encodeURIComponent(type)}`, {
        headers: { Authorization: `Bearer ${firmToken}` },
      });
      const result = await res.json();
      if (result.success) {
        setFeeConfigItems(
          result.fees.length > 0
            ? result.fees.map((f: Record<string, unknown>) => ({
                label: String(f.label || ""),
                amount: Number(f.amount || 0),
                includes_vat: Number(f.includes_vat) === 1,
                is_disbursement: Number(f.is_disbursement) === 1,
              }))
            : getDefaultFeeItems(type)
        );
      }
    } catch {}
  };

  const getDefaultFeeItems = (type: string): { label: string; amount: number; includes_vat: boolean; is_disbursement: boolean }[] => {
    const defaults: Record<string, { label: string; amount: number; includes_vat: boolean; is_disbursement: boolean }[]> = {
      purchase: [
        { label: "Legal fee", amount: 1025, includes_vat: true, is_disbursement: false },
        { label: "Search pack", amount: 350, includes_vat: false, is_disbursement: true },
        { label: "Land Registry fee", amount: 150, includes_vat: false, is_disbursement: true },
        { label: "ID checks", amount: 14.4, includes_vat: false, is_disbursement: true },
        { label: "SDLT submission fee", amount: 6, includes_vat: false, is_disbursement: true },
      ],
      sale: [
        { label: "Legal fee", amount: 995, includes_vat: true, is_disbursement: false },
        { label: "Office copy entries", amount: 12, includes_vat: false, is_disbursement: true },
        { label: "ID checks", amount: 14.4, includes_vat: false, is_disbursement: true },
      ],
      remortgage: [
        { label: "Legal fee", amount: 695, includes_vat: true, is_disbursement: false },
        { label: "Office copy entries", amount: 12, includes_vat: false, is_disbursement: true },
        { label: "ID checks", amount: 14.4, includes_vat: false, is_disbursement: true },
      ],
      transfer: [
        { label: "Legal fee", amount: 550, includes_vat: true, is_disbursement: false },
        { label: "Office copy entries", amount: 12, includes_vat: false, is_disbursement: true },
        { label: "ID checks", amount: 14.4, includes_vat: false, is_disbursement: true },
      ],
    };
    return defaults[type] || [{ label: "Legal fee", amount: 0, includes_vat: true, is_disbursement: false }];
  };

  const handleSaveFeeConfig = async () => {
    setIsSavingFees(true);
    setFeeConfigMessage("");
    try {
      const res = await fetch("/api/firm-fee-config", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${firmToken}` },
        body: JSON.stringify({ transaction_type: feeConfigType, fees: feeConfigItems }),
      });
      const result = await res.json();
      setFeeConfigMessage(result.success ? "Fee configuration saved." : result.error || "Failed to save.");
    } catch {
      setFeeConfigMessage("Something went wrong.");
    } finally {
      setIsSavingFees(false);
    }
  };

  const addFeeItem = (isDisbursement: boolean) => {
    setFeeConfigItems((prev) => [
      ...prev,
      { label: "", amount: 0, includes_vat: !isDisbursement, is_disbursement: isDisbursement },
    ]);
  };

  const updateFeeItem = (index: number, field: string, value: string | number | boolean) => {
    setFeeConfigItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeFeeItem = (index: number) => {
    setFeeConfigItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Firm quotes ───────────────────────────────────────────────────────────

  const loadFirmQuotes = async () => {
    setIsLoadingFirmQuotes(true);
    try {
      const res = await fetch("/api/firm-quotes", {
        headers: { Authorization: `Bearer ${firmToken}` },
      });
      const result = await res.json();
      if (result.success) setFirmQuotes(result.quotes || []);
    } catch {}
    finally { setIsLoadingFirmQuotes(false); }
  };

  const buildFirmQuoteData = () => {
    const legalFees = feeConfigItems
      .filter((f) => !f.is_disbursement)
      .map((f) => ({
        label: f.label,
        amount: f.includes_vat ? Number((f.amount).toFixed(2)) : Number(f.amount.toFixed(2)),
        includesVat: f.includes_vat,
      }));

    const disbursements = feeConfigItems
      .filter((f) => f.is_disbursement)
      .map((f) => ({ label: f.label, amount: Number(f.amount.toFixed(2)) }));

    const legalFeesExVat = legalFees.reduce((sum, f) => sum + f.amount, 0);
    const vat = Number((legalFeesExVat * 0.2).toFixed(2));
    const disbursementTotal = disbursements.reduce((sum, d) => sum + d.amount, 0);
    const grandTotal = Number((legalFeesExVat + vat + disbursementTotal).toFixed(2));

    const sdltAmount = includeQuoteSdlt && quoteSdltAmount ? Number(quoteSdltAmount) : undefined;
    const totalIncludingSdlt = sdltAmount !== undefined ? Number((grandTotal + sdltAmount).toFixed(2)) : undefined;

    return { legalFees, disbursements, vat, legalFeesExVat, disbursementTotal, grandTotal, sdltAmount, totalIncludingSdlt };
  };

  // Auto-calculate SDLT from quote form fields
  const calcQuoteSdlt = () => {
    const p = Number(String(firmQuoteForm.price).replace(/,/g, ""));
    if (!p || firmQuoteForm.transaction_type !== "purchase") return;
    const isFirst = (firmQuoteForm as Record<string, string>).firstTimeBuyer === "yes";
    const isAdditional = (firmQuoteForm as Record<string, string>).additionalProperty === "yes";
    const isNonUk = (firmQuoteForm as Record<string, string>).ukResidentForSdlt === "no";

    function calcStd(v: number) {
      let t = 0;
      if (v > 250000) t += (Math.min(v, 925000) - 250000) * 0.05;
      if (v > 925000) t += (Math.min(v, 1500000) - 925000) * 0.1;
      if (v > 1500000) t += (v - 1500000) * 0.12;
      return Math.max(0, t);
    }
    function calcFtb(v: number) {
      if (v > 625000) return calcStd(v);
      return Math.max(0, v > 425000 ? (v - 425000) * 0.05 : 0);
    }

    const base = isFirst && !isAdditional ? calcFtb(p) : calcStd(p);
    let surcharge = 0;
    if (isAdditional) surcharge += p * 0.05;
    if (isNonUk) surcharge += p * 0.02;
    const total = base + surcharge;
    setQuoteSdltAmount(total.toFixed(2));
    setIncludeQuoteSdlt(true);
  };

  const handleCreateQuote = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreatingQuote(true);
    setFirmQuoteSendMessage("");

    try {
      const quoteData = buildFirmQuoteData();
      const res = await fetch("/api/firm-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${firmToken}` },
        body: JSON.stringify({
          ...firmQuoteForm,
          quote_json: JSON.stringify(quoteData),
        }),
      });
      const result = await res.json();
      if (result.success) {
        setFirmQuoteForm((prev) => ({ ...prev, internal_reference: result.internal_reference }));
        setFirmQuoteSendMessage(`Quote created. Reference: ${result.internal_reference}`);
        await loadFirmQuotes();
      } else {
        setFirmQuoteSendMessage(result.error || "Failed to create quote.");
      }
    } catch {
      setFirmQuoteSendMessage("Something went wrong.");
    } finally {
      setIsCreatingQuote(false);
    }
  };

  const handleSendFirmQuote = async (internalRef: string) => {
    setFirmQuoteSendMessage("");
    try {
      const res = await fetch("/api/firm-quote-send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${firmToken}` },
        body: JSON.stringify({ internal_reference: internalRef }),
      });
      const result = await res.json();
      setFirmQuoteSendMessage(result.success
        ? `Quote sent to client successfully.`
        : result.error || "Failed to send.");
      if (result.success) await loadFirmQuotes();
    } catch {
      setFirmQuoteSendMessage("Something went wrong sending the quote.");
    }
  };

  // Save a new firm quote then immediately send it to the client in one step
  const handleCreateAndSendFirmQuote = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingAndSending(true);
    setFirmQuoteSendMessage("");

    try {
      // Step 1 — save the quote
      const quoteData = buildFirmQuoteData();
      const saveRes = await fetch("/api/firm-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${firmToken}` },
        body: JSON.stringify({ ...firmQuoteForm, quote_json: JSON.stringify(quoteData) }),
      });
      const saveResult = await saveRes.json();
      if (!saveResult.success) {
        setFirmQuoteSendMessage(saveResult.error || "Failed to save quote.");
        return;
      }

      const internalRef = saveResult.internal_reference as string;
      setFirmQuoteForm((prev) => ({ ...prev, internal_reference: internalRef }));
      await loadFirmQuotes();

      // Step 2 — send it to the client
      const sendRes = await fetch("/api/firm-quote-send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${firmToken}` },
        body: JSON.stringify({ internal_reference: internalRef }),
      });
      const sendResult = await sendRes.json();
      setFirmQuoteSendMessage(
        sendResult.success
          ? `Quote saved (${internalRef}) and sent to client successfully.`
          : sendResult.error || "Quote saved but failed to send to client."
      );
      if (sendResult.success) await loadFirmQuotes();
    } catch {
      setFirmQuoteSendMessage("Something went wrong. Please try again.");
    } finally {
      setIsSavingAndSending(false);
    }
  };

  // Delete a firm quote (only draft/sent — not accepted)
  const handleDeleteFirmQuote = async (internalRef: string) => {
    const confirmed = window.confirm(
      `Delete quote ${internalRef}?\n\nThis cannot be undone. Accepted quotes cannot be deleted.`
    );
    if (!confirmed) return;
    setIsDeletingFirmQuote(internalRef);
    setFirmQuoteManageMessage("");
    try {
      const res = await fetch(`/api/firm-quote-manage?ref=${encodeURIComponent(internalRef)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${firmToken}` },
      });
      const result = await res.json() as { success: boolean; error?: string };
      if (result.success) {
        setFirmQuoteManageMessage(`Quote ${internalRef} deleted.`);
        await loadFirmQuotes();
      } else {
        setFirmQuoteManageMessage(result.error || "Failed to delete quote.");
      }
    } catch {
      setFirmQuoteManageMessage("Something went wrong.");
    } finally {
      setIsDeletingFirmQuote(null);
    }
  };

  // Load a quote into the form for editing
  const handleLoadFirmQuoteForEdit = (q: FirmQuoteRow) => {
    setFirmQuoteForm({
      firm_reference: q.firm_reference || "",
      client_name: q.client_name || "",
      client_email: q.client_email || "",
      client_phone: "",
      transaction_type: q.transaction_type || "purchase",
      tenure: "freehold",
      price: q.price ? String(q.price) : "",
      postcode: "",
      email_signature: "",
      internal_reference: q.internal_reference,
    });
    void loadFeeConfig(q.transaction_type || "purchase");
    setQuoteBuilderMode("edit");
    setFirmQuoteSendMessage("");
    setFirmQuoteManageMessage("");
  };

  // Save edits to an existing quote
  const handleUpdateFirmQuote = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreatingQuote(true);
    setFirmQuoteManageMessage("");
    try {
      const quoteData = buildFirmQuoteData();
      const res = await fetch("/api/firm-quote-manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${firmToken}` },
        body: JSON.stringify({
          ...firmQuoteForm,
          quote_json: JSON.stringify(quoteData),
        }),
      });
      const result = await res.json() as { success: boolean; error?: string };
      if (result.success) {
        setFirmQuoteManageMessage("Quote updated successfully. It has been reset to draft — resend to client if needed.");
        await loadFirmQuotes();
      } else {
        setFirmQuoteManageMessage(result.error || "Failed to update quote.");
      }
    } catch {
      setFirmQuoteManageMessage("Something went wrong.");
    } finally {
      setIsCreatingQuote(false);
    }
  };

  // Push the ETA forward by 2 months on a referred matter
  const handlePushEta = async (reference: string) => {
    try {
      const res = await fetch("/api/firm-update-case-status", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${firmToken}` },
        body: JSON.stringify({ reference, status: "on_hold", notes: "ETA pushed forward by firm" }),
      });
      const result = await res.json() as { success: boolean; eta_date?: string; error?: string };
      if (result.success) {
        setCaseStatusMessage(`Estimated completion date updated to ${result.eta_date ? new Date(result.eta_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "2 months from now"}.`);
        if (firmToken) void loadFirmPortalData(firmToken);
      }
    } catch { /* silently ignore */ }
  };

  // Void an invoice — clears it from the live invoices list without deleting enquiry data
  const handleVoidInvoice = async (reference: string) => {
    if (!reference) return;
    const confirmed = window.confirm(
      `Are you sure you want to void this invoice?\n\nThe enquiry (${reference}) will remain intact. This cannot be undone.`
    );
    if (!confirmed) return;

    setIsVoidingInvoice(true);
    setVoidInvoiceMessage("");
    try {
      const res = await adminFetch("/api/void-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      const result = await res.json() as { success: boolean; error?: string; voided_invoice_ref?: string };
      if (result.success) {
        setVoidInvoiceMessage(`Invoice ${result.voided_invoice_ref || ""} voided successfully.`);
        setSelectedInvoice(null);
        await loadAllInvoices();
      } else {
        setVoidInvoiceMessage(result.error || "Failed to void invoice.");
      }
    } catch {
      setVoidInvoiceMessage("Something went wrong voiding the invoice.");
    } finally {
      setIsVoidingInvoice(false);
    }
  };

  // Delete a quote/enquiry — only allowed when no active invoice exists
  const handleDeleteQuote = async (reference: string) => {
    if (!reference) return;
    const confirmed = window.confirm(
      `Permanently delete enquiry ${reference}?\n\nThis cannot be undone. If an invoice exists you must void it first.`
    );
    if (!confirmed) return;

    setIsDeletingQuote(reference);
    setDeleteQuoteMessage(null);
    try {
      const res = await adminFetch("/api/delete-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      const result = await res.json() as { success: boolean; error?: string };
      if (result.success) {
        setDeleteQuoteMessage({ ref: reference, text: `Enquiry ${reference} deleted.` });
        await loadDashboardData();
      } else {
        setDeleteQuoteMessage({ ref: reference, text: result.error || "Failed to delete." });
      }
    } catch {
      setDeleteQuoteMessage({ ref: reference, text: "Something went wrong." });
    } finally {
      setIsDeletingQuote(null);
    }
  };

  // Load audit log (optionally filtered by reference)
  const handleLoadAuditLog = async (filterRef?: string) => {
    setIsLoadingAudit(true);
    try {
      const qs = filterRef ? `?reference=${encodeURIComponent(filterRef)}` : "";
      const res = await adminFetch(`/api/get-audit-log${qs}`);
      const result = await res.json() as { success: boolean; entries?: AuditEntry[] };
      if (result.success) setAuditLog(result.entries || []);
    } catch { /* silently ignore */ }
    finally { setIsLoadingAudit(false); }
  };

  // Load full history for the currently selected firm
  const handleLoadFirmHistory = async (firmId: number) => {
    setIsLoadingFirmHistory(true);
    setFirmHistory(null);
    setShowFirmHistory(true);
    try {
      const res = await adminFetch(`/api/get-firm-history?firm_id=${firmId}`);
      const result = await res.json() as { success: boolean; enquiries?: FirmHistoryEnquiry[]; summary?: FirmHistorySummary; error?: string };
      if (result.success) {
        setFirmHistory({ enquiries: result.enquiries || [], summary: result.summary || { totalReferrals: 0, totalInvoiced: 0, totalPaid: 0 } });
      }
    } catch { /* silently ignore */ }
    finally { setIsLoadingFirmHistory(false); }
  };

  // Toggle invoice paid/unpaid status
  const handleMarkInvoicePaid = async (reference: string, currentStatus: string) => {
    const markAsPaid = currentStatus !== "paid";
    const confirmed = window.confirm(markAsPaid
      ? `Mark invoice for ${reference} as PAID?`
      : `Revert invoice for ${reference} back to ISSUED (unpaid)?`
    );
    if (!confirmed) return;
    setIsMarkingPaid(reference);
    try {
      const res = await adminFetch("/api/mark-invoice-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, mark_as_paid: markAsPaid }),
      });
      const result = await res.json() as { success: boolean; invoice_status?: string; error?: string };
      if (result.success) {
        setAllInvoices((prev) => prev.map((inv) =>
          inv.reference === reference ? { ...inv, invoice_status: result.invoice_status || "issued" } : inv
        ));
        // Update selectedInvoice if open
        if (selectedInvoice && selectedInvoice.reference === reference) {
          setSelectedInvoice((prev) => prev ? { ...prev, invoice_status: result.invoice_status } : prev);
        }
      }
    } catch { /* silently ignore */ }
    finally { setIsMarkingPaid(null); }
  };

  // Suspend or unsuspend a firm without deleting it
  const handleToggleFirmSuspension = async () => {
    if (!selectedFirmId) return;
    const isSuspended = firmEditor.suspended;
    const action = isSuspended ? "unsuspend" : "suspend";
    const confirmed = window.confirm(
      isSuspended
        ? `Unsuspend ${firmEditor.firm_name}? They will reappear in the assignment dropdown.`
        : `Suspend ${firmEditor.firm_name}? They will be hidden from the assignment dropdown but their data is kept.`
    );
    if (!confirmed) return;
    const updatedEditor = { ...firmEditor, suspended: !isSuspended };
    setFirmEditor(updatedEditor);
    try {
      const res = await adminFetch("/api/save-panel-firm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedEditor),
      });
      const result = await res.json() as { success: boolean; error?: string };
      if (result.success) {
        setFirmSaveMessage(`Firm ${action}ed successfully.`);
        await loadDashboardData();
      } else {
        setFirmEditor(firmEditor); // revert on failure
        setFirmSaveMessage(result.error || `Failed to ${action} firm.`);
      }
    } catch {
      setFirmEditor(firmEditor);
      setFirmSaveMessage("Something went wrong.");
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
    window.history.pushState({}, "", nextUrl.toString());

    await loadEnquiryByReference(nextReference);
  };

  const handleOpenDashboardEnquiry = async (reference: string) => {
    if (!reference) return;

    setManualReference(reference);
    setAdminTab("quote");

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("ref", reference);
    window.history.pushState({}, "", nextUrl.toString());

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

  // Listen for browser back/forward — when user presses Back from a quote,
  // the URL loses the ?ref= param and we restore the dashboard view.
  useEffect(() => {
    if (!isAdminPage) return;
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref") || "";
      if (ref) {
        setManualReference(ref);
        setAdminTab("quote");
        void loadEnquiryByReference(ref);
      } else {
        setAdminTab("dashboard");
        setLoadedEnquiry(null);
        setLoadedEnquiryMessage("");
        setManualReference("");
        void loadDashboardData();
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isAdminPage, isAdminUnlocked]);

  // If the user lands directly on /firm-portal with a token in memory, load data
  useEffect(() => {
    if (isFirmPortalPage && firmToken && !firmPortalData && !isLoadingFirmPortal) {
      void loadFirmPortalData(firmToken);
    }
  }, [isFirmPortalPage, firmToken]);

  useEffect(() => {
    if (!selectedFirmId && !isAddingNewFirm && dashboardFirms.length > 0 && adminTab === "firms") {
      selectFirmForEditing(dashboardFirms[0]);
    }
  }, [dashboardFirms, selectedFirmId, isAddingNewFirm, adminTab]);

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

  const isPublicPage = !isAdminPage && !isFirmLoginPage && !isFirmPortalPage && !isReferrerLoginPage && !isReferrerPortalPage;
  const isHomePage = isPublicPage && (currentPath === "/" || currentPath === "");

  return (
    <div className="page">
      {/* ── Top nav ── */}
      <nav className="site-nav">
        <div className="site-nav__inner">
          <a href="/">
            <img src={logo} alt="ConveyQuote UK" className="site-nav__logo" />
          </a>
          <div className="site-nav__links">
            <a href="/" className={isHomePage ? "active" : ""}>Get a Quote</a>
            <a href="/sdlt-calculator/" className={isSdltPage ? "active" : ""}>SDLT Calculator</a>
            <a href="/about/" className={isAboutPage ? "active" : ""}>About Us</a>
            <a href="/conveyancing-fees/" className={isFeesPage ? "active" : ""}>Fees Guide</a>
            <a href="/firm-login/" className={isFirmLoginPage || isFirmPortalPage ? "active" : ""}>Firm Login</a>
            <a href="/referrer-login/" className={isReferrerLoginPage || isReferrerPortalPage ? "active" : ""}>Referrer Login</a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="hero">
        <div className="hero__inner">
          <div className="hero__brand">
            <img src={logo} alt="ConveyQuote UK" className="hero__logo" />
          </div>

          <div className="hero__text">
            <span className="eyebrow">
              {isAdminPage ? "Internal Admin" : isAboutPage ? "About Us" : isSdltPage ? "SDLT Calculator" : isTermsPage ? "Terms & Conditions" : isPrivacyPage ? "Privacy Policy" : isFeesPage ? "Conveyancing Fees Guide" : isFirmLoginPage || isFirmPortalPage ? "Firm Portal" : isReferrerLoginPage || isReferrerPortalPage ? "Referrer Portal" : "Instant Conveyancing Quotes"}
            </span>
            <h1>
              {isAdminPage ? "Admin Dashboard" : isAboutPage ? "About ConveyQuote" : isSdltPage ? "Stamp Duty Land Tax Calculator" : isTermsPage ? "Terms & Conditions" : isPrivacyPage ? "Privacy Policy" : isFeesPage ? "Understanding Conveyancing Fees" : isFirmLoginPage || isFirmPortalPage ? "Firm Portal" : isReferrerLoginPage || isReferrerPortalPage ? "Referrer Portal" : "Compare conveyancing quotes from regulated solicitors"}
            </h1>
            {isHomePage && (
              <p className="hero__summary">
                Enter your property details once and get a clear, itemised conveyancing quote reviewed by qualified legal professionals. No hidden fees. No obligation.
              </p>
            )}
            {isHomePage && (
              <div className="hero__points">
                <span>✓ Transparent pricing</span>
                <span>✓ SRA-regulated firms</span>
                <span>✓ No obligation</span>
                <span>✓ Fast &amp; simple</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── How it works strip (homepage only) ── */}
      {isHomePage && (
        <>
          <div className="how-strip">
            <div className="how-strip__inner">
              <div className="how-step">
                <div className="how-step__num">1</div>
                <div className="how-step__text">
                  <strong>Enter your details</strong>
                  <span>Tell us about your sale, purchase, remortgage or transfer of equity.</span>
                </div>
              </div>
              <div className="how-step">
                <div className="how-step__num">2</div>
                <div className="how-step__text">
                  <strong>Receive your quote</strong>
                  <span>We match you with an SRA-regulated firm and send a clear, itemised quote.</span>
                </div>
              </div>
              <div className="how-step">
                <div className="how-step__num">3</div>
                <div className="how-step__text">
                  <strong>Instruct with confidence</strong>
                  <span>Accept your quote online and the firm handles the rest.</span>
                </div>
              </div>
            </div>
          </div>
          <div className="trust-bar">
            <span>🏛 SRA-regulated firms only</span>
            <span>📋 Fully itemised quotes</span>
            <span>🔒 ICO registered · CSN9542473</span>
            <span>🇬🇧 England &amp; Wales</span>
          </div>
        </>
      )}

      <main className="container" style={{ paddingTop: "28px" }}>
        {(isHomePage || isSdltPage || isFeesPage || isAboutPage) && (
          <>
            <section className="card card--form">
              <div className="section-heading">
                <div>
                  <h2>Get a Quote</h2>
                  <p>
                    Select your transaction type and we will ask only the questions relevant to your matter. Your quote will be reviewed by our team before being issued.
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
                          >
                            <option value="">
                              {loadingLenders ? "Loading lenders..." : lenders.length === 0 ? "No lenders available — contact us" : "Please select"}
                            </option>
                            {lenders.map((lender) => (
                              <option key={lender.id} value={lender.name}>
                                {lender.name}
                              </option>
                            ))}
                          </select>
                          {lenders.length === 0 && !loadingLenders && (
                            <p className="form-note" style={{ marginTop: "4px" }}>
                              If your lender is not listed, please continue — we will confirm lender eligibility when reviewing your quote.
                            </p>
                          )}
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
                          >
                            <option value="">
                              {loadingLenders ? "Loading lenders..." : lenders.length === 0 ? "Not listed — we will confirm" : "Please select"}
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
                <p>Firm portal</p>
              </div>
              <button
                type="button"
                className="muted-button"
                onClick={() => void handleFirmLogout()}
              >
                Log out
              </button>
            </div>

            {/* Tab nav */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
              {(["referrals", "quotes", "fees", "profile"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={firmPortalTab === tab ? "primary-button" : "muted-button"}
                  onClick={() => {
                    setFirmPortalTab(tab);
                    if (tab === "quotes") void loadFirmQuotes();
                    if (tab === "fees") void loadFeeConfig(feeConfigType);
                    setFirmQuoteSendMessage("");
                    setFeeConfigMessage("");
                    setFirmRespondMessage("");
                  }}
                >
                  {tab === "referrals" ? "Referred Matters"
                    : tab === "quotes" ? "My Quotes"
                    : tab === "fees" ? "Fee Settings"
                    : "Profile"}
                </button>
              ))}
            </div>

            {isLoadingFirmPortal && <p className="form-note">Loading portal data…</p>}
            {firmPortalError && <p className="form-note" style={{ color: "#dc2626" }}>{firmPortalError}</p>}
            {firmRespondMessage && (
              <p className="form-note" style={{ background: "#d1fae5", padding: "10px 14px", borderRadius: "6px", color: "#065f46" }}>
                {firmRespondMessage}
              </p>
            )}

            {firmPortalData && (
              <div className="admin-stack" style={{ marginTop: "4px" }}>

                {/* ── Referrals tab ── */}
                {firmPortalTab === "referrals" && (
                  <>
                    {caseStatusMessage && (
                      <p className="form-note" style={{ background: "#d1fae5", padding: "10px 14px", borderRadius: "6px", color: "#065f46", marginBottom: "4px" }}>
                        {caseStatusMessage}
                      </p>
                    )}
                    {invoiceMessage && (
                      <p className="form-note" style={{ background: "#dbeafe", padding: "10px 14px", borderRadius: "6px", color: "#1e40af", marginBottom: "4px" }}>
                        {invoiceMessage}
                      </p>
                    )}

                    <SummaryCard title="Referred Matters">
                      {(firmPortalData.enquiries as Record<string, unknown>[]).length === 0 ? (
                        <p className="form-note">No matters have been referred to your firm yet.</p>
                      ) : (
                        <div className="detail-table">
                          {(firmPortalData.enquiries as Record<string, unknown>[]).map((enq) => {
                            const ref = String(enq.reference || "");
                            const firmResp = String(enq.firm_response || "");
                            const caseStatus = String(enq.case_status || "");
                            const etaDate = enq.eta_date ? new Date(String(enq.eta_date)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;
                            const isAccepted = firmResp === "accepted";
                            const isDeclined = firmResp === "declined";
                            const isCompleted = caseStatus === "completed";

                            const CASE_STATUSES = [
                              { value: "client_care_sent", label: "Client Care Sent" },
                              { value: "id_requested", label: "ID Requested" },
                              { value: "id_received", label: "ID Received" },
                              { value: "searches_ordered", label: "Searches Ordered" },
                              { value: "searches_received", label: "Searches Received" },
                              { value: "enquiries_raised", label: "Enquiries Raised" },
                              { value: "enquiries_replied", label: "Enquiries Replied" },
                              { value: "report_on_title", label: "Report on Title" },
                              { value: "exchange_ready", label: "Ready to Exchange" },
                              { value: "exchanged", label: "Exchanged" },
                              { value: "completion_ready", label: "Ready to Complete" },
                              { value: "completed", label: "Completed" },
                              { value: "on_hold", label: "On Hold" },
                              { value: "withdrawn", label: "Withdrawn" },
                              { value: "fallen_through", label: "Fallen Through" },
                            ];

                            return (
                              <div key={ref} className="detail-row" style={{ alignItems: "start" }}>
                                <div className="detail-row__label">
                                  <strong>{ref}</strong>
                                  <div>{String(enq.transaction_type || "").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</div>
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
                                  {etaDate && (
                                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                      <span>📅 Est. completion: {etaDate}</span>
                                      {!isCompleted && (
                                        <button
                                          type="button"
                                          style={{ fontSize: "11px", padding: "1px 6px", borderRadius: "4px", border: "1px solid #d1d5db", background: "#f9fafb", cursor: "pointer", color: "#374151" }}
                                          onClick={() => void handlePushEta(ref)}
                                          title="Push estimated completion date forward by 2 months"
                                        >
                                          Push forward
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  {caseStatus && (
                                    <div style={{ marginTop: "6px", fontSize: "12px", background: "#f0f4ff", padding: "3px 8px", borderRadius: "8px", display: "inline-block", color: "#1e40af" }}>
                                      {caseStatus.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                    </div>
                                  )}
                                </div>

                                <div className="detail-row__value">
                                  {!isAccepted && !isDeclined && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                      <button type="button" className="primary-button" style={{ fontSize: "13px" }}
                                        onClick={() => openAcceptanceModal(ref)}>
                                        Review &amp; Accept
                                      </button>
                                      <button type="button" className="muted-button" style={{ fontSize: "13px" }}
                                        onClick={() => {
                                          const notes = window.prompt("Reason for declining (optional):");
                                          void handleFirmRespond(ref, "declined", notes || "");
                                        }}>Decline</button>
                                    </div>
                                  )}

                                  {isDeclined && (
                                    <div style={{ display: "inline-block", padding: "4px 10px", borderRadius: "12px", fontSize: "13px", fontWeight: 600, background: "#fee2e2", color: "#991b1b" }}>
                                      ✗ Declined
                                    </div>
                                  )}

                                  {isAccepted && !isCompleted && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                      <div style={{ display: "inline-block", padding: "3px 8px", borderRadius: "10px", fontSize: "12px", fontWeight: 600, background: "#d1fae5", color: "#065f46", marginBottom: "4px" }}>
                                        ✓ Accepted
                                      </div>
                                      <select
                                        style={{ fontSize: "13px", padding: "6px 8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                                        value=""
                                        onChange={(e) => {
                                          if (e.target.value) {
                                            void handleUpdateCaseStatus(ref, e.target.value);
                                            e.target.value = "";
                                          }
                                        }}
                                      >
                                        <option value="">Update status…</option>
                                        {CASE_STATUSES.map((s) => (
                                          <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                      </select>
                                    </div>
                                  )}

                                  {isCompleted && (
                                    <div>
                                      <div style={{ display: "inline-block", padding: "3px 8px", borderRadius: "10px", fontSize: "12px", fontWeight: 600, background: "#d1fae5", color: "#065f46" }}>
                                        ✓ Completed
                                      </div>
                                      {enq.invoice_ref && (
                                        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>
                                          Invoice: {String(enq.invoice_ref)}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </SummaryCard>

                    <SummaryCard title="Your Lender Panel Memberships">
                      {(firmPortalData.memberships as Record<string, unknown>[]).length === 0 ? (
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
                                <div style={{
                                  display: "inline-block", padding: "2px 8px", borderRadius: "10px",
                                  fontSize: "12px", fontWeight: 600,
                                  background: Number(m.active) === 1 ? "#d1fae5" : "#f3f4f6",
                                  color: Number(m.active) === 1 ? "#065f46" : "#6b7280",
                                }}>
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
                  </>
                )}

                {/* ── My Quotes tab ── */}
                {firmPortalTab === "quotes" && (
                  <>
                    {firmQuoteSendMessage && (
                      <p className="form-note" style={{ background: "#d1fae5", padding: "10px 14px", borderRadius: "6px", color: "#065f46" }}>
                        {firmQuoteSendMessage}
                      </p>
                    )}

                    {quoteBuilderMode === "list" && (
                      <>
                        <SummaryCard title="My Client Quotes">
                          <div style={{ marginBottom: "14px" }}>
                            <button type="button" className="primary-button"
                              onClick={() => {
                                void loadFeeConfig(firmQuoteForm.transaction_type);
                                setQuoteBuilderMode("new");
                                setFirmQuoteSendMessage("");
                                setFirmQuoteForm({ firm_reference: "", client_name: "", client_email: "", client_phone: "", transaction_type: "purchase", tenure: "freehold", price: "", postcode: "", email_signature: "", internal_reference: "" });
                              }}>
                              + New Quote
                            </button>
                          </div>
                          {isLoadingFirmQuotes && <p className="form-note">Loading…</p>}
                          {firmQuotes.length === 0 && !isLoadingFirmQuotes ? (
                            <p className="form-note">No quotes yet. Click New Quote to get started.</p>
                          ) : (
                            <div className="detail-table">
                              {firmQuotes.map((q) => (
                                <div key={q.internal_reference} className="detail-row">
                                  <div className="detail-row__label">
                                    <strong>{q.firm_reference || q.internal_reference}</strong>
                                    <div style={{ fontSize: "12px", color: "#6b7280" }}>{q.internal_reference}</div>
                                    <div>{q.client_name || q.client_email}</div>
                                    <div>{String(q.transaction_type || "").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</div>
                                    {q.price && <div>£{Number(q.price).toLocaleString("en-GB")}</div>}
                                  </div>
                                  <div className="detail-row__value">
                                    <div style={{
                                      display: "inline-block", padding: "2px 8px", borderRadius: "10px",
                                      fontSize: "12px", fontWeight: 600,
                                      background: q.status === "accepted" ? "#d1fae5" : q.status === "rejected" ? "#fee2e2" : q.status === "sent" ? "#dbeafe" : "#f3f4f6",
                                      color: q.status === "accepted" ? "#065f46" : q.status === "rejected" ? "#991b1b" : q.status === "sent" ? "#1e40af" : "#6b7280",
                                    }}>
                                      {q.status === "accepted" ? "✓ Accepted" : q.status === "rejected" ? "✗ Declined" : q.status === "sent" ? "Sent" : "Draft"}
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                                      {q.status !== "accepted" && (
                                        <button type="button" className="muted-button" style={{ fontSize: "12px" }}
                                          onClick={() => void handleSendFirmQuote(q.internal_reference)}>
                                          {q.status === "sent" ? "Resend to Client" : "Send to Client"}
                                        </button>
                                      )}
                                      {q.status !== "accepted" && (
                                        <button type="button" className="muted-button" style={{ fontSize: "12px" }}
                                          onClick={() => handleLoadFirmQuoteForEdit(q)}>
                                          Edit Quote
                                        </button>
                                      )}
                                      <button type="button" className="muted-button" style={{ fontSize: "12px" }}
                                        onClick={() => {
                                          // Build a proper printable quote in a new window
                                          const firmName = firmSession?.firm_name || "Your Solicitor";
                                          const ref2 = q.firm_reference || q.internal_reference;
                                          const txLabel = (q.transaction_type || "").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
                                          const win = window.open("", "_blank");
                                          if (win) {
                                            win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Quote ${ref2}</title>
                                            <style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;color:#1a1a1a;}
                                            h1{color:#0f2747;font-size:22px;margin-bottom:4px;}
                                            .sub{color:#6b7280;font-size:14px;margin-bottom:24px;}
                                            table{border-collapse:collapse;width:100%;margin-bottom:16px;}
                                            td,th{padding:9px 12px;border:1px solid #d1d5db;font-size:14px;}
                                            th{background:#f3f4f6;font-weight:600;text-align:left;}
                                            .total{background:#0f2747;color:#fff;font-weight:700;}
                                            .section{margin-top:20px;font-weight:600;color:#0f2747;border-bottom:2px solid #0f2747;padding-bottom:4px;margin-bottom:8px;}
                                            .footer{margin-top:32px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;}
                                            @media print{button{display:none;}}</style></head><body>
                                            <h1>${firmName}</h1>
                                            <div class="sub">Conveyancing Quote &mdash; ${ref2}</div>
                                            <table><tr><th>Reference</th><td>${ref2}</td></tr>
                                            <tr><th>Client</th><td>${q.client_name || q.client_email}</td></tr>
                                            <tr><th>Transaction</th><td>${txLabel}</td></tr>
                                            ${q.price ? `<tr><th>Property value</th><td>£${Number(q.price).toLocaleString("en-GB")}</td></tr>` : ""}
                                            <tr><th>Date</th><td>${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</td></tr>
                                            </table>`);
                                            // Fee breakdown from firmQuotes doesn't carry quote_json — load detail separately
                                            win.document.write(`<div class="footer">This is an indicative estimate. Final costs will be confirmed upon review. &mdash; Powered by ConveyQuote</div>
                                            <button onclick="window.print()" style="margin-top:20px;padding:10px 24px;background:#0f2747;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;">Print this quote</button>
                                            </body></html>`);
                                            win.document.close();
                                          }
                                        }}>
                                        View / Print PDF
                                      </button>
                                      {q.status !== "accepted" && (
                                        <button type="button" className="muted-button"
                                          style={{ fontSize: "12px", color: "#991b1b", borderColor: "#fca5a5" }}
                                          disabled={isDeletingFirmQuote === q.internal_reference}
                                          onClick={() => void handleDeleteFirmQuote(q.internal_reference)}>
                                          {isDeletingFirmQuote === q.internal_reference ? "Deleting…" : "Delete"}
                                        </button>
                                      )}
                                    </div>
                                    {firmQuoteManageMessage && (
                                      <p style={{ fontSize: "12px", marginTop: "6px",
                                        color: firmQuoteManageMessage.includes("deleted") || firmQuoteManageMessage.includes("updated") ? "#065f46" : "#991b1b" }}>
                                        {firmQuoteManageMessage}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </SummaryCard>
                      </>
                    )}

                    {quoteBuilderMode === "new" && (
                      <SummaryCard title="New Client Quote">
                        <form onSubmit={(e) => void handleCreateFirmQuote(e)}>
                          {/* ── Client & reference ── */}
                          <div style={{ marginBottom: "18px", paddingBottom: "16px", borderBottom: "1px solid var(--border)" }}>
                            <h4 style={{ margin: "0 0 12px", color: "var(--navy)" }}>Client & Reference</h4>
                            <div className="form-grid">
                              <div className="field">
                                <label htmlFor="fqFirmRef">Your reference</label>
                                <input id="fqFirmRef" type="text" value={firmQuoteForm.firm_reference}
                                  onChange={(e) => setFirmQuoteForm((p) => ({ ...p, firm_reference: e.target.value }))}
                                  placeholder="e.g. JS/2026/001" />
                              </div>
                              <div className="field">
                                <label htmlFor="fqSignature">Email sign-off name</label>
                                <input id="fqSignature" type="text" value={firmQuoteForm.email_signature}
                                  onChange={(e) => setFirmQuoteForm((p) => ({ ...p, email_signature: e.target.value }))}
                                  placeholder={firmSession?.firm_name || "Your firm name"} />
                              </div>
                              <div className="field">
                                <label htmlFor="fqClientName">Client name</label>
                                <input id="fqClientName" type="text" value={firmQuoteForm.client_name}
                                  onChange={(e) => setFirmQuoteForm((p) => ({ ...p, client_name: e.target.value }))}
                                  placeholder="Full name" required />
                              </div>
                              <div className="field">
                                <label htmlFor="fqClientEmail">Client email</label>
                                <input id="fqClientEmail" type="email" value={firmQuoteForm.client_email}
                                  onChange={(e) => setFirmQuoteForm((p) => ({ ...p, client_email: e.target.value }))}
                                  placeholder="client@example.com" required />
                              </div>
                              <div className="field">
                                <label htmlFor="fqClientPhone">Client phone</label>
                                <input id="fqClientPhone" type="text" value={firmQuoteForm.client_phone}
                                  onChange={(e) => setFirmQuoteForm((p) => ({ ...p, client_phone: e.target.value }))}
                                  placeholder="Optional" />
                              </div>
                              <div className="field">
                                <label htmlFor="fqType">Transaction type</label>
                                <select id="fqType" value={firmQuoteForm.transaction_type}
                                  onChange={(e) => {
                                    setFirmQuoteForm((p) => ({ ...p, transaction_type: e.target.value }));
                                    void loadFeeConfig(e.target.value);
                                  }}>
                                  <option value="purchase">Purchase</option>
                                  <option value="sale">Sale</option>
                                  <option value="remortgage">Remortgage</option>
                                  <option value="transfer">Transfer of Equity</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* ── Transaction-specific fields ── */}
                          <div style={{ marginBottom: "18px", paddingBottom: "16px", borderBottom: "1px solid var(--border)" }}>
                            <h4 style={{ margin: "0 0 12px", color: "var(--navy)" }}>Matter Details</h4>
                            <div className="form-grid">
                              <div className="field">
                                <label htmlFor="fqTenure">Tenure</label>
                                <select id="fqTenure" value={firmQuoteForm.tenure}
                                  onChange={(e) => setFirmQuoteForm((p) => ({ ...p, tenure: e.target.value }))}>
                                  <option value="freehold">Freehold</option>
                                  <option value="leasehold">Leasehold</option>
                                </select>
                              </div>
                              <div className="field">
                                <label htmlFor="fqPrice">Property value (£)</label>
                                <input id="fqPrice" type="text" value={firmQuoteForm.price}
                                  onChange={(e) => setFirmQuoteForm((p) => ({ ...p, price: e.target.value }))}
                                  placeholder="e.g. 300000" />
                              </div>
                              <div className="field">
                                <label htmlFor="fqPostcode">Property postcode</label>
                                <input id="fqPostcode" type="text" value={firmQuoteForm.postcode}
                                  onChange={(e) => setFirmQuoteForm((p) => ({ ...p, postcode: e.target.value }))}
                                  placeholder="e.g. B15 1AA" />
                              </div>

                              {/* Purchase-specific */}
                              {firmQuoteForm.transaction_type === "purchase" && <>
                                <div className="field">
                                  <label>Mortgage or cash?</label>
                                  <select value={(firmQuoteForm as Record<string, string>).mortgage || ""}
                                    onChange={(e) => setFirmQuoteForm((p) => ({ ...p, mortgage: e.target.value }))}>
                                    <option value="">Please select</option>
                                    <option value="mortgage">Mortgage</option>
                                    <option value="cash">Cash</option>
                                  </select>
                                </div>
                                {(firmQuoteForm as Record<string, string>).mortgage === "mortgage" && (
                                  <div className="field">
                                    <label>Lender</label>
                                    <select value={(firmQuoteForm as Record<string, string>).lender || ""}
                                      onChange={(e) => setFirmQuoteForm((p) => ({ ...p, lender: e.target.value }))}>
                                      <option value="">Please select</option>
                                      {lenders.map((l) => <option key={l.id} value={l.name}>{l.name}</option>)}
                                    </select>
                                  </div>
                                )}
                                <div className="field">
                                  <label>Buyer type</label>
                                  <select value={(firmQuoteForm as Record<string, string>).ownershipType || ""}
                                    onChange={(e) => setFirmQuoteForm((p) => ({ ...p, ownershipType: e.target.value }))}>
                                    <option value="">Please select</option>
                                    <option value="individual">Individual</option>
                                    <option value="joint">Joint</option>
                                    <option value="company">Company</option>
                                  </select>
                                </div>
                                <div className="field">
                                  <label>First time buyer?</label>
                                  <select value={(firmQuoteForm as Record<string, string>).firstTimeBuyer || "no"}
                                    onChange={(e) => setFirmQuoteForm((p) => ({ ...p, firstTimeBuyer: e.target.value }))}>
                                    <option value="no">No</option>
                                    <option value="yes">Yes</option>
                                  </select>
                                </div>
                                <div className="field">
                                  <label>Additional property?</label>
                                  <select value={(firmQuoteForm as Record<string, string>).additionalProperty || "no"}
                                    onChange={(e) => setFirmQuoteForm((p) => ({ ...p, additionalProperty: e.target.value }))}>
                                    <option value="no">No</option>
                                    <option value="yes">Yes</option>
                                  </select>
                                </div>
                                <div className="field">
                                  <label>New build?</label>
                                  <select value={(firmQuoteForm as Record<string, string>).newBuild || "no"}
                                    onChange={(e) => setFirmQuoteForm((p) => ({ ...p, newBuild: e.target.value }))}>
                                    <option value="no">No</option>
                                    <option value="yes">Yes</option>
                                  </select>
                                </div>
                                <div className="field">
                                  <label>Shared ownership?</label>
                                  <select value={(firmQuoteForm as Record<string, string>).sharedOwnership || "no"}
                                    onChange={(e) => setFirmQuoteForm((p) => ({ ...p, sharedOwnership: e.target.value }))}>
                                    <option value="no">No</option>
                                    <option value="yes">Yes</option>
                                  </select>
                                </div>
                                <div className="field">
                                  <label>Help to Buy / scheme?</label>
                                  <select value={(firmQuoteForm as Record<string, string>).helpToBuy || "no"}
                                    onChange={(e) => setFirmQuoteForm((p) => ({ ...p, helpToBuy: e.target.value }))}>
                                    <option value="no">No</option>
                                    <option value="yes">Yes</option>
                                  </select>
                                </div>
                                <div className="field">
                                  <label>Gifted deposit?</label>
                                  <select value={(firmQuoteForm as Record<string, string>).giftedDeposit || "no"}
                                    onChange={(e) => setFirmQuoteForm((p) => ({ ...p, giftedDeposit: e.target.value }))}>
                                    <option value="no">No</option>
                                    <option value="yes">Yes</option>
                                  </select>
                                </div>
                                <div className="field">
                                  <label>UK resident for SDLT?</label>
                                  <select value={(firmQuoteForm as Record<string, string>).ukResidentForSdlt || "yes"}
                                    onChange={(e) => setFirmQuoteForm((p) => ({ ...p, ukResidentForSdlt: e.target.value }))}>
                                    <option value="yes">Yes</option>
                                    <option value="no">No</option>
                                  </select>
                                </div>
                                <div className="field">
                                  <label>Lifetime ISA?</label>
                                  <select value={(firmQuoteForm as Record<string, string>).lifetimeIsa || "no"}
                                    onChange={(e) => setFirmQuoteForm((p) => ({ ...p, lifetimeIsa: e.target.value }))}>
                                    <option value="no">No</option>
                                    <option value="yes">Yes</option>
                                  </select>
                                </div>
                              </>}

                              {/* Sale-specific */}
                              {firmQuoteForm.transaction_type === "sale" && <>
                                <div className="field">
                                  <label>Mortgage to redeem?</label>
                                  <select value={(firmQuoteForm as Record<string, string>).saleMortgage || "no"}
                                    onChange={(e) => setFirmQuoteForm((p) => ({ ...p, saleMortgage: e.target.value }))}>
                                    <option value="no">No</option>
                                    <option value="yes">Yes</option>
                                  </select>
                                </div>
                                <div className="field">
                                  <label>Number of sellers</label>
                                  <select value={(firmQuoteForm as Record<string, string>).numberOfSellers || "1"}
                                    onChange={(e) => setFirmQuoteForm((p) => ({ ...p, numberOfSellers: e.target.value }))}>
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                    <option value="3">3 or more</option>
                                  </select>
                                </div>
                                <div className="field">
                                  <label>Management company?</label>
                                  <select value={(firmQuoteForm as Record<string, string>).managementCompany || "no"}
                                    onChange={(e) => setFirmQuoteForm((p) => ({ ...p, managementCompany: e.target.value }))}>
                                    <option value="no">No</option>
                                    <option value="yes">Yes</option>
                                  </select>
                                </div>
                                <div className="field">
                                  <label>Tenanted?</label>
                                  <select value={(firmQuoteForm as Record<string, string>).tenanted || "no"}
                                    onChange={(e) => setFirmQuoteForm((p) => ({ ...p, tenanted: e.target.value }))}>
                                    <option value="no">No</option>
                                    <option value="yes">Yes</option>
                                  </select>
                                </div>
                              </>}

                              {/* Remortgage-specific */}
                              {firmQuoteForm.transaction_type === "remortgage" && <>
                                <div className="field">
                                  <label>New lender</label>
                                  <select value={(firmQuoteForm as Record<string, string>).newLender || ""}
                                    onChange={(e) => setFirmQuoteForm((p) => ({ ...p, newLender: e.target.value }))}>
                                    <option value="">Please select</option>
                                    {lenders.map((l) => <option key={l.id} value={l.name}>{l.name}</option>)}
                                  </select>
                                </div>
                                <div className="field">
                                  <label>Additional borrowing?</label>
                                  <select value={(firmQuoteForm as Record<string, string>).additionalBorrowing || "no"}
                                    onChange={(e) => setFirmQuoteForm((p) => ({ ...p, additionalBorrowing: e.target.value }))}>
                                    <option value="no">No</option>
                                    <option value="yes">Yes</option>
                                  </select>
                                </div>
                              </>}

                              {/* Transfer-specific */}
                              {firmQuoteForm.transaction_type === "transfer" && <>
                                <div className="field">
                                  <label>Is there a mortgage?</label>
                                  <select value={(firmQuoteForm as Record<string, string>).transferMortgage || "no"}
                                    onChange={(e) => setFirmQuoteForm((p) => ({ ...p, transferMortgage: e.target.value }))}>
                                    <option value="no">No</option>
                                    <option value="yes">Yes</option>
                                  </select>
                                </div>
                                <div className="field">
                                  <label>Owners changing</label>
                                  <select value={(firmQuoteForm as Record<string, string>).ownersChanging || "one"}
                                    onChange={(e) => setFirmQuoteForm((p) => ({ ...p, ownersChanging: e.target.value }))}>
                                    <option value="one">One</option>
                                    <option value="two">Two</option>
                                    <option value="more">More than two</option>
                                  </select>
                                </div>
                              </>}
                            </div>
                          </div>

                          {/* ── Fee line items ── */}
                          <div style={{ marginBottom: "18px" }}>
                            <h4 style={{ margin: "0 0 10px", color: "var(--navy)" }}>Quote Line Items</h4>
                            <p className="form-note" style={{ marginBottom: "10px" }}>
                              Pre-filled from your saved fee settings. Adjust amounts, edit labels, or add/remove rows as needed.
                            </p>
                            {feeConfigItems.length === 0 && (
                              <p className="form-note" style={{ color: "#dc2626" }}>
                                No fee config saved for this transaction type. Go to the Fee Settings tab first.
                              </p>
                            )}

                            {feeConfigItems.some((f) => !f.is_disbursement) && (
                              <div style={{ marginBottom: "12px" }}>
                                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--navy)", marginBottom: "6px" }}>Legal Fees</div>
                                {feeConfigItems.map((item, idx) => !item.is_disbursement ? (
                                  <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px", flexWrap: "wrap" }}>
                                    <input type="text" value={item.label} style={{ flex: 1, minWidth: "140px" }}
                                      onChange={(e) => updateFeeItem(idx, "label", e.target.value)} placeholder="Fee description" />
                                    <input type="number" step="0.01" min="0" value={item.amount} style={{ width: "110px" }}
                                      onChange={(e) => updateFeeItem(idx, "amount", Number(e.target.value))} />
                                    <button type="button" style={{ padding: "0 8px", minHeight: 36, border: "1px solid #fca5a5", borderRadius: 6, background: "#fff", color: "#991b1b", cursor: "pointer", fontSize: "14px" }}
                                      onClick={() => removeFeeItem(idx)} title="Remove">✕</button>
                                  </div>
                                ) : null)}
                              </div>
                            )}

                            {feeConfigItems.some((f) => f.is_disbursement) && (
                              <div style={{ marginBottom: "12px" }}>
                                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--navy)", marginBottom: "6px" }}>Disbursements</div>
                                {feeConfigItems.map((item, idx) => item.is_disbursement ? (
                                  <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px", flexWrap: "wrap" }}>
                                    <input type="text" value={item.label} style={{ flex: 1, minWidth: "140px" }}
                                      onChange={(e) => updateFeeItem(idx, "label", e.target.value)} placeholder="Disbursement description" />
                                    <input type="number" step="0.01" min="0" value={item.amount} style={{ width: "110px" }}
                                      onChange={(e) => updateFeeItem(idx, "amount", Number(e.target.value))} />
                                    <button type="button" style={{ padding: "0 8px", minHeight: 36, border: "1px solid #fca5a5", borderRadius: 6, background: "#fff", color: "#991b1b", cursor: "pointer", fontSize: "14px" }}
                                      onClick={() => removeFeeItem(idx)} title="Remove">✕</button>
                                  </div>
                                ) : null)}
                              </div>
                            )}

                            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                              <button type="button" className="muted-button" style={{ fontSize: "12px", padding: "0 12px", minHeight: 32 }}
                                onClick={() => addFeeItem(false)}>+ Add Legal Fee</button>
                              <button type="button" className="muted-button" style={{ fontSize: "12px", padding: "0 12px", minHeight: 32 }}
                                onClick={() => addFeeItem(true)}>+ Add Disbursement</button>
                            </div>

                            {firmQuoteForm.transaction_type === "purchase" && (
                              <div style={{ background: "#f0f7ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "14px 16px", marginBottom: "12px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                                  <strong style={{ fontSize: "13px", color: "var(--navy)" }}>Stamp Duty (SDLT)</strong>
                                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                                    <input type="checkbox" checked={includeQuoteSdlt} onChange={(e) => setIncludeQuoteSdlt(e.target.checked)} />
                                    Include in quote
                                  </label>
                                </div>
                                {includeQuoteSdlt && (
                                  <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", flexWrap: "wrap" }}>
                                    <div>
                                      <label style={{ fontSize: "12px", display: "block", marginBottom: "3px" }}>SDLT amount (£)</label>
                                      <input type="number" step="0.01" min="0" value={quoteSdltAmount}
                                        onChange={(e) => setQuoteSdltAmount(e.target.value)}
                                        placeholder="e.g. 5000.00" style={{ width: "140px" }} />
                                    </div>
                                    <button type="button" className="muted-button" style={{ fontSize: "12px", minHeight: 36 }}
                                      onClick={calcQuoteSdlt}>Auto-calculate from form</button>
                                    <p className="form-note" style={{ width: "100%", margin: "6px 0 0", fontSize: "11px" }}>
                                      SDLT is shown separately in the quote email. It is paid to HMRC by your client, not to your firm.
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {feeConfigItems.length > 0 && (() => {
                              const qd = buildFirmQuoteData();
                              return (
                                <div style={{ marginTop: "14px", padding: "14px 18px", background: "#f7f9fc", borderRadius: "10px", border: "1px solid var(--border)" }}>
                                  {[
                                    ["Legal fees ex VAT", `£${qd.legalFeesExVat.toFixed(2)}`],
                                    ["VAT (20%)", `£${qd.vat.toFixed(2)}`],
                                    ["Disbursements", `£${qd.disbursementTotal.toFixed(2)}`],
                                  ].map(([label, val]) => (
                                    <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "14px" }}>
                                      <span style={{ color: "var(--muted)" }}>{label}</span><span>{val}</span>
                                    </div>
                                  ))}
                                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "8px", marginTop: "6px", fontWeight: 700, fontSize: "15px", color: "var(--navy)" }}>
                                    <span>Total estimate (ex SDLT)</span><span>£{qd.grandTotal.toFixed(2)}</span>
                                  </div>
                                  {qd.sdltAmount !== undefined && (
                                    <>
                                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "14px" }}>
                                        <span style={{ color: "var(--muted)" }}>Estimated SDLT</span><span>£{qd.sdltAmount.toFixed(2)}</span>
                                      </div>
                                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontWeight: 700, fontSize: "15px", color: "#065f46" }}>
                                        <span>Total inc. SDLT</span><span>£{(qd.totalIncludingSdlt ?? 0).toFixed(2)}</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          <div className="form-footer action-row" style={{ marginTop: "20px" }}>
                            <button type="button" className="muted-button"
                              onClick={() => setQuoteBuilderMode("list")}>Cancel</button>
                            <button type="submit" className="primary-button" disabled={isCreatingQuote || isSavingAndSending}>
                              {isCreatingQuote ? "Saving…" : "Save Quote"}
                            </button>
                            <button
                              type="button"
                              className="primary-button"
                              style={{ background: "var(--teal-dark)" }}
                              disabled={isCreatingQuote || isSavingAndSending}
                              onClick={(e) => {
                                void handleCreateAndSendFirmQuote(e as unknown as FormEvent<HTMLFormElement>);
                              }}
                            >
                              {isSavingAndSending ? "Saving & Sending…" : "Save & Send to Client"}
                            </button>
                          </div>

                          {firmQuoteForm.internal_reference && (
                            <div style={{ marginTop: "14px", padding: "14px 18px", background: "#d1fae5", borderRadius: "10px", border: "1px solid #86efac" }}>
                              <p style={{ margin: "0 0 10px", color: "#065f46", fontWeight: 600 }}>
                                ✓ Quote saved — {firmQuoteForm.internal_reference}
                              </p>
                              <div style={{ display: "flex", gap: "10px" }}>
                                <button type="button" className="primary-button" style={{ minHeight: 42, padding: "0 20px" }}
                                  onClick={() => void handleSendFirmQuote(firmQuoteForm.internal_reference)}>
                                  Send to Client
                                </button>
                                <button type="button" className="muted-button" style={{ minHeight: 42, padding: "0 16px" }}
                                  onClick={() => { setQuoteBuilderMode("list"); void loadFirmQuotes(); }}>
                                  Back to List
                                </button>
                              </div>
                              {firmQuoteSendMessage && (
                                <p style={{ margin: "10px 0 0", fontSize: "13px", color: firmQuoteSendMessage.includes("successfully") || firmQuoteSendMessage.includes("sent") ? "#065f46" : "#dc2626" }}>
                                  {firmQuoteSendMessage}
                                </p>
                              )}
                            </div>
                          )}
                        </form>
                      </SummaryCard>
                    )}

                    {quoteBuilderMode === "edit" && (
                      <SummaryCard title={`Edit Quote — ${firmQuoteForm.firm_reference || firmQuoteForm.internal_reference}`}>
                        <div style={{ padding: "10px 14px", background: "#fef3c7", borderRadius: "8px", border: "1px solid #fcd34d", marginBottom: "16px", fontSize: "13px", color: "#92400e" }}>
                          <strong>Note:</strong> Editing this quote will reset it to Draft status. If it was already sent to the client, you will need to resend it. Accepted quotes cannot be edited.
                        </div>
                        <form onSubmit={(e) => void handleUpdateFirmQuote(e)}>
                          <div style={{ marginBottom: "18px", paddingBottom: "16px", borderBottom: "1px solid var(--border)" }}>
                            <h4 style={{ margin: "0 0 12px", color: "var(--navy)" }}>Client & Reference</h4>
                            <div className="form-grid">
                              <div className="field">
                                <label>Your reference</label>
                                <input type="text" value={firmQuoteForm.firm_reference}
                                  onChange={(e) => setFirmQuoteForm((p) => ({ ...p, firm_reference: e.target.value }))}
                                  placeholder="e.g. JS/2026/001" />
                              </div>
                              <div className="field">
                                <label>Client name</label>
                                <input type="text" value={firmQuoteForm.client_name}
                                  onChange={(e) => setFirmQuoteForm((p) => ({ ...p, client_name: e.target.value }))}
                                  placeholder="Full name" required />
                              </div>
                              <div className="field">
                                <label>Client email</label>
                                <input type="email" value={firmQuoteForm.client_email}
                                  onChange={(e) => setFirmQuoteForm((p) => ({ ...p, client_email: e.target.value }))}
                                  placeholder="client@example.com" required />
                              </div>
                              <div className="field">
                                <label>Transaction type</label>
                                <select value={firmQuoteForm.transaction_type}
                                  onChange={(e) => { setFirmQuoteForm((p) => ({ ...p, transaction_type: e.target.value })); void loadFeeConfig(e.target.value); }}>
                                  <option value="purchase">Purchase</option>
                                  <option value="sale">Sale</option>
                                  <option value="remortgage">Remortgage</option>
                                  <option value="transfer">Transfer of Equity</option>
                                </select>
                              </div>
                              <div className="field">
                                <label>Property value (£)</label>
                                <input type="text" value={firmQuoteForm.price}
                                  onChange={(e) => setFirmQuoteForm((p) => ({ ...p, price: e.target.value }))}
                                  placeholder="e.g. 300000" />
                              </div>
                            </div>
                          </div>

                          <div style={{ marginBottom: "18px" }}>
                            <h4 style={{ margin: "0 0 10px", color: "var(--navy)" }}>Quote Line Items</h4>
                            <div className="detail-table">
                              {feeConfigItems.map((item, idx) => (
                                <div key={idx} className="detail-row">
                                  <div className="detail-row__label">
                                    <strong>{item.label}</strong>
                                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                                      {item.is_disbursement ? "Disbursement" : `Legal fee${item.includes_vat ? " (+ VAT)" : ""}`}
                                    </div>
                                  </div>
                                  <div className="detail-row__value">
                                    <input type="number" step="0.01" value={item.amount} style={{ width: "110px" }}
                                      onChange={(e) => updateFeeItem(idx, "amount", Number(e.target.value))} />
                                  </div>
                                </div>
                              ))}
                            </div>
                            {feeConfigItems.length > 0 && (() => {
                              const qd = buildFirmQuoteData();
                              return (
                                <div style={{ marginTop: "14px", padding: "14px 18px", background: "#f7f9fc", borderRadius: "10px", border: "1px solid var(--border)" }}>
                                  {[["Legal fees ex VAT", `£${qd.legalFeesExVat.toFixed(2)}`], ["VAT (20%)", `£${qd.vat.toFixed(2)}`], ["Disbursements", `£${qd.disbursementTotal.toFixed(2)}`]].map(([label, val]) => (
                                    <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "14px" }}>
                                      <span style={{ color: "var(--muted)" }}>{label}</span><span>{val}</span>
                                    </div>
                                  ))}
                                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "8px", marginTop: "6px", fontWeight: 700, fontSize: "15px", color: "var(--navy)" }}>
                                    <span>Total estimate</span><span>£{qd.grandTotal.toFixed(2)}</span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {firmQuoteManageMessage && (
                            <p style={{ fontSize: "13px", padding: "10px 14px", borderRadius: "8px", marginBottom: "12px",
                              background: firmQuoteManageMessage.includes("updated") ? "#d1fae5" : "#fee2e2",
                              color: firmQuoteManageMessage.includes("updated") ? "#065f46" : "#991b1b" }}>
                              {firmQuoteManageMessage}
                            </p>
                          )}

                          <div className="form-footer action-row">
                            <button type="button" className="muted-button" onClick={() => { setQuoteBuilderMode("list"); setFirmQuoteManageMessage(""); }}>Cancel</button>
                            <button type="submit" className="primary-button" disabled={isCreatingQuote}>
                              {isCreatingQuote ? "Saving…" : "Save Changes"}
                            </button>
                          </div>
                        </form>
                      </SummaryCard>
                    )}
                  </>
                )}

                {/* ── Fee Settings tab ── */}
                {firmPortalTab === "fees" && (
                  <SummaryCard title="Fee Configuration">
                    <p className="form-note" style={{ marginTop: 0, marginBottom: "16px" }}>
                      Set your standard fees per transaction type. These are pre-loaded when you create a new quote and can be adjusted per quote.
                    </p>

                    <div style={{ marginBottom: "16px" }}>
                      <label htmlFor="feeType" style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "14px" }}>
                        Transaction type
                      </label>
                      <select id="feeType" value={feeConfigType}
                        onChange={(e) => {
                          setFeeConfigType(e.target.value);
                          void loadFeeConfig(e.target.value);
                          setFeeConfigMessage("");
                        }}
                        style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px" }}>
                        <option value="purchase">Purchase</option>
                        <option value="sale">Sale</option>
                        <option value="remortgage">Remortgage</option>
                        <option value="transfer">Transfer of Equity</option>
                      </select>
                    </div>

                    <h4 style={{ color: "#0f2747", marginBottom: "8px" }}>Legal Fees</h4>
                    <div className="detail-table" style={{ marginBottom: "12px" }}>
                      {feeConfigItems.filter((f) => !f.is_disbursement).map((item, globalIdx) => {
                        const idx = feeConfigItems.indexOf(item);
                        return (
                          <div key={globalIdx} className="detail-row">
                            <div className="detail-row__label" style={{ flex: 2 }}>
                              <input type="text" value={item.label} placeholder="Fee label"
                                onChange={(e) => updateFeeItem(idx, "label", e.target.value)}
                                style={{ width: "100%", padding: "6px 8px", borderRadius: "4px", border: "1px solid #d1d5db", fontSize: "13px" }} />
                              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", marginTop: "6px", color: "#6b7280" }}>
                                <input type="checkbox" checked={item.includes_vat}
                                  onChange={(e) => updateFeeItem(idx, "includes_vat", e.target.checked)} />
                                VAT applicable (adds 20%)
                              </label>
                            </div>
                            <div className="detail-row__value">
                              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                <span style={{ fontSize: "13px" }}>£</span>
                                <input type="number" step="0.01" value={item.amount}
                                  onChange={(e) => updateFeeItem(idx, "amount", Number(e.target.value))}
                                  style={{ width: "90px", padding: "6px 8px", borderRadius: "4px", border: "1px solid #d1d5db", fontSize: "13px" }} />
                                <button type="button" className="muted-button" style={{ fontSize: "12px" }}
                                  onClick={() => removeFeeItem(idx)}>Remove</button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button type="button" className="muted-button" style={{ fontSize: "13px", marginBottom: "20px" }}
                      onClick={() => addFeeItem(false)}>+ Add legal fee</button>

                    <h4 style={{ color: "#0f2747", marginBottom: "8px" }}>Disbursements</h4>
                    <div className="detail-table" style={{ marginBottom: "12px" }}>
                      {feeConfigItems.filter((f) => f.is_disbursement).map((item, localIdx) => {
                        const idx = feeConfigItems.indexOf(item);
                        return (
                          <div key={localIdx} className="detail-row">
                            <div className="detail-row__label" style={{ flex: 2 }}>
                              <input type="text" value={item.label} placeholder="Disbursement label"
                                onChange={(e) => updateFeeItem(idx, "label", e.target.value)}
                                style={{ width: "100%", padding: "6px 8px", borderRadius: "4px", border: "1px solid #d1d5db", fontSize: "13px" }} />
                            </div>
                            <div className="detail-row__value">
                              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                <span style={{ fontSize: "13px" }}>£</span>
                                <input type="number" step="0.01" value={item.amount}
                                  onChange={(e) => updateFeeItem(idx, "amount", Number(e.target.value))}
                                  style={{ width: "90px", padding: "6px 8px", borderRadius: "4px", border: "1px solid #d1d5db", fontSize: "13px" }} />
                                <button type="button" className="muted-button" style={{ fontSize: "12px" }}
                                  onClick={() => removeFeeItem(idx)}>Remove</button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button type="button" className="muted-button" style={{ fontSize: "13px", marginBottom: "20px" }}
                      onClick={() => addFeeItem(true)}>+ Add disbursement</button>

                    {feeConfigMessage && (
                      <p className="form-note" style={{ color: feeConfigMessage.includes("saved") ? "#065f46" : "#dc2626" }}>
                        {feeConfigMessage}
                      </p>
                    )}

                    <div className="form-footer action-row" style={{ marginTop: "14px" }}>
                      <button type="button" className="muted-button"
                        onClick={() => setFeeConfigItems(getDefaultFeeItems(feeConfigType))}>
                        Reset to Defaults
                      </button>
                      <button type="button" className="primary-button" disabled={isSavingFees}
                        onClick={() => void handleSaveFeeConfig()}>
                        {isSavingFees ? "Saving…" : "Save Fee Config"}
                      </button>
                    </div>
                  </SummaryCard>
                )}

                {/* ── Profile tab ── */}
                {firmPortalTab === "profile" && (
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
                )}

              </div>
            )}
          </section>
        )}

        {/* ── Case Acceptance Modal ──────────────────────────────── */}
        {acceptanceModal.open && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, padding: "20px",
          }}>
            <div style={{
              background: "#fff", borderRadius: "16px", maxWidth: "560px", width: "100%",
              padding: "32px", boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}>
              <h2 style={{ color: "#0f2747", margin: "0 0 8px" }}>Accept Referred Matter</h2>
              <p style={{ color: "#6b7280", margin: "0 0 20px", fontSize: "14px" }}>
                Reference: <strong>{acceptanceModal.reference}</strong>
              </p>

              <div style={{ background: "#f7f9fc", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "16px 20px", marginBottom: "20px", maxHeight: "280px", overflowY: "auto", fontSize: "13px", lineHeight: 1.7, color: "#374151" }}>
                <p style={{ margin: "0 0 10px", fontWeight: 700, color: "#0f2747" }}>Terms of Acceptance</p>
                <p style={{ margin: "0 0 8px" }}>By accepting this referral you confirm that:</p>
                <ol style={{ margin: "0 0 10px", paddingLeft: "18px" }}>
                  <li style={{ marginBottom: "6px" }}>You are authorised to accept new matters on behalf of your firm.</li>
                  <li style={{ marginBottom: "6px" }}>You will act in the client's best interests and in accordance with your SRA obligations.</li>
                  <li style={{ marginBottom: "6px" }}>You accept the referral fee terms as agreed with ConveyQuote, payable on completion of the matter.</li>
                  <li style={{ marginBottom: "6px" }}>You will keep ConveyQuote informed of material case progress by updating the status via this portal.</li>
                  <li style={{ marginBottom: "6px" }}>ConveyQuote operates as an introducer only and is not responsible for the conduct of legal services provided by your firm.</li>
                  <li style={{ marginBottom: "6px" }}>An estimated completion date of approximately 2 months will be set. You must update this via the portal if the matter is delayed beyond that date.</li>
                </ol>
                <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>
                  ConveyQuote is a trading name of Essentially Law Limited (Company No. 14625839).
                  We are not a firm of solicitors and do not provide legal advice.
                </p>
              </div>

              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "24px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={acceptanceModal.hasAcceptedTerms}
                  onChange={(e) => setAcceptanceModal((prev) => ({ ...prev, hasAcceptedTerms: e.target.checked }))}
                  style={{ marginTop: "3px", width: "16px", minHeight: "16px" }}
                />
                <span style={{ fontSize: "14px", color: "#374151", lineHeight: 1.5 }}>
                  I have read and agree to the terms above and confirm I am authorised to accept this matter on behalf of my firm.
                </span>
              </label>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="muted-button"
                  style={{ minHeight: "44px", padding: "0 20px" }}
                  onClick={() => setAcceptanceModal({ open: false, reference: "", hasAcceptedTerms: false })}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-button"
                  style={{ minHeight: "44px", padding: "0 24px", opacity: acceptanceModal.hasAcceptedTerms ? 1 : 0.5 }}
                  disabled={!acceptanceModal.hasAcceptedTerms || isUpdatingCaseStatus}
                  onClick={() => void handleConfirmAcceptance()}
                >
                  {isUpdatingCaseStatus ? "Accepting…" : "Confirm Acceptance"}
                </button>
              </div>
            </div>
          </div>
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

              <button
                type="button"
                className={adminTab === "pipeline" ? "primary-button" : "muted-button"}
                onClick={() => void handleAdminTabChange("pipeline")}
              >
                Pipeline
              </button>

              <button
                type="button"
                className={adminTab === "referrers" ? "primary-button" : "muted-button"}
                onClick={() => void handleAdminTabChange("referrers")}
              >
                Referrers
              </button>

              <button
                type="button"
                className={adminTab === "invoices" ? "primary-button" : "muted-button"}
                onClick={() => void handleAdminTabChange("invoices")}
              >
                Invoices
              </button>

              <button
                type="button"
                className={adminTab === "audit" ? "primary-button" : "muted-button"}
                onClick={() => void handleAdminTabChange("audit")}
              >
                Audit Log
              </button>

              <button
                type="button"
                className={adminTab === "settings" ? "primary-button" : "muted-button"}
                onClick={() => void handleAdminTabChange("settings")}
              >
                Settings
              </button>
            </div>

            {adminTab === "quote" && (
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
            )}

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
                            {enquiry.reference && (
                              <button
                                type="button"
                                className="muted-button"
                                style={{ color: "#991b1b", borderColor: "#fca5a5", marginTop: "4px" }}
                                disabled={isDeletingQuote === enquiry.reference}
                                onClick={() => void handleDeleteQuote(enquiry.reference || "")}
                              >
                                {isDeletingQuote === enquiry.reference ? "Deleting…" : "Delete"}
                              </button>
                            )}
                            {deleteQuoteMessage?.ref === enquiry.reference && (
                              <div style={{ fontSize: "12px", marginTop: "4px",
                                color: deleteQuoteMessage.text.includes("deleted") ? "#065f46" : "#991b1b" }}>
                                {deleteQuoteMessage.text}
                              </div>
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
                          <label htmlFor="default_referral_fee">Default referral fee (£)</label>
                          <input
                            id="default_referral_fee"
                            type="number"
                            step="0.01"
                            min="0"
                            name="default_referral_fee"
                            value={firmEditor.default_referral_fee}
                            onChange={handleFirmEditorTextChange}
                            placeholder="e.g. 150.00 — auto-fills when assigning cases"
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

                        {firmEditor.id && (
                          <button
                            type="button"
                            className="muted-button"
                            style={{ color: firmEditor.suspended ? "#065f46" : "#991b1b", borderColor: firmEditor.suspended ? "#86efac" : "#fca5a5" }}
                            onClick={() => void handleToggleFirmSuspension()}
                          >
                            {firmEditor.suspended ? "Unsuspend Firm" : "Suspend Firm"}
                          </button>
                        )}

                        {firmEditor.id && (
                          <button
                            type="button"
                            className="muted-button"
                            onClick={() => { setShowFirmHistory(true); void handleLoadFirmHistory(firmEditor.id!); }}
                          >
                            View History
                          </button>
                        )}

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

            {/* ── Pipeline tab ── */}
            {adminTab === "pipeline" && (
              <div className="admin-stack" style={{ marginTop: "20px" }}>
                <SummaryCard title="Case Pipeline — All Active Matters">
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--navy)" }}>Filter by status:</span>
                    {["all", "accepted", "id_requested", "id_received", "searches_ordered", "searches_received", "enquiries_raised", "enquiries_replied", "exchanged", "completed", "on_hold", "withdrawn", "fallen_through"].map((s) => (
                      <button key={s} type="button"
                        className={pipelineFilter === s ? "primary-button" : "muted-button"}
                        style={{ minHeight: 32, padding: "0 12px", fontSize: "12px" }}
                        onClick={() => {
                          setPipelineFilter(s);
                          void (s === "all"
                            ? adminFetch("/api/list-enquiries?assigned=1").then((r) => r.json()).then((d) => { if (d.success) setPipeline(d.enquiries || []); })
                            : adminFetch(`/api/list-enquiries?assigned=1&status=${s}`).then((r) => r.json()).then((d) => { if (d.success) setPipeline(d.enquiries || []); })
                          );
                        }}>
                        {s === "all" ? "All" : s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </button>
                    ))}
                    <button type="button" className="muted-button" style={{ minHeight: 32, padding: "0 12px", fontSize: "12px" }}
                      onClick={() => void loadPipeline()}>↻ Refresh</button>
                  </div>

                  {isLoadingPipeline && <p className="form-note">Loading pipeline…</p>}

                  {!isLoadingPipeline && pipeline.length === 0 && (
                    <p className="form-note">No active cases found for this filter.</p>
                  )}

                  {!isLoadingPipeline && pipeline.length > 0 && (
                    <div className="detail-table">
                      {pipeline.map((c) => {
                        const eta = c.eta_date ? new Date(c.eta_date) : null;
                        const overdue = eta ? new Date() > eta : false;
                        const targetDate = c.target_completion_date ? new Date(c.target_completion_date) : null;
                        const daysToCompletion = targetDate ? Math.ceil((targetDate.getTime() - Date.now()) / 86400000) : null;
                        const completionUrgent = daysToCompletion !== null && daysToCompletion <= 5 && daysToCompletion >= 0;
                        const isFallenThrough = c.case_status === "fallen_through";
                        const isCompleted = c.case_status === "completed";
                        const statusBg = isCompleted ? "#d1fae5" : isFallenThrough ? "#fee2e2" : c.case_status === "withdrawn" ? "#fee2e2" : c.case_status === "exchanged" ? "#ede9fe" : "#dbeafe";
                        const statusCol = isCompleted ? "#065f46" : isFallenThrough ? "#991b1b" : c.case_status === "withdrawn" ? "#991b1b" : c.case_status === "exchanged" ? "#5b21b6" : "#1e40af";
                        return (
                          <div key={c.reference} className="detail-row">
                            <div className="detail-row__label">
                              <strong style={{ cursor: "pointer", color: "var(--teal-dark)" }}
                                onClick={() => void handleOpenDashboardEnquiry(c.reference)}>
                                {c.reference}
                              </strong>
                              {c.property_address && (
                                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--navy)" }}>{c.property_address}</div>
                              )}
                              <div style={{ fontSize: "12px" }}>{c.client_name || "—"}</div>
                              <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                                {String(c.transaction_type || "").replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}
                                {(c as Record<string, unknown>).price ? ` · £${Number((c as Record<string, unknown>).price).toLocaleString("en-GB")}` : ""}
                              </div>
                              {c.referrer_name && (
                                <div style={{ fontSize: "11px", color: "#7c3aed" }}>Via: {c.referrer_name}{c.negotiator_name ? ` · ${c.negotiator_name}` : ""}</div>
                              )}
                            </div>
                            <div className="detail-row__value">
                              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--navy)", marginBottom: "4px" }}>
                                {c.assigned_firm_name || "Unassigned"}
                              </div>
                              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                                <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 600, background: statusBg, color: statusCol }}>
                                  {c.case_status ? c.case_status.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()) : "Assigned"}
                                </span>
                                {/* Target completion date — urgent if ≤5 days */}
                                {targetDate && !isCompleted && (
                                  <span style={{ fontSize: "11px", fontWeight: completionUrgent ? 700 : 400, color: completionUrgent ? "#dc2626" : "#5b21b6", background: completionUrgent ? "#fee2e2" : "#ede9fe", padding: "2px 6px", borderRadius: "6px" }}>
                                    {completionUrgent ? "⚠ " : "🗓 "}Completing {targetDate.toLocaleDateString("en-GB")}
                                  </span>
                                )}
                                {/* ETA fallback when no target date set */}
                                {!targetDate && eta && (
                                  <span style={{ fontSize: "11px", color: overdue ? "#dc2626" : "var(--muted)", fontWeight: overdue ? 700 : 400 }}>
                                    {overdue ? "⚠ Overdue" : "Est."}: {eta.toLocaleDateString("en-GB")}
                                  </span>
                                )}
                                {isFallenThrough && c.fall_through_reason && (
                                  <span style={{ fontSize: "11px", color: "#991b1b" }}>{c.fall_through_reason}</span>
                                )}
                                {c.invoice_ref && (
                                  <span style={{ fontSize: "11px", color: "#065f46" }}>📄 {c.invoice_ref}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SummaryCard>

                {/* Pipeline stats */}
                {!isLoadingPipeline && pipeline.length > 0 && (
                  <SummaryCard title="Pipeline Summary">
                    <SummaryGrid rows={[
                      { label: "Total active cases", value: String(pipeline.length) },
                      { label: "Completed", value: String(pipeline.filter((c) => c.case_status === "completed").length) },
                      { label: "Fallen through", value: String(pipeline.filter((c) => c.case_status === "fallen_through").length) },
                      { label: "Due to complete (≤5 days)", value: String(pipeline.filter((c) => { const d = c.target_completion_date ? Math.ceil((new Date(c.target_completion_date).getTime() - Date.now()) / 86400000) : null; return d !== null && d >= 0 && d <= 5 && c.case_status !== "completed"; }).length) },
                      { label: "Overdue ETA", value: String(pipeline.filter((c) => c.eta_date && new Date() > new Date(c.eta_date) && c.case_status !== "completed").length) },
                      { label: "With invoice", value: String(pipeline.filter((c) => c.invoice_ref).length) },
                      { label: "From referrers", value: String(pipeline.filter((c) => c.referrer_id).length) },
                      { label: "Firms involved", value: String(new Set(pipeline.map((c) => c.assigned_firm_name).filter(Boolean)).size) },
                    ]} />
                  </SummaryCard>
                )}
              </div>
            )}

            {/* ── Referrers tab ── */}
            {adminTab === "referrers" && (
              <div style={{ display: "grid", gridTemplateColumns: "minmax(300px,1fr) minmax(380px,1.4fr)", gap: "20px", alignItems: "start", marginTop: "20px" }}>

                {/* Left: referrer list */}
                <div className="admin-stack">
                  <SummaryCard title="Referrer Accounts">
                    <div style={{ marginBottom: "12px" }}>
                      <button type="button" className="primary-button" style={{ minHeight: 40, padding: "0 16px", fontSize: "14px" }}
                        onClick={() => {
                          setReferrerEditor({ id: null, referrer_name: "", contact_email: "", contact_phone: "", referral_fee: "", portal_email: "", portal_active: false, notes: "", password: "" });
                          setReferrerSaveMessage("");
                        }}>
                        + Add Referrer
                      </button>
                    </div>
                    {isLoadingReferrers && <p className="form-note">Loading…</p>}
                    {!isLoadingReferrers && allReferrers.length === 0 && <p className="form-note">No referrers yet.</p>}
                    {!isLoadingReferrers && allReferrers.length > 0 && (
                      <div className="detail-table">
                        {allReferrers.map((r) => (
                          <div key={r.id} className="detail-row"
                            style={{ border: referrerEditor.id === r.id ? "2px solid var(--teal)" : undefined, borderRadius: "8px", padding: "6px" }}>
                            <div className="detail-row__label">
                              <strong>{r.referrer_name}</strong>
                              <div style={{ fontSize: "12px", color: "var(--muted)" }}>{r.contact_email}</div>
                              {Number(r.referral_fee) > 0 && (
                                <div style={{ fontSize: "12px", color: "#7c3aed" }}>Fee: £{Number(r.referral_fee).toFixed(2)}</div>
                              )}
                              <div style={{ fontSize: "11px", marginTop: "2px" }}>
                                <span style={{ background: Number(r.portal_active) === 1 ? "#d1fae5" : "#f3f4f6", color: Number(r.portal_active) === 1 ? "#065f46" : "#6b7280", padding: "1px 6px", borderRadius: "8px", fontSize: "11px" }}>
                                  {Number(r.portal_active) === 1 ? "Portal active" : "No portal access"}
                                </span>
                              </div>
                            </div>
                            <div className="detail-row__value">
                              <button type="button" className="muted-button" style={{ minHeight: 32, padding: "0 10px", fontSize: "12px" }}
                                onClick={() => {
                                  setReferrerEditor({
                                    id: r.id, referrer_name: r.referrer_name,
                                    contact_email: r.contact_email || "", contact_phone: r.contact_phone || "",
                                    referral_fee: String(r.referral_fee || ""), portal_email: r.portal_email || "",
                                    portal_active: Number(r.portal_active) === 1, notes: r.notes || "", password: "",
                                  });
                                  setReferrerSaveMessage("");
                                }}>Edit</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </SummaryCard>
                </div>

                {/* Right: referrer editor */}
                <div className="admin-stack">
                  <SummaryCard title={referrerEditor.id ? "Edit Referrer" : "Add Referrer"}>
                    <form onSubmit={(e) => void handleSaveReferrer(e)}>
                      <div className="form-grid">
                        <div className="field">
                          <label>Name / Company</label>
                          <input type="text" value={referrerEditor.referrer_name} required
                            onChange={(e) => setReferrerEditor((p) => ({ ...p, referrer_name: e.target.value }))}
                            placeholder="e.g. Smith Estate Agents" />
                        </div>
                        <div className="field">
                          <label>Contact email</label>
                          <input type="email" value={referrerEditor.contact_email}
                            onChange={(e) => setReferrerEditor((p) => ({ ...p, contact_email: e.target.value }))}
                            placeholder="agent@example.com" />
                        </div>
                        <div className="field">
                          <label>Contact phone</label>
                          <input type="text" value={referrerEditor.contact_phone}
                            onChange={(e) => setReferrerEditor((p) => ({ ...p, contact_phone: e.target.value }))} />
                        </div>
                        <div className="field">
                          <label>Referral fee (£)</label>
                          <input type="number" step="0.01" value={referrerEditor.referral_fee}
                            onChange={(e) => setReferrerEditor((p) => ({ ...p, referral_fee: e.target.value }))}
                            placeholder="e.g. 150.00" />
                        </div>
                        <div className="field">
                          <label>Portal login email</label>
                          <input type="email" value={referrerEditor.portal_email}
                            onChange={(e) => setReferrerEditor((p) => ({ ...p, portal_email: e.target.value }))}
                            placeholder="Login email for portal" />
                        </div>
                        <div className="field">
                          <label>Portal password{referrerEditor.id ? " (leave blank to keep)" : ""}</label>
                          <input type="password" value={referrerEditor.password}
                            onChange={(e) => setReferrerEditor((p) => ({ ...p, password: e.target.value }))}
                            placeholder="Min 8 characters" />
                        </div>
                        <div className="field field--full">
                          <CheckboxField
                            label="Portal access active"
                            checked={referrerEditor.portal_active}
                            onChange={(v) => setReferrerEditor((p) => ({ ...p, portal_active: v }))} />
                        </div>
                        <div className="field field--full">
                          <label>Notes</label>
                          <textarea value={referrerEditor.notes} rows={3}
                            onChange={(e) => setReferrerEditor((p) => ({ ...p, notes: e.target.value }))} />
                        </div>
                      </div>
                      {referrerSaveMessage && (
                        <p className="form-note" style={{ marginTop: "10px", color: referrerSaveMessage.includes("created") || referrerSaveMessage.includes("updated") ? "#065f46" : "#dc2626" }}>
                          {referrerSaveMessage}
                        </p>
                      )}
                      <div className="form-footer action-row" style={{ marginTop: "14px" }}>
                        <button type="button" className="muted-button" style={{ minHeight: 40, padding: "0 16px" }}
                          onClick={() => { setReferrerEditor({ id: null, referrer_name: "", contact_email: "", contact_phone: "", referral_fee: "", portal_email: "", portal_active: false, notes: "", password: "" }); setReferrerSaveMessage(""); }}>
                          Clear
                        </button>
                        <button type="submit" className="primary-button" style={{ minHeight: 40, padding: "0 20px" }} disabled={isSavingReferrer}>
                          {isSavingReferrer ? "Saving…" : referrerEditor.id ? "Update Referrer" : "Create Referrer"}
                        </button>
                      </div>
                    </form>
                  </SummaryCard>
                </div>
              </div>
            )}

            {/* ── Invoices tab ── */}
            {adminTab === "invoices" && (
              <div className="admin-stack" style={{ marginTop: "20px" }}>
                {selectedInvoice ? (
                  <SummaryCard title={`Invoice ${String(selectedInvoice.invoice_ref || "")}`}>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px", alignItems: "center" }}>
                      <button type="button" className="muted-button" style={{ minHeight: 36, padding: "0 14px", fontSize: "13px" }}
                        onClick={() => { setSelectedInvoice(null); setVoidInvoiceMessage(""); }}>
                        ← Back to list
                      </button>
                      <button type="button" className="primary-button" style={{ minHeight: 36, padding: "0 14px", fontSize: "13px" }}
                        onClick={() => window.print()}>
                        Print / Save PDF
                      </button>
                      <button
                        type="button"
                        className="muted-button"
                        style={{ minHeight: 36, padding: "0 14px", fontSize: "13px",
                          color: selectedInvoice.invoice_status === "paid" ? "#92400e" : "#065f46",
                          borderColor: selectedInvoice.invoice_status === "paid" ? "#fcd34d" : "#86efac" }}
                        disabled={isMarkingPaid === String(selectedInvoice.reference || "")}
                        onClick={() => void handleMarkInvoicePaid(String(selectedInvoice.reference || ""), String(selectedInvoice.invoice_status || "issued"))}
                      >
                        {isMarkingPaid === String(selectedInvoice.reference || "") ? "Saving…" : selectedInvoice.invoice_status === "paid" ? "Mark as Unpaid" : "Mark as Paid"}
                      </button>
                      <button
                        type="button"
                        className="muted-button"
                        style={{ minHeight: 36, padding: "0 14px", fontSize: "13px", color: "#991b1b", borderColor: "#fca5a5" }}
                        disabled={isVoidingInvoice}
                        onClick={() => void handleVoidInvoice(String(selectedInvoice.reference || ""))}
                      >
                        {isVoidingInvoice ? "Voiding…" : "Void Invoice"}
                      </button>
                      <span style={{
                        fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "12px",
                        background: selectedInvoice.invoice_status === "paid" ? "#d1fae5" : "#fef3c7",
                        color: selectedInvoice.invoice_status === "paid" ? "#065f46" : "#92400e",
                      }}>
                        {selectedInvoice.invoice_status === "paid" ? "Paid" : "Issued — awaiting payment"}
                      </span>
                    </div>
                    {voidInvoiceMessage && (
                      <p style={{ margin: "0 0 14px", fontSize: "13px", padding: "10px 14px", borderRadius: "8px",
                        background: voidInvoiceMessage.includes("successfully") ? "#d1fae5" : "#fee2e2",
                        color: voidInvoiceMessage.includes("successfully") ? "#065f46" : "#991b1b" }}>
                        {voidInvoiceMessage}
                      </p>
                    )}

                    {/* Invoice detail */}
                    <div style={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
                      <div style={{ background: "var(--navy)", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ color: "#fff", fontWeight: 700, fontSize: "18px" }}>TAX INVOICE</div>
                          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px" }}>ConveyQuote · Essentially Law Limited</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ color: "#fff", fontWeight: 700 }}>{String(selectedInvoice.invoice_ref || "")}</div>
                          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px" }}>{String(selectedInvoice.issued_at || "")}</div>
                        </div>
                      </div>
                      <div style={{ padding: "20px 24px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                          <div>
                            <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--muted)", marginBottom: "6px", letterSpacing: "0.08em" }}>From</div>
                            <div style={{ fontWeight: 700 }}>Essentially Law Limited</div>
                            <div style={{ fontSize: "13px", color: "var(--muted)" }}>ConveyQuote · Company No. 14625839</div>
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--muted)", marginBottom: "6px", letterSpacing: "0.08em" }}>To</div>
                            <div style={{ fontWeight: 700 }}>{String(selectedInvoice.firm_name || "")}</div>
                            <div style={{ fontSize: "13px", color: "var(--muted)" }}>Re: {String(selectedInvoice.reference || "")} · {String(selectedInvoice.client_name || "")}</div>
                          </div>
                        </div>

                        <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: "16px" }}>
                          <thead>
                            <tr style={{ background: "#f7f9fc" }}>
                              <th style={{ padding: "10px 12px", border: "1px solid var(--border)", textAlign: "left", fontSize: "13px" }}>Description</th>
                              <th style={{ padding: "10px 12px", border: "1px solid var(--border)", textAlign: "right", fontSize: "13px" }}>Net</th>
                              <th style={{ padding: "10px 12px", border: "1px solid var(--border)", textAlign: "right", fontSize: "13px" }}>VAT</th>
                              <th style={{ padding: "10px 12px", border: "1px solid var(--border)", textAlign: "right", fontSize: "13px" }}>Gross</th>
                            </tr>
                          </thead>
                          <tbody>
                            {((selectedInvoice.line_items as { label: string; net: number; vat: number; gross: number }[]) || []).map((item, i) => (
                              <tr key={i}>
                                <td style={{ padding: "9px 12px", border: "1px solid var(--border)", fontSize: "13px" }}>{item.label}</td>
                                <td style={{ padding: "9px 12px", border: "1px solid var(--border)", textAlign: "right", fontSize: "13px" }}>£{item.net.toFixed(2)}</td>
                                <td style={{ padding: "9px 12px", border: "1px solid var(--border)", textAlign: "right", fontSize: "13px" }}>£{item.vat.toFixed(2)}</td>
                                <td style={{ padding: "9px 12px", border: "1px solid var(--border)", textAlign: "right", fontSize: "13px" }}>£{item.gross.toFixed(2)}</td>
                              </tr>
                            ))}
                            <tr style={{ background: "var(--navy)", color: "#fff" }}>
                              <td style={{ padding: "11px 12px", fontWeight: 700, fontSize: "14px" }} colSpan={3}>Total Due</td>
                              <td style={{ padding: "11px 12px", textAlign: "right", fontWeight: 700, fontSize: "14px" }}>£{Number(selectedInvoice.total_gross || 0).toFixed(2)}</td>
                            </tr>
                          </tbody>
                        </table>

                        {selectedInvoice.bank_details && (
                          <div style={{ background: "#f7f9fc", border: "1px solid var(--border)", borderRadius: "8px", padding: "14px 18px" }}>
                            <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "6px" }}>Payment Details</div>
                            <pre style={{ margin: 0, fontFamily: "Arial, sans-serif", fontSize: "13px", whiteSpace: "pre-wrap", color: "var(--text)" }}>
                              {String(selectedInvoice.bank_details)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </SummaryCard>
                ) : (
                  <SummaryCard title="All Invoices">
                    <div style={{ display: "flex", gap: "10px", marginBottom: "14px", alignItems: "center" }}>
                      <button type="button" className="muted-button" style={{ minHeight: 36, padding: "0 14px", fontSize: "13px" }}
                        onClick={() => void loadAllInvoices()}>↻ Refresh</button>
                      <span style={{ fontSize: "13px", color: "var(--muted)" }}>
                        {allInvoices.length} invoice{allInvoices.length !== 1 ? "s" : ""} found
                      </span>
                    </div>

                    {isLoadingInvoices && <p className="form-note">Loading invoices…</p>}
                    {!isLoadingInvoices && allInvoices.length === 0 && (
                      <p className="form-note">No invoices generated yet. Invoices are created automatically when a firm marks a case as completed.</p>
                    )}
                    {!isLoadingInvoices && allInvoices.length > 0 && (
                      <div className="detail-table">
                        {allInvoices.map((inv) => {
                          const isVoided = !inv.invoice_ref && !!inv.voided_invoice_ref;
                          const displayRef = inv.invoice_ref || inv.voided_invoice_ref || "—";
                          let invoiceDetail: Record<string, unknown> | null = null;
                          try { invoiceDetail = JSON.parse((isVoided ? inv.voided_invoice_json : inv.invoice_json) || "{}"); } catch {}
                          return (
                            <div key={inv.reference} className="detail-row" style={{ opacity: isVoided ? 0.65 : 1 }}>
                              <div className="detail-row__label">
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <strong style={{ color: isVoided ? "var(--muted)" : "var(--teal-dark)", cursor: invoiceDetail && !isVoided ? "pointer" : "default" }}
                                    onClick={() => invoiceDetail && !isVoided && setSelectedInvoice(invoiceDetail)}>
                                    {displayRef}
                                  </strong>
                                  {isVoided && (
                                    <span style={{ fontSize: "11px", fontWeight: 600, padding: "1px 6px", borderRadius: "8px", background: "#fee2e2", color: "#991b1b" }}>
                                      Voided
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: "12px" }}>{inv.reference} · {inv.client_name || "—"}</div>
                                <div style={{ fontSize: "12px", color: "var(--muted)" }}>{inv.assigned_firm_name || "—"}</div>
                              </div>
                              <div className="detail-row__value">
                                {invoiceDetail && (
                                  <div style={{ fontWeight: 700, color: "var(--navy)", marginBottom: "4px" }}>
                                    £{Number((invoiceDetail as Record<string, unknown>).total_gross || 0).toFixed(2)}
                                  </div>
                                )}
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                                  {!isVoided && (
                                    <span style={{
                                      fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "12px",
                                      background: inv.invoice_status === "paid" ? "#d1fae5" : "#fef3c7",
                                      color: inv.invoice_status === "paid" ? "#065f46" : "#92400e",
                                    }}>
                                      {inv.invoice_status === "paid" ? "Paid" : "Issued"}
                                    </span>
                                  )}
                                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>{inv.created_at ? new Date(inv.created_at).toLocaleDateString("en-GB") : "—"}</div>
                                </div>
                                {invoiceDetail && (
                                  <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                                    {!isVoided && (
                                      <button type="button" className="muted-button" style={{ minHeight: 30, padding: "0 10px", fontSize: "12px" }}
                                        onClick={() => { setSelectedInvoice({ ...invoiceDetail, reference: inv.reference, invoice_status: inv.invoice_status }); setVoidInvoiceMessage(""); }}>
                                        View
                                      </button>
                                    )}
                                    {!isVoided && (
                                      <button
                                        type="button"
                                        className="muted-button"
                                        style={{ minHeight: 30, padding: "0 10px", fontSize: "12px",
                                          color: inv.invoice_status === "paid" ? "#92400e" : "#065f46",
                                          borderColor: inv.invoice_status === "paid" ? "#fcd34d" : "#86efac" }}
                                        disabled={isMarkingPaid === inv.reference}
                                        onClick={() => void handleMarkInvoicePaid(inv.reference, inv.invoice_status || "issued")}
                                      >
                                        {isMarkingPaid === inv.reference ? "Saving…" : inv.invoice_status === "paid" ? "Mark Unpaid" : "Mark Paid"}
                                      </button>
                                    )}
                                    {!isVoided && (
                                      <button
                                        type="button"
                                        className="muted-button"
                                        style={{ minHeight: 30, padding: "0 10px", fontSize: "12px", color: "#991b1b", borderColor: "#fca5a5" }}
                                        disabled={isVoidingInvoice}
                                        onClick={() => void handleVoidInvoice(inv.reference)}
                                      >
                                        Void
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Invoice totals summary */}
                    {allInvoices.length > 0 && (() => {
                      let totalGross = 0;
                      let totalPaid = 0;
                      allInvoices.forEach((inv) => {
                        if (!inv.invoice_ref) return; // skip voided
                        try {
                          const gross = Number(JSON.parse(inv.invoice_json || "{}").total_gross || 0);
                          totalGross += gross;
                          if (inv.invoice_status === "paid") totalPaid += gross;
                        } catch {}
                      });
                      const totalOutstanding = totalGross - totalPaid;
                      return (
                        <div style={{ marginTop: "16px", padding: "14px 16px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #86efac", display: "flex", gap: "24px", flexWrap: "wrap" }}>
                          <div><div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "2px" }}>Total invoiced</div><strong style={{ color: "#065f46" }}>£{totalGross.toFixed(2)}</strong></div>
                          <div><div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "2px" }}>Paid</div><strong style={{ color: "#065f46" }}>£{totalPaid.toFixed(2)}</strong></div>
                          <div><div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "2px" }}>Outstanding</div><strong style={{ color: totalOutstanding > 0 ? "#92400e" : "#065f46" }}>£{totalOutstanding.toFixed(2)}</strong></div>
                        </div>
                      );
                    })()}
                  </SummaryCard>
                )}
              </div>
            )}

            {/* ── Audit Log tab ── */}
            {adminTab === "audit" && (
              <div className="admin-stack" style={{ marginTop: "20px" }}>
                <SummaryCard title="Audit Log">
                  <div style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div style={{ flex: 1, minWidth: "200px" }}>
                      <label style={{ fontSize: "13px", display: "block", marginBottom: "4px" }}>Filter by reference</label>
                      <input
                        type="text"
                        value={auditFilter}
                        onChange={(e) => setAuditFilter(e.target.value)}
                        placeholder="e.g. CQ-20260414-4762"
                        onKeyDown={(e) => { if (e.key === "Enter") void handleLoadAuditLog(auditFilter || undefined); }}
                      />
                    </div>
                    <button type="button" className="primary-button" style={{ minHeight: 40 }}
                      onClick={() => void handleLoadAuditLog(auditFilter || undefined)}
                      disabled={isLoadingAudit}>
                      {isLoadingAudit ? "Loading…" : "Search"}
                    </button>
                    <button type="button" className="muted-button" style={{ minHeight: 40 }}
                      onClick={() => { setAuditFilter(""); void handleLoadAuditLog(); }}>
                      Show All
                    </button>
                  </div>

                  {isLoadingAudit && <p className="form-note">Loading audit log…</p>}
                  {!isLoadingAudit && auditLog.length === 0 && (
                    <p className="form-note">No audit entries found. Actions such as assigning firms, generating invoices and changing case status are recorded here automatically.</p>
                  )}
                  {!isLoadingAudit && auditLog.length > 0 && (
                    <div className="detail-table">
                      {auditLog.map((entry) => (
                        <div key={entry.id} className="detail-row" style={{ borderLeft: "3px solid",
                          borderLeftColor:
                            entry.action.includes("deleted") || entry.action.includes("voided") ? "#fca5a5" :
                            entry.action.includes("paid") ? "#86efac" :
                            entry.action.includes("assigned") ? "#93c5fd" : "var(--border)" }}>
                          <div className="detail-row__label">
                            <strong style={{ fontSize: "13px", textTransform: "capitalize" }}>
                              {entry.action.replace(/_/g, " ")}
                            </strong>
                            {entry.reference && (
                              <div style={{ fontSize: "12px", color: "var(--teal-dark)", cursor: "pointer" }}
                                onClick={() => void handleOpenDashboardEnquiry(entry.reference || "")}>
                                {entry.reference}
                              </div>
                            )}
                            {entry.firm_name && (
                              <div style={{ fontSize: "12px", color: "var(--muted)" }}>{entry.firm_name}</div>
                            )}
                          </div>
                          <div className="detail-row__value">
                            <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "2px" }}>
                              {new Date(entry.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                            </div>
                            <div style={{ fontSize: "11px" }}>
                              <span style={{ background: "#f3f4f6", padding: "1px 6px", borderRadius: "4px", marginRight: "6px" }}>{entry.actor}</span>
                              {entry.details || ""}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SummaryCard>
              </div>
            )}

            {/* ── Firm History overlay ── */}
            {showFirmHistory && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
                <div style={{ background: "var(--bg)", borderRadius: "12px", width: "100%", maxWidth: "760px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", padding: "28px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h3 style={{ margin: 0, color: "var(--navy)" }}>Firm History — {firmEditor.firm_name}</h3>
                    <button type="button" className="muted-button" onClick={() => setShowFirmHistory(false)}>Close</button>
                  </div>

                  {isLoadingFirmHistory && <p className="form-note">Loading firm history…</p>}

                  {firmHistory && (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
                        {[
                          { label: "Total referrals", value: String(firmHistory.summary.totalReferrals) },
                          { label: "Total invoiced", value: `£${firmHistory.summary.totalInvoiced.toFixed(2)}` },
                          { label: "Total paid", value: `£${firmHistory.summary.totalPaid.toFixed(2)}` },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ padding: "14px 16px", background: "#f7f9fc", borderRadius: "8px", border: "1px solid var(--border)" }}>
                            <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "4px" }}>{label}</div>
                            <div style={{ fontWeight: 700, fontSize: "18px", color: "var(--navy)" }}>{value}</div>
                          </div>
                        ))}
                      </div>

                      {firmHistory.enquiries.length === 0 ? (
                        <p className="form-note">No referrals found for this firm.</p>
                      ) : (
                        <div className="detail-table">
                          {firmHistory.enquiries.map((enq) => {
                            let gross = 0;
                            try { gross = Number(JSON.parse(enq.invoice_json || "{}").total_gross || 0); } catch {}
                            return (
                              <div key={enq.reference} className="detail-row">
                                <div className="detail-row__label">
                                  <strong style={{ color: "var(--teal-dark)", cursor: "pointer" }}
                                    onClick={() => { setShowFirmHistory(false); void handleOpenDashboardEnquiry(enq.reference); }}>
                                    {enq.reference}
                                  </strong>
                                  <div style={{ fontSize: "12px" }}>{enq.client_name || "—"} · {enq.transaction_type || "—"}</div>
                                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                                    Referred: {enq.referred_at ? new Date(enq.referred_at).toLocaleDateString("en-GB") : "—"}
                                  </div>
                                </div>
                                <div className="detail-row__value">
                                  <span style={{
                                    padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 600, display: "inline-block", marginBottom: "4px",
                                    background: enq.case_status === "completed" ? "#d1fae5" : "#f3f4f6",
                                    color: enq.case_status === "completed" ? "#065f46" : "#374151",
                                  }}>{enq.case_status || "pending"}</span>
                                  {enq.invoice_ref ? (
                                    <div style={{ fontSize: "12px" }}>
                                      <div style={{ marginBottom: "2px" }}>{enq.invoice_ref} · £{gross.toFixed(2)}</div>
                                      <span style={{
                                        fontSize: "11px", fontWeight: 600, padding: "1px 6px", borderRadius: "8px",
                                        background: enq.invoice_status === "paid" ? "#d1fae5" : "#fef3c7",
                                        color: enq.invoice_status === "paid" ? "#065f46" : "#92400e",
                                      }}>{enq.invoice_status === "paid" ? "Paid" : "Issued"}</span>
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>No invoice</div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}


            {adminTab === "settings" && (
              <div className="admin-stack" style={{ marginTop: "20px" }}>
                <SummaryCard title="Bank Details">
                  <p className="form-note" style={{ marginTop: 0, marginBottom: "14px" }}>
                    These details appear on all invoices sent to panel firms. Include your account name, sort code, and account number.
                  </p>
                  <div className="form-grid">
                    <div className="field field--full">
                      <label htmlFor="bankDetails">Bank details</label>
                      <textarea
                        id="bankDetails"
                        rows={5}
                        defaultValue={adminSettings["bank_details"] || ""}
                        onBlur={(e) => setAdminSettings((prev) => ({ ...prev, bank_details: e.target.value }))}
                        placeholder={"Account name: Essentially Law Limited\nBank: [Bank name]\nSort code: XX-XX-XX\nAccount number: XXXXXXXX\nReference: [Invoice reference]"}
                      />
                    </div>
                  </div>
                  {adminSettingsMessage && (
                    <p className="form-note" style={{ color: adminSettingsMessage === "Saved." ? "#065f46" : "#dc2626", marginTop: "10px" }}>
                      {adminSettingsMessage}
                    </p>
                  )}
                  <div className="form-footer action-row" style={{ marginTop: "14px" }}>
                    <button
                      type="button"
                      className="primary-button"
                      disabled={isSavingSettings}
                      onClick={() => void handleSaveAdminSetting("bank_details", adminSettings["bank_details"] || "")}
                    >
                      {isSavingSettings ? "Saving…" : "Save Bank Details"}
                    </button>
                  </div>
                </SummaryCard>

                <SummaryCard title="Admin Users">
                  <p className="form-note" style={{ marginTop: 0, marginBottom: "14px" }}>
                    To change the admin password, use the form below. You will need to log back in afterwards.
                  </p>
                  <AdminPasswordForm adminFetch={adminFetch} />
                </SummaryCard>

                <SummaryCard title="Firm Portal Credentials">
                  <p className="form-note" style={{ marginTop: 0, marginBottom: "14px" }}>
                    All panel firms with portal access are listed below. Use the Firms tab to set or update credentials.
                  </p>
                  <div className="detail-table">
                    {dashboardFirms.filter((f) => f.portal_email).length === 0 ? (
                      <p className="form-note">No firms have portal access set up yet.</p>
                    ) : (
                      dashboardFirms.filter((f) => f.portal_email).map((f) => (
                        <div key={f.id} className="detail-row">
                          <div className="detail-row__label">
                            <strong>{f.firm_name}</strong>
                            <div style={{ fontSize: "12px", color: "#6b7280" }}>{f.portal_email}</div>
                          </div>
                          <div className="detail-row__value">
                            <div style={{
                              display: "inline-block", padding: "2px 8px", borderRadius: "10px",
                              fontSize: "12px", fontWeight: 600,
                              background: Number(f.portal_active) === 1 ? "#d1fae5" : "#f3f4f6",
                              color: Number(f.portal_active) === 1 ? "#065f46" : "#6b7280",
                            }}>
                              {Number(f.portal_active) === 1 ? "Active" : "Inactive"}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </SummaryCard>
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
                                .filter((f) => Number(f.active) === 1 && Number(f.suspended) !== 1)
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

      {/* ── Referrer Login ── */}
      {isReferrerLoginPage && !referrerSession && (
        <div className="public-page" style={{ maxWidth: 460 }}>
          <div className="card">
            <h2 style={{ color: "var(--navy)", margin: "0 0 6px" }}>Referrer Portal Login</h2>
            <p style={{ color: "var(--muted)", marginBottom: "20px" }}>Log in to submit client enquiries and track your referrals.</p>
            <form className="quote-form" onSubmit={(e) => {
              e.preventDefault();
              setReferrerLoginError?.("");
              setIsReferrerLoggingIn?.(true);
              fetch("/api/referrer-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: referrerEmail, password: referrerPassword }),
              }).then((r) => r.json()).then((result) => {
                if (result.success) {
                  setReferrerToken?.(result.token);
                  setReferrerSession?.({ referrer_id: result.referrer_id, referrer_name: result.referrer_name });
                  setReferrerPassword?.("");
                  window.history.pushState({}, "", "/referrer-portal/");
                  fetch("/api/referrer-portal-data", { headers: { Authorization: `Bearer ${result.token}` } })
                    .then((r) => r.json()).then((d) => { if (d.success) setReferrerPortalData?.(d); });
                } else {
                  setReferrerLoginError?.(result.error || "Login failed.");
                }
              }).catch(() => setReferrerLoginError?.("Something went wrong."))
                .finally(() => setIsReferrerLoggingIn?.(false));
            }}>
              <div className="form-grid">
                <div className="field field--full">
                  <label htmlFor="refEmail">Email address</label>
                  <input id="refEmail" type="email" value={referrerEmail ?? ""} onChange={(e) => setReferrerEmail?.(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
                </div>
                <div className="field field--full">
                  <label htmlFor="refPw">Password</label>
                  <input id="refPw" type="password" value={referrerPassword ?? ""} onChange={(e) => setReferrerPassword?.(e.target.value)} placeholder="Your password" required autoComplete="current-password" />
                </div>
              </div>
              {referrerLoginError && <p className="form-note" style={{ color: "#dc2626" }}>{referrerLoginError}</p>}
              <div className="form-footer">
                <p className="form-note">Access provided by ConveyQuote. Contact <a href="mailto:info@conveyquote.uk">info@conveyquote.uk</a> for help.</p>
                <button type="submit" className="primary-button" disabled={isReferrerLoggingIn}>{isReferrerLoggingIn ? "Logging in…" : "Log In"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Referrer Portal ── */}
      {(isReferrerPortalPage || (isReferrerLoginPage && referrerSession)) && referrerSession && (() => {
        const enquiries = referrerPortalData?.enquiries || [];
        const referrer = referrerPortalData?.referrer;
        const thisMonth = new Date().toISOString().slice(0, 7);
        const sentThisMonth = enquiries.filter((e) => String(e.created_at || "").startsWith(thisMonth)).length;
        const active = enquiries.filter((e) => e.assigned_firm_name && e.case_status !== "completed" && e.case_status !== "withdrawn" && e.case_status !== "fallen_through").length;
        const completed = enquiries.filter((e) => e.case_status === "completed").length;
        const feesEarned = enquiries.filter((e) => e.case_status === "completed" && Number(e.referral_fee_payable) === 1).reduce((s, e) => s + Number(e.referral_fee_amount || 0), 0);
        const dueToComplete = enquiries.filter((e) => {
          if (!e.target_completion_date) return false;
          const d = new Date(String(e.target_completion_date));
          const diff = (d.getTime() - Date.now()) / 86400000;
          return diff >= 0 && diff <= 14 && e.case_status !== "completed";
        });

        const HUMAN_STATUS: Record<string, string> = {
          accepted: "Instructed ✓",
          client_care_sent: "Client care letter sent ✓",
          id_requested: "ID requested from client ✓",
          id_received: "ID received & verified ✓",
          searches_ordered: "Searches ordered ✓",
          searches_received: "Searches back ✓",
          enquiries_raised: "Enquiries raised ✓",
          enquiries_replied: "Enquiries answered ✓",
          report_on_title: "Report on title sent ✓",
          exchange_ready: "Ready to exchange ✓",
          exchanged: "Exchanged ✓",
          completion_ready: "Ready to complete ✓",
          completed: "Completed 🎉",
          on_hold: "On hold ⏸",
          withdrawn: "Withdrawn",
          fallen_through: "Fallen through ✗",
        };

        const statusColour = (s: unknown) => {
          const str = String(s || "");
          if (str === "completed") return { bg: "#d1fae5", col: "#065f46" };
          if (str === "fallen_through" || str === "withdrawn") return { bg: "#fee2e2", col: "#991b1b" };
          if (str === "on_hold") return { bg: "#fef3c7", col: "#92400e" };
          if (str === "exchanged") return { bg: "#ede9fe", col: "#5b21b6" };
          if (str) return { bg: "#dbeafe", col: "#1e40af" };
          return { bg: "#f3f4f6", col: "#6b7280" };
        };

        const refreshPortal = () => {
          fetch("/api/referrer-portal-data", { headers: { Authorization: `Bearer ${referrerToken}` } })
            .then((r) => r.json()).then((d: unknown) => { if ((d as { success: boolean }).success) setReferrerPortalData?.(d as { referrer: { id: number; referrer_name: string; contact_email: string; referral_fee: number }; enquiries: Record<string, unknown>[] }); });
        };

        const TABS = [
          { id: "dashboard" as const, label: "Dashboard" },
          { id: "my_referrals" as const, label: `My Referrals${enquiries.length ? ` (${enquiries.length})` : ""}` },
          { id: "new_referral" as const, label: "+ New Referral" },
          { id: "payments" as const, label: "Payments" },
        ];

        return (
          <div className="public-page" style={{ maxWidth: 1000 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h2 style={{ color: "var(--navy)", margin: 0 }}>{referrerSession.referrer_name}</h2>
                <p style={{ color: "var(--muted)", margin: "2px 0 0", fontSize: "14px" }}>Referrer Portal</p>
              </div>
              <button type="button" className="muted-button" style={{ minHeight: 38, padding: "0 16px" }}
                onClick={() => {
                  fetch("/api/referrer-logout", { method: "POST", headers: { Authorization: `Bearer ${referrerToken}` } }).catch(() => {});
                  setReferrerToken?.(""); setReferrerSession?.(null); setReferrerPortalData?.(null);
                  window.history.pushState({}, "", "/referrer-login/");
                }}>Log out</button>
            </div>

            {/* Urgent alert: cases due to complete within 14 days */}
            {dueToComplete.length > 0 && (
              <div style={{ background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "18px" }}>🗓️</span>
                <div>
                  <strong style={{ color: "#92400e" }}>Completing soon</strong>
                  {dueToComplete.map((e) => (
                    <div key={String(e.reference)} style={{ fontSize: "13px", color: "#78350f", marginTop: "2px" }}>
                      {String(e.property_address || e.reference)} — {new Date(String(e.target_completion_date)).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px", borderBottom: "2px solid var(--border)", paddingBottom: "0" }}>
              {TABS.map((tab) => (
                <button key={tab.id} type="button"
                  style={{ minHeight: 40, padding: "0 18px", fontSize: "14px", fontWeight: 600, border: "none", background: "none", cursor: "pointer", color: referrerPortalTab === tab.id ? "var(--teal)" : "var(--muted)", borderBottom: referrerPortalTab === tab.id ? "2px solid var(--teal)" : "2px solid transparent", marginBottom: "-2px", transition: "color 0.15s" }}
                  onClick={() => { setReferrerPortalTab?.(tab.id); if (tab.id !== "new_referral") refreshPortal(); }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── DASHBOARD ── */}
            {referrerPortalTab === "dashboard" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "28px" }}>
                  {[
                    { label: "Sent this month", value: sentThisMonth, icon: "📤" },
                    { label: "Active cases", value: active, icon: "⚡" },
                    { label: "Completed", value: completed, icon: "✅" },
                    { label: "Fees earned", value: `£${feesEarned.toFixed(2)}`, icon: "💷" },
                  ].map((stat) => (
                    <div key={stat.label} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px 20px" }}>
                      <div style={{ fontSize: "22px", marginBottom: "6px" }}>{stat.icon}</div>
                      <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--navy)" }}>{stat.value}</div>
                      <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "2px" }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {enquiries.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", border: "2px dashed var(--border)", borderRadius: "12px" }}>
                    <div style={{ fontSize: "36px", marginBottom: "12px" }}>🏡</div>
                    <h3 style={{ color: "var(--navy)", margin: "0 0 8px" }}>No referrals yet</h3>
                    <p style={{ color: "var(--muted)", margin: "0 0 16px" }}>Submit your first client referral to get started.</p>
                    <button type="button" className="primary-button" onClick={() => setReferrerPortalTab?.("new_referral")}>Submit First Referral</button>
                  </div>
                ) : (
                  <>
                    <h4 style={{ color: "var(--navy)", margin: "0 0 12px" }}>Recent referrals</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {enquiries.slice(0, 5).map((enq) => {
                        const sc = statusColour(enq.case_status);
                        return (
                          <div key={String(enq.reference)} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                            <div>
                              <div style={{ fontWeight: 600, color: "var(--navy)", fontSize: "15px" }}>{String(enq.property_address || enq.reference)}</div>
                              <div style={{ fontSize: "13px", color: "var(--muted)" }}>{String(enq.client_name || enq.client_email || "")} · {String(enq.transaction_type || "").replace(/_/g, " ")}</div>
                              {enq.negotiator_name && <div style={{ fontSize: "12px", color: "var(--muted)" }}>via {String(enq.negotiator_name)}</div>}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              {enq.target_completion_date && enq.case_status === "exchanged" && (
                                <div style={{ fontSize: "12px", color: "#5b21b6", fontWeight: 600 }}>
                                  Completing {new Date(String(enq.target_completion_date)).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                </div>
                              )}
                              <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, background: sc.bg, color: sc.col }}>
                                {HUMAN_STATUS[String(enq.case_status || "")] || (enq.assigned_firm_name ? "Instructed" : "Pending assignment")}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {enquiries.length > 5 && (
                      <button type="button" style={{ marginTop: "12px", background: "none", border: "none", color: "var(--teal)", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}
                        onClick={() => setReferrerPortalTab?.("my_referrals")}>View all {enquiries.length} referrals →</button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── MY REFERRALS ── */}
            {referrerPortalTab === "my_referrals" && (
              <div>
                {!referrerPortalData && <p className="form-note">Loading…</p>}
                {referrerPortalData && enquiries.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px" }}>
                    <p className="form-note">No referrals yet.</p>
                    <button type="button" className="primary-button" onClick={() => setReferrerPortalTab?.("new_referral")}>Submit Your First Referral</button>
                  </div>
                )}
                {referrerPortalData && enquiries.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {enquiries.map((enq) => {
                      const sc = statusColour(enq.case_status);
                      const isActive = enq.assigned_firm_name && enq.case_status !== "completed" && enq.case_status !== "withdrawn" && enq.case_status !== "fallen_through";
                      const MILESTONES = ["id_received", "searches_received", "exchanged", "completed"];
                      const currentIdx = MILESTONES.indexOf(String(enq.case_status || ""));
                      return (
                        <div key={String(enq.reference)} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px 20px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: "16px", color: "var(--navy)" }}>{String(enq.property_address || enq.reference)}</div>
                              <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "2px" }}>
                                {String(enq.client_name || enq.client_email || "")}
                                {enq.price ? ` · £${Number(enq.price).toLocaleString("en-GB")}` : ""}
                                {enq.transaction_type ? ` · ${String(enq.transaction_type).replace(/_/g, " ")}` : ""}
                              </div>
                              {enq.negotiator_name && <div style={{ fontSize: "12px", color: "var(--muted)" }}>Referred by: {String(enq.negotiator_name)}</div>}
                              {enq.assigned_firm_name && <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>Solicitor: {String(enq.assigned_firm_name)}</div>}
                            </div>
                            <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: "12px", fontSize: "13px", fontWeight: 600, background: sc.bg, color: sc.col, whiteSpace: "nowrap" }}>
                              {HUMAN_STATUS[String(enq.case_status || "")] || (enq.assigned_firm_name ? "Instructed" : "Pending")}
                            </span>
                          </div>

                          {/* Milestone progress bar */}
                          {enq.assigned_firm_name && enq.case_status !== "fallen_through" && enq.case_status !== "withdrawn" && (
                            <div style={{ display: "flex", gap: "0", marginBottom: "12px" }}>
                              {MILESTONES.map((m, i) => {
                                const done = currentIdx >= i;
                                const isLast = i === MILESTONES.length - 1;
                                const labels: Record<string, string> = { id_received: "ID ✓", searches_received: "Searches ✓", exchanged: "Exchanged", completed: "Completed" };
                                return (
                                  <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                    <div style={{ width: "100%", display: "flex", alignItems: "center" }}>
                                      {i > 0 && <div style={{ flex: 1, height: "3px", background: done ? "var(--teal)" : "#e5e7eb" }} />}
                                      <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: done ? "var(--teal)" : "#e5e7eb", border: `2px solid ${done ? "var(--teal)" : "#d1d5db"}`, flexShrink: 0 }} />
                                      {!isLast && <div style={{ flex: 1, height: "3px", background: currentIdx > i ? "var(--teal)" : "#e5e7eb" }} />}
                                    </div>
                                    <div style={{ fontSize: "11px", color: done ? "var(--teal)" : "#9ca3af", fontWeight: done ? 600 : 400, textAlign: "center" }}>{labels[m]}</div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {enq.case_status === "fallen_through" && enq.fall_through_reason && (
                            <div style={{ background: "#fee2e2", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "#991b1b", marginBottom: "8px" }}>
                              Reason: {String(enq.fall_through_reason)}
                            </div>
                          )}

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                            <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                              {enq.target_completion_date && enq.case_status !== "completed"
                                ? <span style={{ color: "#5b21b6", fontWeight: 600 }}>🗓 Completion: {new Date(String(enq.target_completion_date)).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                                : enq.eta_date && enq.case_status !== "completed"
                                  ? `Est. completion: ${new Date(String(enq.eta_date)).toLocaleDateString("en-GB")}`
                                  : null
                              }
                            </div>
                            {isActive && (
                              <button type="button" className="muted-button" style={{ minHeight: 32, padding: "0 12px", fontSize: "12px" }}
                                onClick={() => {
                                  fetch("/api/referrer-request-update", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${referrerToken}` },
                                    body: JSON.stringify({ reference: enq.reference }),
                                  }).then((r) => r.json()).then((res: unknown) => alert((res as { success: boolean; error?: string }).success ? "Update requested — the firm has been notified." : (res as { error?: string }).error || "Failed."));
                                }}>Request update</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── NEW REFERRAL ── */}
            {referrerPortalTab === "new_referral" && (
              <ReferrerSimpleForm
                referrerToken={referrerToken ?? ""}
                onSuccess={() => { setReferrerPortalTab?.("my_referrals"); refreshPortal(); }}
              />
            )}

            {/* ── PAYMENTS ── */}
            {referrerPortalTab === "payments" && (
              <div>
                {referrer && referrer.referral_fee > 0 && (
                  <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
                    <strong style={{ color: "#15803d" }}>Your referral fee: £{Number(referrer.referral_fee).toFixed(2)} per completed matter</strong>
                  </div>
                )}
                {enquiries.filter((e) => e.referral_fee_payable).length === 0 ? (
                  <p className="form-note">No fee-bearing referrals yet. Fees appear here once matters complete.</p>
                ) : (
                  <>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                        <thead>
                          <tr style={{ background: "var(--navy)", color: "#fff" }}>
                            {["Property", "Client", "Status", "Fee", "Payment"].map((h) => (
                              <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {enquiries.filter((e) => e.referral_fee_payable).map((enq, i) => {
                            const isPaid = enq.case_status === "completed";
                            return (
                              <tr key={String(enq.reference)} style={{ background: i % 2 === 0 ? "#f9fafb" : "#fff", borderBottom: "1px solid var(--border)" }}>
                                <td style={{ padding: "10px 14px", fontWeight: 600 }}>{String(enq.property_address || enq.reference)}</td>
                                <td style={{ padding: "10px 14px", color: "var(--muted)" }}>{String(enq.client_name || enq.client_email || "—")}</td>
                                <td style={{ padding: "10px 14px" }}>{HUMAN_STATUS[String(enq.case_status || "")] || "In progress"}</td>
                                <td style={{ padding: "10px 14px", fontWeight: 600 }}>£{Number(enq.referral_fee_amount || 0).toFixed(2)}</td>
                                <td style={{ padding: "10px 14px" }}>
                                  <span style={{ padding: "2px 8px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, background: isPaid ? "#d1fae5" : "#fef3c7", color: isPaid ? "#065f46" : "#92400e" }}>
                                    {isPaid ? "Completed — fee due" : "Pending completion"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: "#f0f4ff", fontWeight: 700 }}>
                            <td colSpan={3} style={{ padding: "10px 14px" }}>Total fees on completed matters</td>
                            <td colSpan={2} style={{ padding: "10px 14px", color: "var(--navy)" }}>
                              £{enquiries.filter((e) => e.case_status === "completed" && e.referral_fee_payable).reduce((s, e) => s + Number(e.referral_fee_amount || 0), 0).toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "12px" }}>Fees are due on completion. Contact <a href="mailto:info@conveyquote.uk">info@conveyquote.uk</a> with any payment queries.</p>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── About Us ── */}
      {isAboutPage && (
        <div className="public-page">
          <h1>About ConveyQuote</h1>
          <div className="disclaimer-box">
            ConveyQuote is a trading name of <strong>Essentially Law Limited</strong> (Company No. 14625839), registered in England and Wales. We are not a firm of solicitors and do not provide legal advice. We operate an introduction service connecting clients with SRA-regulated conveyancing firms.
          </div>
          <h2>What we do</h2>
          <p>ConveyQuote is an online platform that generates indicative conveyancing quotes and introduces users to independent, SRA-regulated law firms. We do not carry out legal work ourselves.</p>
          <p>Our service is designed to make the process of finding a conveyancer clearer, faster and more transparent. You enter your property details once, receive a fully itemised quote, and — if you choose to proceed — we introduce you to a firm suited to your transaction.</p>
          <h2>Our service</h2>
          <ul>
            <li>Providing indicative conveyancing quotes based on the information you supply</li>
            <li>Introducing users to independent SRA-regulated law firms</li>
            <li>Facilitating communication between clients and those firms</li>
          </ul>
          <p>Any legal services are provided solely by the law firm you choose to instruct. ConveyQuote does not act as your solicitor and no solicitor-client relationship arises from use of this platform.</p>
          <h2>Referral fees</h2>
          <p>We may receive a referral fee from a law firm where you proceed to instruct them following an introduction made through our platform. This fee is paid by the firm and does not increase the amount you pay for legal services.</p>
          <h2>Regulated firms</h2>
          <p>All law firms introduced through ConveyQuote are regulated by the Solicitors Regulation Authority (SRA). You can verify any firm's regulatory status at <a href="https://www.sra.org.uk" target="_blank" rel="noopener noreferrer">sra.org.uk</a>.</p>
          <h2>Data &amp; privacy</h2>
          <p>Essentially Law Limited is registered with the Information Commissioner's Office (ICO). Registration number: <strong>CSN9542473</strong>. Our full privacy policy is available <a href="/privacy/">here</a>.</p>
          <h2>Contact us</h2>
          <p>Email: <a href="mailto:info@conveyquote.uk">info@conveyquote.uk</a></p>
        </div>
      )}

      {/* ── SDLT Calculator ── */}
      {isSdltPage && <StandaloneSdltCalculator />}

      {/* ── Conveyancing Fees Article ── */}
      {isFeesPage && (
        <div className="public-page">
          <h1>Understanding Conveyancing Fees: A Complete Guide</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Last updated: April 2026 · England &amp; Wales</p>
          <div className="disclaimer-box">
            ConveyQuote is an introduction service. This article is for information only and does not constitute legal advice. Always obtain a written quote from your chosen firm before proceeding.
          </div>
          <h2>What are conveyancing fees?</h2>
          <p>Conveyancing fees are the costs charged by a solicitor or licensed conveyancer to handle the legal work involved in buying, selling, remortgaging or transferring ownership of a property. They are made up of two distinct parts: the firm's legal fees and disbursements.</p>
          <h2>Legal fees</h2>
          <p>Legal fees are the solicitor's charge for carrying out the work. For a straightforward residential purchase in England and Wales, you can typically expect to pay between £900 and £1,500 plus VAT. Several factors affect the price:</p>
          <ul>
            <li><strong>Transaction type</strong> — purchases are generally more complex and cost more than remortgages</li>
            <li><strong>Property tenure</strong> — leasehold properties require additional work and carry a supplement of around £200–£350</li>
            <li><strong>New build properties</strong> — carry an additional fee of £150–£300 due to the extra work involved</li>
            <li><strong>Property value</strong> — some firms charge on a sliding scale based on purchase price</li>
            <li><strong>Shared ownership, Help to Buy or company buyers</strong> — each adds complexity and cost</li>
          </ul>
          <h2>Disbursements</h2>
          <p>Disbursements are third-party costs paid by your solicitor on your behalf. Common disbursements on a purchase include:</p>
          <ul>
            <li><strong>Search pack</strong> — typically £200–£400, covers local authority, drainage, environmental and chancel searches</li>
            <li><strong>Land Registry registration fee</strong> — set by HMLR on a sliding scale based on property value (£20–£910)</li>
            <li><strong>Electronic money transfer fee</strong> — usually £20–£45 to transfer completion funds</li>
            <li><strong>ID verification</strong> — usually £10–£20 per person for anti-money laundering checks</li>
            <li><strong>Bankruptcy and priority searches</strong> — small fees totalling around £15–£20</li>
          </ul>
          <h2>Stamp Duty Land Tax (SDLT)</h2>
          <p>SDLT is a government tax on property purchases over £125,000 in England (different rules apply in Wales and Scotland). It is not a conveyancing fee — it is paid directly to HMRC by your solicitor on your behalf. Use our <a href="/sdlt-calculator/">SDLT calculator</a> to estimate your liability.</p>
          <h2>Typical total costs (England, 2026)</h2>
          <ul>
            <li><strong>Purchase (freehold, mortgage)</strong> — £1,500–£2,500 total inc. disbursements, ex. SDLT</li>
            <li><strong>Sale (freehold)</strong> — £900–£1,500 total inc. disbursements</li>
            <li><strong>Remortgage</strong> — £700–£1,100 total inc. disbursements</li>
            <li><strong>Transfer of equity</strong> — £600–£1,000 total inc. disbursements</li>
          </ul>
          <h2>How to compare quotes</h2>
          <p>When comparing quotes, always check whether VAT is included, what disbursements are listed, and whether the quote is fixed or estimated. A quote that appears cheaper may omit disbursements or add supplements later.</p>
          <p>ConveyQuote provides fully itemised quotes so you can see exactly what you are paying for. <a href="/">Get your quote here.</a></p>
        </div>
      )}

      {/* ── Terms & Conditions ── */}
      {isTermsPage && (
        <div className="public-page">
          <h1>Terms and Conditions</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Essentially Law Limited · ConveyQuote</p>
          <h2>1. About us</h2>
          <p>ConveyQuote is a trading name of Essentially Law Limited (Company Number: 14625839), registered in England and Wales. We operate an online platform that generates conveyancing quotes and introduces users to SRA-regulated law firms. We are not a firm of solicitors and do not provide legal advice.</p>
          <h2>2. Nature of our service</h2>
          <p>Our service is limited to providing indicative conveyancing quotes and introducing users to independent law firms. Any legal services are provided solely by the law firm you choose to instruct.</p>
          <h2>3. Quotes</h2>
          <p>Quotes generated via the platform are indicative only and based on the information provided. Final costs will be confirmed by the instructed law firm following review of the transaction.</p>
          <h2>4. No solicitor-client relationship</h2>
          <p>Use of this platform does not create a solicitor-client relationship between you and Essentially Law Limited. Any legal relationship will be between you and the law firm you instruct.</p>
          <h2>5. Referral fees</h2>
          <p>We may receive a referral fee from a law firm where you proceed to instruct them. This fee does not increase the amount you pay.</p>
          <h2>6. Liability</h2>
          <p>We are not responsible for the legal advice or services provided by any law firm. Our liability is limited to the extent permitted by law.</p>
          <h2>7. Accuracy of information</h2>
          <p>You are responsible for ensuring that all information provided is accurate and complete. Inaccurate information may affect the final cost quoted by the instructed firm.</p>
          <h2>8. Changes</h2>
          <p>We may update these terms from time to time. Continued use of the platform following any update constitutes acceptance of the revised terms.</p>
          <p style={{ marginTop: "24px", color: "var(--muted)", fontSize: "0.88rem" }}>For queries: <a href="mailto:info@conveyquote.uk">info@conveyquote.uk</a></p>
        </div>
      )}

      {/* ── Privacy Policy ── */}
      {isPrivacyPage && (
        <div className="public-page">
          <h1>Privacy Policy</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Essentially Law Limited · ConveyQuote · ICO registration: CSN9542473</p>
          <p>This website is operated by Essentially Law Limited ("we", "us", "our"). ConveyQuote is a trading name of Essentially Law Limited, a company registered in England and Wales (Company Number: 14625839). We operate an online platform that provides conveyancing quotes and introduces users to SRA-regulated law firms. We are not a firm of solicitors and do not provide legal advice.</p>
          <h2>1. Personal data we collect</h2>
          <ul>
            <li>Name, email address and telephone number</li>
            <li>Property and transaction details (including postcode and price)</li>
            <li>Information submitted as part of your enquiry</li>
            <li>Technical data (including IP address and device information)</li>
          </ul>
          <h2>2. How we use your data</h2>
          <ul>
            <li>Generate and provide conveyancing quotes</li>
            <li>Match you with suitable conveyancing firms</li>
            <li>Facilitate contact between you and those firms</li>
            <li>Operate, maintain and improve our platform</li>
          </ul>
          <h2>3. Lawful basis</h2>
          <p>We process your personal data on the basis of your consent (where you request a quote and agree to be contacted) and our legitimate interests in operating an introduction platform.</p>
          <h2>4. Sharing your data</h2>
          <p>Where you request a quote, your details may be shared with one or more SRA-regulated conveyancing firms so that they can contact you directly. Once your details are shared, the law firm will act as an independent data controller and will provide its own privacy information. We may also share data with service providers (such as hosting and email providers) where necessary.</p>
          <h2>5. Referral fees</h2>
          <p>We may receive a referral fee from a law firm if you choose to instruct them. This does not affect the amount you pay for legal services.</p>
          <h2>6. Data retention</h2>
          <p>We retain personal data only for as long as necessary to fulfil the purposes outlined above and to comply with legal and regulatory obligations.</p>
          <h2>7. Your rights</h2>
          <p>You have the right to request access to, correction of, or erasure of your personal data, and to object to or restrict processing. Requests can be made by contacting: <a href="mailto:privacy@conveyquote.uk">privacy@conveyquote.uk</a></p>
          <h2>8. Security</h2>
          <p>We implement appropriate technical and organisational measures to safeguard personal data.</p>
          <h2>9. ICO registration</h2>
          <p>Essentially Law Limited is registered with the Information Commissioner's Office. Registration number: <strong>CSN9542473</strong>. You have the right to lodge a complaint with the ICO at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a>.</p>
        </div>
      )}

      {/* ── Site footer ── */}
      <footer className="site-footer">
        <div className="site-footer__inner">
          <div className="site-footer__grid">
            <div>
              <img src={logo} alt="ConveyQuote UK" className="site-footer__logo" />
              <p>ConveyQuote is a trading name of Essentially Law Limited (Company No. 14625839), registered in England and Wales.</p>
              <p>We are not a firm of solicitors and do not provide legal advice. We operate an introduction service connecting clients with SRA-regulated conveyancing firms.</p>
              <p>A referral fee may be received if you proceed with an instructed firm. This does not affect the cost of your legal services.</p>
            </div>
            <div>
              <h4>Services</h4>
              <div className="site-footer__links">
                <a href="/">Get a Quote</a>
                <a href="/sdlt-calculator/">SDLT Calculator</a>
                <a href="/conveyancing-fees/">Conveyancing Fees Guide</a>
                <a href="/firm-login/">Firm Portal</a>
                <a href="/referrer-login/">Referrer Portal</a>
              </div>
            </div>
            <div>
              <h4>Legal</h4>
              <div className="site-footer__links">
                <a href="/about/">About Us</a>
                <a href="/terms/">Terms &amp; Conditions</a>
                <a href="/privacy/">Privacy Policy</a>
                <a href="mailto:privacy@conveyquote.uk">Privacy Enquiries</a>
                <a href="mailto:info@conveyquote.uk">Contact Us</a>
              </div>
            </div>
          </div>
          <div className="site-footer__bottom">
            <p>© {new Date().getFullYear()} Essentially Law Limited. All rights reserved. ConveyQuote is a trading name of Essentially Law Limited.</p>
            <p>Registered in England and Wales · Company No. 14625839 · ICO Registration: CSN9542473</p>
            <p>We are an introducer, not a law firm. Legal services are provided by independent SRA-regulated firms.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

// ── Standalone SDLT Calculator ────────────────────────────────────────────────

function StandaloneSdltCalculator() {
  const [price, setPrice] = useState("");
  const [firstTimeBuyer, setFirstTimeBuyer] = useState("no");
  const [additionalProperty, setAdditionalProperty] = useState("no");
  const [ukResident, setUkResident] = useState("yes");
  const [isCompany, setIsCompany] = useState("no");
  const [sharedOwnership, setSharedOwnership] = useState("no");

  function calcStandard(p: number) {
    let tax = 0;
    if (p > 250000) tax += (Math.min(p, 925000) - 250000) * 0.05;
    if (p > 925000) tax += (Math.min(p, 1500000) - 925000) * 0.1;
    if (p > 1500000) tax += (p - 1500000) * 0.12;
    return Math.max(0, tax);
  }

  function calcFTB(p: number) {
    if (p > 625000) return calcStandard(p);
    let tax = 0;
    if (p > 425000) tax += (p - 425000) * 0.05;
    return Math.max(0, tax);
  }

  const p = Number(String(price).replace(/,/g, ""));
  const manualReview = sharedOwnership === "yes" || isCompany === "yes" || !p;
  let sdlt = 0;
  let note = "";

  if (!manualReview) {
    const base = firstTimeBuyer === "yes" && additionalProperty !== "yes" ? calcFTB(p) : calcStandard(p);
    let surcharge = 0;
    if (additionalProperty === "yes") surcharge += p * 0.05;
    if (ukResident === "no") surcharge += p * 0.02;
    sdlt = base + surcharge;
  } else {
    note = !p ? "Enter a valid price above" : "Manual review recommended for this transaction type";
  }

  const fmt = (v: number) => `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;

  return (
    <div className="public-page">
      <h1>Stamp Duty Land Tax (SDLT) Calculator</h1>
      <p style={{ color: "var(--muted)", marginBottom: "24px" }}>Estimate your Stamp Duty for residential property purchases in England and Northern Ireland. Different rates apply in Wales (LTT) and Scotland (LBTT).</p>

      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="sdltPriceStandalone">Purchase price (£)</label>
            <input id="sdltPriceStandalone" type="text" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 350000" />
          </div>
          <div className="field">
            <label htmlFor="sdltFtbStandalone">First time buyer?</label>
            <select id="sdltFtbStandalone" value={firstTimeBuyer} onChange={(e) => setFirstTimeBuyer(e.target.value)}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="sdltAddlStandalone">Additional property / buy-to-let?</label>
            <select id="sdltAddlStandalone" value={additionalProperty} onChange={(e) => setAdditionalProperty(e.target.value)}>
              <option value="no">No</option>
              <option value="yes">Yes (higher rates apply)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="sdltUkStandalone">UK resident for SDLT purposes?</label>
            <select id="sdltUkStandalone" value={ukResident} onChange={(e) => setUkResident(e.target.value)}>
              <option value="yes">Yes</option>
              <option value="no">No (2% surcharge applies)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="sdltCoStandalone">Buying via a company?</label>
            <select id="sdltCoStandalone" value={isCompany} onChange={(e) => setIsCompany(e.target.value)}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="sdltSoStandalone">Shared ownership?</label>
            <select id="sdltSoStandalone" value={sharedOwnership} onChange={(e) => setSharedOwnership(e.target.value)}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
        </div>

        <div className="sdlt-result" style={{ marginTop: "20px" }}>
          <div className="sdlt-result__label">Estimated SDLT</div>
          <div className="sdlt-result__amount">{manualReview ? "—" : fmt(sdlt)}</div>
          {manualReview && <div className="sdlt-result__note">{note}</div>}
          {!manualReview && sdlt === 0 && <div className="sdlt-result__note">No SDLT payable on this transaction</div>}
          {!manualReview && sdlt > 0 && p > 0 && (
            <div className="sdlt-result__note">Effective rate: {((sdlt / p) * 100).toFixed(2)}%</div>
          )}
        </div>

        <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "14px" }}>
          This calculator provides estimates only based on current SDLT rates for residential property in England. Always confirm with your solicitor before exchange. Rates correct as of April 2026.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Current SDLT Rates (Residential, England)</h3>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f7f9fc" }}>
              <th style={{ padding: "10px 12px", border: "1px solid #e5e7eb", textAlign: "left" }}>Purchase price</th>
              <th style={{ padding: "10px 12px", border: "1px solid #e5e7eb", textAlign: "right" }}>Standard rate</th>
              <th style={{ padding: "10px 12px", border: "1px solid #e5e7eb", textAlign: "right" }}>Additional property</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Up to £125,000", "0%", "5%"],
              ["£125,001 – £250,000", "2%", "7%"],
              ["£250,001 – £925,000", "5%", "10%"],
              ["£925,001 – £1,500,000", "10%", "15%"],
              ["Over £1,500,000", "12%", "17%"],
            ].map(([band, std, addl]) => (
              <tr key={band}>
                <td style={{ padding: "9px 12px", border: "1px solid #e5e7eb" }}>{band}</td>
                <td style={{ padding: "9px 12px", border: "1px solid #e5e7eb", textAlign: "right" }}>{std}</td>
                <td style={{ padding: "9px 12px", border: "1px solid #e5e7eb", textAlign: "right" }}>{addl}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "12px" }}>First-time buyers pay 0% on the first £425,000 (properties up to £625,000). Non-UK residents pay an additional 2% surcharge.</p>
      </div>
    </div>
  );
}

// ── Referrer Simple Form (with quote preview) ─────────────────────────────────

function ReferrerSimpleForm({ referrerToken, onSuccess }: { referrerToken: string; onSuccess: () => void }) {
  type Step = "form" | "preview" | "done";
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({
    property_address: "",
    name: "", email: "", phone: "",
    type: "purchase",
    price: "", tenure: "freehold",
    negotiator_name: "",
    // Hidden defaults fed into quote calc
    mortgage: "yes", firstTimeBuyer: "no", additionalProperty: "no",
    ukResidentForSdlt: "yes", newBuild: "no",
    saleMortgage: "no", managementCompany: "no",
  });
  const [preview, setPreview] = useState<import("./buildQuoteData").BuiltQuoteData | null>(null);
  const [sendToClient, setSendToClient] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resultRef, setResultRef] = useState("");
  const [error, setError] = useState("");

  const set = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const isSale = form.type === "sale" || form.type === "sale_purchase";
  const isPurchase = form.type === "purchase" || form.type === "sale_purchase";

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.email) { setError("Client email is required."); return; }
    if (!form.price || isNaN(Number(form.price))) { setError("Enter a valid property price."); return; }
    const q = buildQuoteData({
      type: form.type,
      price: form.price,
      tenure: form.tenure,
      mortgage: form.mortgage,
      firstTimeBuyer: form.firstTimeBuyer,
      additionalProperty: form.additionalProperty,
      ukResidentForSdlt: form.ukResidentForSdlt,
      newBuild: form.newBuild,
      saleMortgage: form.saleMortgage,
      managementCompany: form.managementCompany,
    });
    setPreview(q);
    setStep("preview");
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/referrer-submit-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${referrerToken}` },
        body: JSON.stringify({
          ...form,
          postcode: "",
          send_to_client: sendToClient,
          ownershipType: "sole", sharedOwnership: "no", helpToBuy: "no",
          isCompany: "no", buyToLet: "no", giftedDeposit: "no",
          lifetimeIsa: "no", additionalBorrowing: "no", remortgageTransfer: "no",
          transferMortgage: "no", ownersChanging: "no", numberOfSellers: "1",
          tenanted: "no",
        }),
      });
      const result = await res.json() as { success: boolean; reference?: string; error?: string };
      if (result.success && result.reference) {
        setResultRef(result.reference);
        setStep("done");
        setTimeout(onSuccess, 3500);
      } else {
        setError(result.error || "Failed to submit. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Done screen
  if (step === "done") {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{ fontSize: "52px", marginBottom: "16px" }}>✅</div>
        <h3 style={{ color: "var(--navy)", margin: "0 0 8px" }}>Referral submitted</h3>
        <p style={{ color: "var(--muted)", margin: "0 0 4px" }}>Reference: <strong>{resultRef}</strong></p>
        {sendToClient && <p style={{ color: "var(--muted)", fontSize: "14px" }}>Quote emailed to your client.</p>}
        <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "12px" }}>Returning to your dashboard…</p>
      </div>
    );
  }

  // ── Preview screen
  if (step === "preview" && preview) {
    const fmt = (n: number) => `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const typeLabel: Record<string, string> = {
      purchase: "Purchase", sale: "Sale", sale_purchase: "Sale & Purchase",
      remortgage: "Remortgage", transfer: "Transfer of Equity",
    };
    return (
      <div>
        <button type="button" onClick={() => setStep("form")}
          style={{ background: "none", border: "none", color: "var(--teal)", cursor: "pointer", fontSize: "14px", fontWeight: 600, padding: 0, marginBottom: "20px" }}>
          ← Edit details
        </button>

        <div style={{ background: "#f8faff", border: "1px solid #c7d7f5", borderRadius: "12px", padding: "20px 24px", marginBottom: "20px" }}>
          <h3 style={{ color: "var(--navy)", margin: "0 0 4px", fontSize: "18px" }}>Quote for {form.property_address || "this property"}</h3>
          <p style={{ color: "var(--muted)", margin: "0 0 16px", fontSize: "14px" }}>
            {typeLabel[form.type] || form.type} · {form.tenure} · £{Number(form.price).toLocaleString("en-GB")}
          </p>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <tbody>
              {[...preview.legalFees, ...preview.disbursements].map((item, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "8px 0", color: "#374151" }}>{item.label}{item.note ? <span style={{ fontSize: "12px", color: "#9ca3af", marginLeft: "6px" }}>{item.note}</span> : null}</td>
                  <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 500 }}>{fmt(item.amount)}</td>
                </tr>
              ))}
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "8px 0", color: "#374151" }}>VAT (20%)</td>
                <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 500 }}>{fmt(preview.vat)}</td>
              </tr>
              {preview.sdltAmount !== undefined && (
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "8px 0", color: "#374151" }}>Stamp Duty (SDLT){preview.sdltNote ? <span style={{ fontSize: "12px", color: "#9ca3af", marginLeft: "6px" }}>{preview.sdltNote}</span> : null}</td>
                  <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 500 }}>{fmt(preview.sdltAmount)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr style={{ background: "var(--navy)" }}>
                <td style={{ padding: "10px 12px", color: "#fff", fontWeight: 700, borderRadius: "0 0 0 8px" }}>Total (inc. VAT{preview.sdltAmount ? " & SDLT" : ""})</td>
                <td style={{ padding: "10px 12px", color: "#fff", fontWeight: 700, textAlign: "right", fontSize: "16px", borderRadius: "0 0 8px 0" }}>
                  {fmt(preview.totalIncludingSdlt ?? preview.grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Refinement options — quick toggles without going back */}
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px 20px", marginBottom: "20px" }}>
          <h4 style={{ margin: "0 0 12px", color: "var(--navy)", fontSize: "14px" }}>Refine quote</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[
              { label: "First time buyer?", field: "firstTimeBuyer", show: isPurchase },
              { label: "Additional property? (+3% SDLT)", field: "additionalProperty", show: isPurchase },
              { label: "New build?", field: "newBuild", show: isPurchase },
              { label: "Has mortgage?", field: "mortgage", show: isPurchase },
              { label: "Sale has mortgage?", field: "saleMortgage", show: isSale },
              { label: "Management company?", field: "managementCompany", show: true },
            ].filter((f) => f.show).map((f) => (
              <label key={f.field} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                <input type="checkbox"
                  checked={form[f.field as keyof typeof form] === "yes"}
                  onChange={(e) => {
                    set(f.field, e.target.checked ? "yes" : "no");
                    // Recalculate preview
                    const updated = { ...form, [f.field]: e.target.checked ? "yes" : "no" };
                    setPreview(buildQuoteData({
                      type: updated.type, price: updated.price, tenure: updated.tenure,
                      mortgage: updated.mortgage, firstTimeBuyer: updated.firstTimeBuyer,
                      additionalProperty: updated.additionalProperty, ukResidentForSdlt: updated.ukResidentForSdlt,
                      newBuild: updated.newBuild, saleMortgage: updated.saleMortgage,
                      managementCompany: updated.managementCompany,
                    }));
                  }}
                />
                {f.label}
              </label>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px 20px", marginBottom: "20px" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
            <input type="checkbox" checked={sendToClient} onChange={(e) => setSendToClient(e.target.checked)} style={{ marginTop: "2px" }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: "14px" }}>Email quote to client</div>
              <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "2px" }}>
                Send this quote to <strong>{form.email}</strong>. Untick if you'd prefer to share it yourself.
              </div>
            </div>
          </label>
        </div>

        {error && <p style={{ color: "#dc2626", fontSize: "14px", marginBottom: "12px" }}>{error}</p>}

        <div style={{ display: "flex", gap: "12px" }}>
          <button type="button" className="primary-button" disabled={submitting} onClick={() => void handleSubmit()}
            style={{ flex: 1, minHeight: 48, fontSize: "15px" }}>
            {submitting ? "Submitting…" : sendToClient ? "Confirm & Send Quote to Client" : "Confirm & Save Referral"}
          </button>
        </div>
      </div>
    );
  }

  // ── Form screen
  return (
    <form onSubmit={(e) => void handlePreview(e)}>
      <div style={{ marginBottom: "24px", paddingBottom: "20px", borderBottom: "1px solid var(--border)" }}>
        <h4 style={{ margin: "0 0 14px", color: "var(--navy)" }}>Property</h4>
        <div className="form-grid">
          <div className="field field--full">
            <label>Property address <span style={{ color: "#dc2626" }}>*</span></label>
            <input type="text" value={form.property_address}
              onChange={(e) => set("property_address", e.target.value)}
              placeholder="e.g. 14 Maple Street, Sheffield, S1 2AB"
              required />
          </div>
          <div className="field">
            <label>Transaction type</label>
            <select value={form.type} onChange={(e) => set("type", e.target.value)}>
              <option value="purchase">Purchase</option>
              <option value="sale">Sale</option>
              <option value="sale_purchase">Sale &amp; Purchase</option>
              <option value="remortgage">Remortgage</option>
              <option value="transfer">Transfer of Equity</option>
            </select>
          </div>
          <div className="field">
            <label>Tenure</label>
            <select value={form.tenure} onChange={(e) => set("tenure", e.target.value)}>
              <option value="freehold">Freehold</option>
              <option value="leasehold">Leasehold</option>
            </select>
          </div>
          <div className="field">
            <label>Property price <span style={{ color: "#dc2626" }}>*</span></label>
            <input type="number" value={form.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="e.g. 275000" required min="1" />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "24px", paddingBottom: "20px", borderBottom: "1px solid var(--border)" }}>
        <h4 style={{ margin: "0 0 14px", color: "var(--navy)" }}>Client</h4>
        <div className="form-grid">
          <div className="field">
            <label>Full name</label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Client full name" />
          </div>
          <div className="field">
            <label>Email <span style={{ color: "#dc2626" }}>*</span></label>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="client@example.com" required />
          </div>
          <div className="field">
            <label>Phone</label>
            <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="07700 900000" />
          </div>
          <div className="field">
            <label>Your name / negotiator</label>
            <input type="text" value={form.negotiator_name} onChange={(e) => set("negotiator_name", e.target.value)} placeholder="Who referred this client?" />
          </div>
        </div>
      </div>

      {error && <p style={{ color: "#dc2626", fontSize: "14px", marginBottom: "12px" }}>{error}</p>}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="primary-button" style={{ minHeight: 48, padding: "0 32px", fontSize: "15px" }}>
          Preview Quote →
        </button>
      </div>

      <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "12px", textAlign: "right" }}>
        You'll see the quote figures before anything is sent to your client.
      </p>
    </form>
  );
}

