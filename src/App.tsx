import { useState, type ChangeEvent, type FormEvent } from "react";
import "./App.css";

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
    <div className="container">

      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <h1>ConveyQuote</h1>
        <p>Clear conveyancing quotes. Reviewed before issue.</p>
      </div>

      <div className="card">
        <h2>Get a Quote</h2>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          
          <select name="type" value={form.type} onChange={handleChange} required>
            <option value="">Transaction type</option>
            <option value="purchase">Purchase</option>
            <option value="sale">Sale</option>
            <option value="remortgage">Remortgage</option>
            <option value="transfer">Transfer of Equity</option>
          </select>

          <select name="tenure" value={form.tenure} onChange={handleChange} required>
            <option value="">Tenure</option>
            <option value="freehold">Freehold</option>
            <option value="leasehold">Leasehold</option>
          </select>

          <input type="number" name="price" placeholder="Property price (£)" value={form.price} onChange={handleChange} required />

          <input type="text" name="postcode" placeholder="Property postcode" value={form.postcode} onChange={handleChange} required />

          <select name="mortgage" value={form.mortgage} onChange={handleChange} required>
            <option value="">Mortgage or cash</option>
            <option value="mortgage">Mortgage</option>
            <option value="cash">Cash</option>
          </select>

          <select name="ownershipType" value={form.ownershipType} onChange={handleChange}>
            <option value="">Buyer type</option>
            <option value="individual">Individual</option>
            <option value="joint">Joint buyers</option>
            <option value="company">Company</option>
          </select>

          <select name="firstTimeBuyer" value={form.firstTimeBuyer} onChange={handleChange}>
            <option value="">First time buyer?</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>

          <select name="newBuild" value={form.newBuild} onChange={handleChange}>
            <option value="">New build?</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>

          <select name="sharedOwnership" value={form.sharedOwnership} onChange={handleChange}>
            <option value="">Shared ownership?</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>

          <select name="helpToBuy" value={form.helpToBuy} onChange={handleChange}>
            <option value="">Help to Buy / scheme?</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>

          <select name="isCompany" value={form.isCompany} onChange={handleChange}>
            <option value="">Buying via company?</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>

          <select name="saleMortgage" value={form.saleMortgage} onChange={handleChange}>
            <option value="">If selling: mortgage?</option>
            <option value="">N/A</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>

          <input type="text" name="name" placeholder="Full name" value={form.name} onChange={handleChange} required />
          <input type="email" name="email" placeholder="Email address" value={form.email} onChange={handleChange} required />
          <input type="tel" name="phone" placeholder="Phone number" value={form.phone} onChange={handleChange} />

          <button type="submit">Get My Quote</button>
        </form>
      </div>

      <div className="card">
        <h2>How it works</h2>
        <p>1. Submit your details</p>
        <p>2. We review and approve your quote</p>
        <p>3. You receive your quote and instruction link</p>
      </div>

      <div className="card">
        <h2>About</h2>
        <p>
          ConveyQuote is designed to give fast, transparent conveyancing quotes
          with solicitor oversight before issue.
        </p>
      </div>

    </div>
  );
}

export default App;
