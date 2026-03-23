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
  saleMortgage: string;
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
    saleMortgage: "",
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
                Complete the form below and we will review the information before sending your quote.
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

              <div className="field">
                <label htmlFor="tenure">Tenure</label>
                <select id="tenure" name="tenure" value={form.tenure} onChange={handleChange} required>
                  <option value="">Please select</option>
                  <option value="freehold">Freehold</option>
                  <option value="leasehold">Leasehold</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="price">Property price (£)</label>
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

              <div className="field">
                <label htmlFor="saleMortgage">If selling, mortgage?</label>
                <select
                  id="saleMortgage"
                  name="saleMortgage"
                  value={form.saleMortgage}
                  onChange={handleChange}
                >
                  <option value="">Please select</option>
                  <option value="na">Not applicable</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

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
          </form>
        </section>

        <section className="info-grid">
          <article className="card">
            <h3>How it works</h3>
            <ol className="steps">
              <li>Submit your details online.</li>
              <li>We review the matter and pricing position.</li>
              <li>You receive your quote and next-step instructions by email.</li>
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
