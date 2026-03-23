import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import "./App.css";
import logo from "./assets/logo.png";

type QuoteForm = {
  type: string;
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

  saleMortgage: string;
  managementCompany: string;
  tenanted: string;

  currentLender: string;
  newLender: string;
  additionalBorrowing: string;
  remortgageTransfer: string;

  transferMortgage: string;
  ownersChanging: string;

  name: string;
  email: string;
  phone: string;
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
};

const initialFormState: QuoteForm = {
  type: "",
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

  saleMortgage: "",
  managementCompany: "",
  tenanted: "",

  currentLender: "",
  newLender: "",
  additionalBorrowing: "",
  remortgageTransfer: "",

  transferMortgage: "",
  ownersChanging: "",

  name: "",
  email: "",
  phone: "",
};

const initialApprovedQuoteState: ApprovedQuoteForm = {
  clientName: "",
  clientEmail: "",
  transactionType: "",
  tenure: "",
  propertyPrice: "",
  quoteAmount: "",
  quoteReference: "",
  feeBreakdown: "",
  nextSteps:
    "If you would like to proceed, please reply to this email and we will advise you on the next stage of the instruction process.",
};

function App() {
  const [form, setForm] = useState<QuoteForm>(initialFormState);
  const [approvedQuote, setApprovedQuote] = useState<ApprovedQuoteForm>(
    initialApprovedQuoteState
  );

  const [adminPasscode, setAdminPasscode] = useState("");
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminReference, setAdminReference] = useState("");
  const [isLoadingEnquiry, setIsLoadingEnquiry] = useState(false);
  const [loadedEnquiryMessage, setLoadedEnquiryMessage] = useState("");

  const ADMIN_PASSCODE = "1212";

  const currentPath = window.location.pathname;
  const isAdminPage = currentPath === "/admin";
  const currentUrl = new URL(window.location.href);
  const refFromUrl = currentUrl.searchParams.get("ref") || "";

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleApprovedQuoteChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setApprovedQuote({
      ...approvedQuote,
      [e.target.name]: e.target.value,
    });
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

    const quoteAmount = "1000";

    const payload = {
      ...form,
      quoteAmount,
    };

    try {
      const response = await fetch("/api/send-quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        alert("Thank you. Your enquiry has been submitted for review.");
        console.log("Internal enquiry email sent:", result);
        setForm(initialFormState);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        alert("Sorry, there was a problem submitting your enquiry. Please try again.");
        console.error("Send error:", result);
      }
    } catch (error) {
      alert("Sorry, something went wrong while submitting your enquiry.");
      console.error("Request error:", error);
    }
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
        console.log("Approved quote email sent:", result);
        setApprovedQuote(initialApprovedQuoteState);
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
        const enquiry = result.enquiry;

        setApprovedQuote({
          clientName: enquiry.client_name || "",
          clientEmail: enquiry.client_email || "",
          transactionType: enquiry.transaction_type || "",
          tenure: enquiry.tenure || "",
          propertyPrice: enquiry.price || "",
          quoteAmount: "",
          quoteReference: enquiry.reference || "",
          feeBreakdown: "",
          nextSteps:
            "If you would like to proceed, please reply to this email and we will advise you on the next stage of the instruction process.",
        });

        setAdminReference(reference);
        setLoadedEnquiryMessage(`Loaded enquiry ${reference}`);
      } else {
        setLoadedEnquiryMessage("Could not load enquiry.");
      }
    } catch (error) {
      console.error("Load enquiry error:", error);
      setLoadedEnquiryMessage("Error loading enquiry.");
    } finally {
      setIsLoadingEnquiry(false);
    }
  };

  useEffect(() => {
    if (isAdminPage && refFromUrl) {
      loadEnquiryByReference(refFromUrl);
    }
  }, [isAdminPage, refFromUrl]);

  const isPurchase = form.type === "purchase";
  const isSale = form.type === "sale";
  const isRemortgage = form.type === "remortgage";
  const isTransfer = form.type === "transfer";

  const sdltHint =
    form.ukResidentForSdlt === "no"
      ? "Non-UK resident surcharge may apply"
      : form.additionalProperty === "yes"
      ? "Higher rates of SDLT may apply"
      : form.firstTimeBuyer === "yes"
      ? "First-time buyer relief may apply"
      : "Standard residential SDLT likely";

  return (
    <div className="page">
      <header className="hero">
        <div className="hero__inner">
          <div className="hero__brand">
            <img src={logo} alt="ConveyQuote UK" className="hero__logo" />
          </div>

          <div className="hero__text">
            <span className="eyebrow">
              {isAdminPage ? "Internal Quote Approval" : "Online Conveyancing Quotes"}
            </span>
            <h1>
              {isAdminPage
                ? "Approve and send client quotes"
                : "Fast, clear conveyancing quotes with solicitor oversight"}
            </h1>
            <p className="hero__summary">
              {isAdminPage
                ? "Use this internal page to issue an approved client-facing quote after reviewing the enquiry."
                : "Get a tailored quote for your sale, purchase, remortgage or transfer of equity. We review the details before issuing your quote so you get a clearer starting point."}
            </p>

            <div className="hero__points">
              {isAdminPage ? (
                <>
                  <span>Internal use only</span>
                  <span>Client quote approval</span>
                  <span>Email issue tool</span>
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
                    Start by selecting the type of transaction. We will then show only the questions relevant to your matter.
                  </p>
                </div>
              </div>

              <form className="quote-form" onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="type">Transaction type</label>
                    <select id="type" name="type" value={form.type} onChange={handleChange} required>
                      <option value="">Please select</option>
                      <option value="purchase">Purchase</option>
                      <option value="sale">Sale</option>
                      <option value="remortgage">Remortgage</option>
                      <option value="transfer">Transfer of Equity</option>
                    </select>
                  </div>
                </div>

                {form.type && (
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
                        <select id="tenure" name="tenure" value={form.tenure} onChange={handleChange} required>
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
                        <p>These questions help us assess the likely complexity, pricing and SDLT position.</p>
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor="mortgage">Mortgage or cash</label>
                        <select id="mortgage" name="mortgage" value={form.mortgage} onChange={handleChange} required>
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
                        <select id="buyToLet" name="buyToLet" value={form.buyToLet} onChange={handleChange}>
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="newBuild">New build?</label>
                        <select id="newBuild" name="newBuild" value={form.newBuild} onChange={handleChange}>
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
                        <select id="helpToBuy" name="helpToBuy" value={form.helpToBuy} onChange={handleChange}>
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="isCompany">Buying via company?</label>
                        <select id="isCompany" name="isCompany" value={form.isCompany} onChange={handleChange}>
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field field--full">
                        <label htmlFor="giftedDeposit">Any gifted deposit?</label>
                        <select id="giftedDeposit" name="giftedDeposit" value={form.giftedDeposit} onChange={handleChange}>
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="field field--full">
                        <label htmlFor="sdltHint">SDLT guidance</label>
                        <input
                          id="sdltHint"
                          type="text"
                          value={sdltHint}
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="form-footer" style={{ paddingTop: "0" }}>
                      <p className="form-note">
                        SDLT is highly fact-sensitive. Any figure produced later will be an estimate only and may change depending on buyer status, reliefs, surcharge position and the final transaction structure.
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
                        <label htmlFor="managementCompany">Management company / service charge?</label>
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

                      <div className="field field--full">
                        <label htmlFor="tenanted">Is the property tenanted?</label>
                        <select id="tenanted" name="tenanted" value={form.tenanted} onChange={handleChange}>
                          <option value="">Please select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
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
                        <label htmlFor="remortgageTransfer">Transfer of equity at same time?</label>
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
                        <p>These questions help us understand the ownership change and whether any lender is involved.</p>
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor="transferMortgage">Is there a mortgage on the property?</label>
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

                {form.type && (
                  <>
                    <div className="section-heading" style={{ marginTop: "10px" }}>
                      <div>
                        <h2>Your Contact Details</h2>
                        <p>Please provide your contact details so we can review your enquiry and respond.</p>
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
                      <p className="form-note">
                        By submitting this form, you are requesting a quote only. No solicitor-client relationship is formed at this stage.
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
                  <li>We review the details and then issue your quote by email if appropriate.</li>
                </ol>
              </article>

              <article className="card">
                <h3>About ConveyQuote</h3>
                <p>
                  ConveyQuote is designed to make conveyancing quotes clearer, quicker and easier to request,
                  while still allowing legal oversight before the quote is issued.
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
                <p>Enter the internal passcode to access the quote approval area.</p>
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
          <section className="card card--form" style={{ marginTop: "24px" }}>
            <div className="section-heading">
              <div>
                <h2>Approve and Send Client Quote</h2>
                <p>
                  Internal use only. Enter the approved quote details below and
                  send the client-facing quote email.
                </p>
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
                    placeholder="Client full name"
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
                    placeholder="client@example.com"
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
                    required
                  >
                    <option value="">Please select</option>
                    <option value="purchase">Purchase</option>
                    <option value="sale">Sale</option>
                    <option value="remortgage">Remortgage</option>
                    <option value="transfer">Transfer of Equity</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="approvedTenure">Tenure</label>
                  <select
                    id="approvedTenure"
                    name="tenure"
                    value={approvedQuote.tenure}
                    onChange={handleApprovedQuoteChange}
                    required
                  >
                    <option value="">Please select</option>
                    <option value="freehold">Freehold</option>
                    <option value="leasehold">Leasehold</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="propertyPrice">Property price / value (£)</label>
                  <input
                    id="propertyPrice"
                    type="text"
                    name="propertyPrice"
                    value={approvedQuote.propertyPrice}
                    onChange={handleApprovedQuoteChange}
                    placeholder="e.g. 325000"
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
                    onChange={handleApprovedQuoteChange}
                    placeholder="e.g. 1450 + VAT"
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
                    placeholder="e.g. CQ-1001"
                  />
                </div>

                <div className="field field--full">
                  <label htmlFor="feeBreakdown">Fee notes / breakdown</label>
                  <textarea
                    id="feeBreakdown"
                    name="feeBreakdown"
                    value={approvedQuote.feeBreakdown}
                    onChange={handleApprovedQuoteChange}
                    placeholder="Example: Legal fee estimate for standard sale. Excludes additional work outside the normal scope."
                    rows={5}
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

              <div className="form-footer">
                <p className="form-note">
                  Internal tool only. This sends the approved client-facing quote email.
                </p>
                <button type="submit" className="primary-button">
                  Send Approved Quote
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
