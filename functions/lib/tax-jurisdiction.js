// functions/lib/tax-jurisdiction.js
//
// Which property-transaction tax applies, decided from the postcode.
//
// Tax on land transactions is devolved, so a residential purchase falls
// under one of three separate regimes depending on where the property
// sits:
//
//   England & Northern Ireland  Stamp Duty Land Tax (SDLT) — HMRC
//   Wales                       Land Transaction Tax (LTT) — Welsh
//                               Revenue Authority, under the Land
//                               Transaction Tax and Anti-avoidance of
//                               Devolved Taxes (Wales) Act 2017
//   Scotland                    Land and Buildings Transaction Tax
//                               (LBTT) — Revenue Scotland
//
// The quote engines implement SDLT only. Quoting an SDLT figure on a
// Welsh or Scottish property is not an approximation — it is the wrong
// tax, with different bands and different reliefs. Wales in particular
// grants NO first-time buyer relief at all, so a Welsh enquiry answering
// "first time buyer: yes" is not merely mispriced: the relief it implies
// does not exist.
//
// Rather than carry and maintain a second and third set of tax tables,
// anything outside the SDLT regime is routed to the manual-review path
// the engines already use for shared ownership and company purchases.
//
// Shared deliberately between the server engine
// (functions/lib/calculate-quote.js) and the client engine
// (src/buildQuoteData.ts) so the two cannot drift, in the same way
// disbursement-constants.js is shared.

// Postcode areas — the leading letters — lying wholly within Wales.
const WALES_AREAS = new Set(["CF", "LD", "LL", "NP", "SA"]);

// Postcode areas lying wholly within Scotland. BT is deliberately absent:
// Northern Ireland sits inside the SDLT regime, not a devolved one.
const SCOTLAND_AREAS = new Set([
  "AB",
  "DD",
  "DG",
  "EH",
  "FK",
  "G",
  "HS",
  "IV",
  "KA",
  "KW",
  "KY",
  "ML",
  "PA",
  "PH",
  "ZE",
]);

// Areas straddling a border, where the letters alone cannot settle the
// regime: CH, SY and HR span the England–Wales border (Flintshire,
// Powys), TD spans the England–Scotland border (Berwick-upon-Tweed is
// TD15 and English). Deciding these needs the full postcode against a
// boundary lookup, so they go to manual review rather than being guessed
// in either direction.
const WALES_BORDER_AREAS = new Set(["CH", "SY", "HR"]);
const SCOTLAND_BORDER_AREAS = new Set(["TD"]);

// The postcode "area" is the leading one or two letters: NP25 4AJ → NP,
// G1 1AA → G, GL51 1AA → GL.
export function getPostcodeArea(postcode) {
  const match = String(postcode || "")
    .trim()
    .toUpperCase()
    .match(/^[A-Z]{1,2}/);
  return match ? match[0] : "";
}

// Returns { regime, note }. regime is "sdlt" when the automatic figure is
// safe to use; anything else carries a note explaining why the figure has
// been withheld. An absent or unrecognised postcode stays on "sdlt" —
// the overwhelming majority are English, and routing every unparseable
// postcode to manual review would bury the real cases.
export function getTaxJurisdiction(postcode) {
  const area = getPostcodeArea(postcode);

  if (!area) return { regime: "sdlt" };

  if (WALES_AREAS.has(area)) {
    return {
      regime: "ltt",
      note:
        "Welsh property — Land Transaction Tax (LTT) applies, not SDLT, " +
        "and Wales has no first-time buyer relief. Figure withheld " +
        "pending manual calculation.",
    };
  }

  if (SCOTLAND_AREAS.has(area)) {
    return {
      regime: "lbtt",
      note:
        "Scottish property — Land and Buildings Transaction Tax (LBTT) " +
        "applies, not SDLT. Figure withheld pending manual calculation.",
    };
  }

  if (WALES_BORDER_AREAS.has(area)) {
    return {
      regime: "border",
      note:
        `Postcode area ${area} straddles the England–Wales border — ` +
        "confirm whether SDLT or Welsh LTT applies before quoting. " +
        "Figure withheld pending manual review.",
    };
  }

  if (SCOTLAND_BORDER_AREAS.has(area)) {
    return {
      regime: "border",
      note:
        `Postcode area ${area} straddles the England–Scotland border — ` +
        "confirm whether SDLT or Scottish LBTT applies before quoting. " +
        "Figure withheld pending manual review.",
    };
  }

  return { regime: "sdlt" };
}
