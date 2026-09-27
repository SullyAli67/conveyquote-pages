import { useEffect, useRef } from "react";
import { scrollToQuote } from "./XrayHero";

// Icon geometry from design/redesign-2026/icons; the white knockouts follow the card colour (--cq-card).
const icon = { viewBox: "0 0 64 64", width: 88, height: 88, fill: "none", stroke: "currentColor", strokeWidth: 2.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
const houseOutline = (
  <>
    <path d="M6 30 L28 12 L50 30" />
    <path d="M11 26 V52 H45 V26" />
    <path d="M24 52 V40 H32 V52" />
    <rect x="15.5" y="32" width="6" height="6" rx="0.5" />
  </>
);

function BuyIcon() {
  return (
    <svg {...icon}>
      {houseOutline}
      <circle cx="45" cy="42" r="7.5" stroke="var(--cq-card)" strokeWidth="7" />
      <path d="M50.5 47.5 L61 58" stroke="var(--cq-card)" strokeWidth="7" />
      <circle cx="45" cy="42" r="7.5" fill="var(--cq-teal)" stroke="var(--cq-teal)" strokeWidth="2" />
      <circle cx="43.6" cy="40.6" r="2.3" fill="var(--cq-card)" stroke="none" />
      <path d="M50.3 47.3 L61 58 M56.2 53.2 L52.8 56.6 M59.6 56.6 L56.8 59.4" stroke="var(--cq-teal)" strokeWidth="3.4" />
    </svg>
  );
}

function SellIcon() {
  return (
    <svg {...icon}>
      {houseOutline}
      <path d="M55 30 V57" stroke="var(--cq-card)" strokeWidth="7" />
      <rect x="45" y="19" width="18" height="12" rx="1.5" stroke="var(--cq-card)" strokeWidth="7" />
      <path d="M55 31 V57" stroke="var(--cq-teal)" strokeWidth="3" />
      <rect x="45" y="19" width="18" height="12" rx="1.5" fill="var(--cq-teal)" stroke="var(--cq-teal)" />
      <text x="54" y="27.6" textAnchor="middle" fontSize="6.2" fontWeight="700" fill="var(--cq-card)" stroke="none" fontFamily="Inter, Arial, sans-serif" letterSpacing="0.3">SOLD</text>
    </svg>
  );
}

function MoveIcon() {
  return (
    <svg {...icon}>
      <path d="M3 38 L14 29 L25 38" />
      <path d="M6.5 35 V53 H21.5 V35" />
      <path d="M11.5 53 V46 H16.5 V53" />
      <path d="M39 38 L50 29 L61 38" />
      <path d="M42.5 35 V53 H57.5 V35" />
      <path d="M47.5 53 V46 H52.5 V53" />
      <path d="M16 22 Q32 6 47 20" stroke="var(--cq-teal)" strokeWidth="3.2" />
      <path d="M40.5 19.5 L47.5 20.5 L47 13.5" stroke="var(--cq-teal)" strokeWidth="3.2" />
    </svg>
  );
}

function RemortgageIcon() {
  return (
    <svg {...icon}>
      {houseOutline}
      <circle cx="48" cy="45" r="10.5" stroke="var(--cq-card)" strokeWidth="7" />
      <circle cx="48" cy="45" r="10.5" fill="var(--cq-teal)" stroke="var(--cq-teal)" />
      <path d="M43.8 49.6 L52.2 40.4" stroke="var(--cq-card)" strokeWidth="2.4" />
      <circle cx="44.3" cy="41.3" r="1.9" fill="var(--cq-card)" stroke="none" />
      <circle cx="51.7" cy="48.7" r="1.9" fill="var(--cq-card)" stroke="none" />
    </svg>
  );
}

// Values are the existing <select id="type"> options in App.tsx.
const TRANSACTIONS = [
  { value: "purchase", label: "Buying", hint: "I’m purchasing a property", Icon: BuyIcon },
  { value: "sale", label: "Selling", hint: "I’m selling a property", Icon: SellIcon },
  { value: "sale_purchase", label: "Buying and selling", hint: "I’m moving home", Icon: MoveIcon },
  { value: "remortgage", label: "Remortgaging", hint: "I’m changing my mortgage", Icon: RemortgageIcon },
];

function focusFieldAfterType() {
  const select = document.getElementById("type") as HTMLSelectElement | null;
  if (!select?.form) return;
  const fields = Array.from(select.form.elements).filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement &&
      el.tagName !== "FIELDSET" &&
      !(el instanceof HTMLInputElement && el.type === "hidden") &&
      !(el as HTMLInputElement).disabled &&
      el.getClientRects().length > 0
  );
  (fields[fields.indexOf(select) + 1] ?? select).focus({ preventScroll: true });
}

export function TransactionSelector({ value, onSelect }: { value: string; onSelect: (value: string) => void }) {
  const focusPending = useRef(false);

  // Runs after App has re-rendered the form for the new type, so the next field exists.
  useEffect(() => {
    if (!focusPending.current) return;
    focusPending.current = false;
    focusFieldAfterType();
  }, [value]);

  const choose = (next: string) => {
    scrollToQuote();
    if (next === value) {
      focusFieldAfterType();
      return;
    }
    focusPending.current = true;
    onSelect(next);
  };

  return (
    <section className="cq-block" aria-labelledby="cq-start-heading">
      <div className="cq-wrap">
        <p className="cq-eyebrow">Get your quote</p>
        <h2 id="cq-start-heading" className="cq-h2">What are you doing with your property?</h2>
        <div className="cq-tcards" role="group" aria-labelledby="cq-start-heading">
          {TRANSACTIONS.map(({ value: v, label, hint, Icon }) => (
            <button key={v} type="button" className="cq-tcard" aria-pressed={value === v} onClick={() => choose(v)}>
              <span className="cq-tcard__icon"><Icon /></span>
              <span className="cq-tcard__label">{label}</span>
              <span className="cq-tcard__hint">{hint}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

const COST_ROWS = [
  { item: "Legal fee", note: "your solicitor’s work", status: "Itemised" },
  { item: "VAT on the legal fee", note: "20%", status: "Itemised" },
  { item: "Search pack", note: "property searches", status: "Itemised" },
  { item: "Land Registry fee", note: "HM Land Registry", status: "Itemised" },
  { item: "ID checks", note: "identity verification", status: "Itemised" },
  { item: "Telegraphic transfer fee", note: "sending funds by bank transfer", status: "Itemised" },
  { item: "Stamp Duty Land Tax", note: "Land Transaction Tax in Wales", status: "If applicable" },
];

export function CostBreakdown() {
  return (
    <section className="cq-block cq-dark" aria-labelledby="cq-cost-heading">
      <div className="cq-wrap cq-split">
        <div>
          <p className="cq-eyebrow">Complete transparency</p>
          <h2 id="cq-cost-heading" className="cq-h2">
            Every cost,
            <br />
            itemised.
          </h2>
          <p className="cq-lede">
            Your quote sets out the legal fee, the VAT on it and each third-party cost as a separate line, so you can see
            what you are paying for before you decide.
          </p>
        </div>
        <figure className="cq-qcard" aria-labelledby="cq-qcard-title">
          <div className="cq-qcard__head">
            <p id="cq-qcard-title" className="cq-qcard__title">How your quote is laid out</p>
            <span className="cq-tag">Example</span>
          </div>
          <ul>
            {COST_ROWS.map((row) => (
              <li key={row.item}>
                <span>
                  {row.item} <em>&middot; {row.note}</em>
                </span>
                <span className="cq-qcard__status">{row.status}</span>
              </li>
            ))}
          </ul>
          <figcaption>
            Illustration of the layout only. Which lines appear depends on your transaction, and your quote shows the
            figures for it.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

// "Transparent pricing" and "Fast & simple" moved here from the trust strip.
const WHY_POINTS = [
  { title: "Itemised, not bundled", body: "The legal fee, VAT and every third-party cost are shown separately, so you can compare like with like." },
  { title: "SRA-regulated firms", body: "We match you with a conveyancing firm regulated by the Solicitors Regulation Authority. We introduce you; the firm carries out the legal work." },
  { title: "No obligation", body: "Take your time with your quote. You can accept it, ask questions or decline, with no obligation at any stage." },
  { title: "Transparent pricing", body: "Every quote is reviewed by our team before it is issued, and nothing is added later without explanation." },
  { title: "Fast & simple", body: "Enter your property details once and receive your itemised quote by email within one working day." },
];

export function WhyConveyQuote() {
  return (
    <section className="cq-why" aria-labelledby="cq-why-heading">
      <p className="cq-eyebrow">Why ConveyQuote</p>
      <h2 id="cq-why-heading" className="cq-h2">Clarity, from the first click.</h2>
      <ul className="cq-why__grid">
        {WHY_POINTS.map((point) => (
          <li key={point.title}>
            <h3>{point.title}</h3>
            <p>{point.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// App scrolls to the top after a successful enquiry; on this layout the confirmation sits lower down.
export function RevealEnquiryConfirmation({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    const card = document.getElementById("quote");
    if (!card) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    card.focus({ preventScroll: true });
  }, [active]);
  return null;
}

export function ClosingCta() {
  return (
    <section className="cq-block cq-dark cq-final" aria-labelledby="cq-final-eyebrow cq-final-heading">
      <div className="cq-wrap">
        <p id="cq-final-eyebrow" className="cq-eyebrow">Ready when you are</p>
        <h2 id="cq-final-heading" className="cq-h2">
          Your move,
          <br />
          made clear.
        </h2>
        <p className="cq-lede">Get an itemised quote from SRA-regulated firms across England and Wales.</p>
        <a className="cq-btn" href="#quote" onClick={scrollToQuote}>
          Get my quote <span aria-hidden="true">&rarr;</span>
        </a>
      </div>
    </section>
  );
}
