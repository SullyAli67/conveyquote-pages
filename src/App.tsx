import { useState, type ChangeEvent, type FormEvent } from "react";
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

  const ADMIN_PASSCODE = "1212";

  const currentPath = window.location.pathname;
  const isAdminPage = currentPath === "/admin";

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

    const payload = { ...form, quoteAmount: "1000" };

    try {
      const response = await fetch("/api/send-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        alert("Enquiry submitted successfully.");
        setForm(initialFormState);
        window.scrollTo({ top: 0 });
      } else {
        alert("Error submitting enquiry.");
      }
    } catch {
      alert("Something went wrong.");
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        alert("Quote sent to client.");
        setApprovedQuote(initialApprovedQuoteState);
      } else {
        alert("Failed to send quote.");
      }
    } catch {
      alert("Error sending quote.");
    }
  };

  return (
    <div className="page">
      <header className="hero">
        <div className="hero__inner">
          <img src={logo} alt="logo" className="hero__logo" />
          <h1>
            {isAdminPage
              ? "Admin – Approve Quotes"
              : "Online Conveyancing Quotes"}
          </h1>
        </div>
      </header>

      <main className="container">
        {/* PUBLIC PAGE */}
        {!isAdminPage && (
          <section className="card card--form">
            <h2>Get a Quote</h2>

            <form onSubmit={handleSubmit}>
              <input
                name="name"
                placeholder="Name"
                value={form.name}
                onChange={handleChange}
                required
              />
              <input
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                required
              />
              <input
                name="price"
                placeholder="Price"
                value={form.price}
                onChange={handleChange}
                required
              />

              <button type="submit">Submit</button>
            </form>
          </section>
        )}

        {/* ADMIN LOCK SCREEN */}
        {isAdminPage && !isAdminUnlocked && (
          <section className="card card--form">
            <h2>Admin Login</h2>

            <form onSubmit={handleAdminUnlock}>
              <input
                type="password"
                placeholder="Enter passcode"
                value={adminPasscode}
                onChange={(e) => setAdminPasscode(e.target.value)}
              />
              <button type="submit">Unlock</button>
            </form>
          </section>
        )}

        {/* ADMIN PANEL */}
        {isAdminPage && isAdminUnlocked && (
          <section className="card card--form">
            <h2>Send Approved Quote</h2>

            <form onSubmit={handleApprovedQuoteSubmit}>
              <input
                name="clientName"
                placeholder="Client Name"
                value={approvedQuote.clientName}
                onChange={handleApprovedQuoteChange}
                required
              />
              <input
                name="clientEmail"
                placeholder="Client Email"
                value={approvedQuote.clientEmail}
                onChange={handleApprovedQuoteChange}
                required
              />
              <input
                name="quoteAmount"
                placeholder="Quote Amount"
                value={approvedQuote.quoteAmount}
                onChange={handleApprovedQuoteChange}
                required
              />

              <button type="submit">Send Quote</button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
