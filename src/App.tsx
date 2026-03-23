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

function App() {
  const [form, setForm] = useState<QuoteForm>({
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
  });

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log(form);
    alert("Quote submitted. We will review and send your quote shortly.");
  };

  const isPurchase = form.type === "purchase";
  const isSale = form.type === "sale";
  const isRemortgage = form.type === "remortgage";
  const isTransfer = form.type === "transfer";

  return (
    <div className="page">
      <header className="hero">
        <div className="hero__inner">
          <div className="hero__brand">
            <img src={logo} alt="ConveyQuote UK" className="hero__logo" />
          </div>

          <div className="hero__text">
            <span className="eyebrow">Online Conveyancing Quotes</span>
            <h1>Fast, clear conveyancing quotes with solicitor oversight</h1>
            <p className="hero__summary">
              Get a tailored quote for your sale, purchase, remortgage or transfer of equity.
              We review the details before issuing your quote so you get a clearer starting point.
            </p>

            <div className="hero__points">
              <span>Clear pricing</span>
              <span>Solicitor reviewed</span>
              <span>Simple online process</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container">
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
                    <p>These questions help us assess the likely complexity and pricing.</p>
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
                    <p>Please provide your contact details so we can send your quote.</p>
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
              <li>We review the details and send your quote by email.</li>
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
      </main>
    </div>
  );
}

export default App;
