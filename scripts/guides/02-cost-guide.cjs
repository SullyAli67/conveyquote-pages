// Guide 2 — Conveyancing Cost Guide 2026 (consumer, ~12pp)
module.exports = {
  id: "02",
  file: "Conveyancing-Cost-Guide-2026.pdf",
  category: "Cost Guide 2026",
  headerLabel: "Conveyancing Cost Guide 2026",
  icon: "pound",
  title: "The Conveyancing Cost Guide 2026",
  subtitle: "Every cost of moving, explained in plain English",
  coverBlurb:
    "What does conveyancing really cost in 2026 — and where does the money go? This guide breaks down legal fees, disbursements and Stamp Duty, shows worked examples at every price point, and points out the hidden costs to watch for.",
  coverFootCta: "Get your free quote at conveyquote.uk",
  pagesTarget: 12,
  blocks: [
    { type: "h1", text: "What conveyancing actually costs", icon: "pound" },
    { type: "lead", text: "For a straightforward residential purchase in England and Wales, total conveyancing costs usually land between £1,500 and £2,500 — before any Stamp Duty. Selling is generally cheaper, around £900 to £1,500." },
    { type: "para", text: "That total is made up of three very different things, and confusing them is how people end up surprised by the final bill. Knowing which is which lets you compare quotes properly." },
    { type: "table", widths: [26, 20, 54], headers: ["Component", "Who sets it", "What it is"], rows: [
      ["**Legal fee", "Your conveyancer", "The charge for their professional work. This is the part that varies between firms — and where VAT at 20% applies."],
      ["**Disbursements", "Third parties", "Costs your conveyancer pays on your behalf: searches, Land Registry, bank transfers. Broadly similar wherever you go."],
      ["**Stamp Duty", "HMRC", "A government tax on the purchase, not a fee. Often the largest single cost — and zero for many first-time buyers."],
    ] },
    { type: "callout", title: "The golden rule of comparing quotes", text: "Always compare the total including VAT and all disbursements — never the headline legal fee alone. A £450 quote with VAT and disbursements stripped out can cost more than an all-in £1,200 quote once everything is added back." },

    { type: "h1", text: "The full fee breakdown", icon: "coins" },
    { type: "para", text: "Here is what a typical purchase quote itemises. Your exact figures depend on the property price and type, but the shape is always the same." },
    { type: "table", widths: [34, 26, 40], headers: ["Line", "Typical amount", "Notes"], rows: [
      ["**Legal fee", "£900–£1,500 +VAT", "More for leasehold, new build or shared ownership"],
      ["**Local authority search", "£100–£250", "Reveals planning, roads and local issues"],
      ["**Water & drainage search", "£40–£70", "Confirms water supply and sewerage"],
      ["**Environmental search", "£40–£70", "Flood, contamination and ground stability"],
      ["**Land Registry fee", "£20–£910", "Scales with price; registers your ownership"],
      ["**Bank transfer (TT) fee", "£20–£45", "Sending completion funds securely"],
      ["**ID / AML checks", "£10–£20 each", "Identity and anti-money-laundering verification"],
      ["**Leasehold supplement", "£150–£350 +VAT", "Only if the property is leasehold"],
    ] },
    { type: "callout", title: "Why selling costs less", text: "When you sell, there are no searches to pay for and no Stamp Duty. You mainly pay the legal fee plus a few small disbursements — which is why a sale typically costs several hundred pounds less than a purchase of the same property." },

    { type: "h1", text: "Stamp Duty Land Tax in 2026", icon: "coins" },
    { type: "para", text: "Stamp Duty Land Tax (SDLT) is charged in bands — you pay each rate only on the portion of the price that falls within that band. These are the standard residential rates that apply from April 2025." },
    { type: "table", widths: [50, 50], headers: ["Portion of price", "Standard rate"], rows: [
      ["Up to £125,000", "0%"],
      ["£125,001 to £250,000", "2%"],
      ["£250,001 to £925,000", "5%"],
      ["£925,001 to £1.5 million", "10%"],
      ["Above £1.5 million", "12%"],
    ] },
    { type: "h2", text: "First-time buyer relief" },
    { type: "para", text: "If you are a first-time buyer and the price is £500,000 or less, you pay a reduced rate: nothing on the first £300,000, then 5% on anything above that. Above £500,000, the relief does not apply and the standard rates are used instead." },
    { type: "table", widths: [50, 50], headers: ["Portion of price (first-time buyer)", "Rate"], rows: [
      ["Up to £300,000", "0%"],
      ["£300,001 to £500,000", "5%"],
      ["Price above £500,000", "No relief — standard rates apply"],
    ] },

    { type: "h1", text: "Worked examples", icon: "doc" },
    { type: "para", text: "Here is the Stamp Duty on some common purchase prices, so you can see how the bands add up. 'Additional property' means a second home or buy-to-let, which carries a 5% surcharge on the whole price." },
    { type: "table", widths: [22, 26, 26, 26], headers: ["Price", "Standard buyer", "First-time buyer", "Additional property"], rows: [
      ["**£250,000", "£2,500", "£0", "£15,000"],
      ["**£300,000", "£5,000", "£0", "£20,000"],
      ["**£400,000", "£10,000", "£5,000", "£30,000"],
      ["**£500,000", "£15,000", "£10,000", "£40,000"],
      ["**£750,000", "£27,500", "£27,500", "£65,000"],
    ] },
    { type: "callout", title: "Two surcharges to know about", text: "If you're buying an additional residential property (a second home or buy-to-let), add 5% to every band. If you're not resident in the UK for tax purposes, add a further 2%. Both are charged on top of the standard rates shown above." },

    { type: "h1", text: "What it costs around the country", icon: "chart" },
    { type: "para", text: "Conveyancing legal fees vary by region, largely tracking property values and local overheads. The ranges below are general market context for a standard freehold purchase — not ConveyQuote prices, which are matched to your specific transaction rather than your postcode." },
    { type: "table", widths: [30, 30, 40], headers: ["Region", "Typical legal fee", "Notes"], rows: [
      ["**London & South East", "£1,200–£1,800 +VAT", "Higher values lift Land Registry fees and SDLT too"],
      ["**Midlands", "£950–£1,400 +VAT", "Often the best balance of price and service"],
      ["**North & Wales", "£850–£1,300 +VAT", "Lower averages, though leasehold flats cost more"],
    ] },
    { type: "callout", title: "Location matters less than you think", text: "Conveyancing is done by email, post and secure portals, so you are not limited to a local firm. A regulated conveyancer two counties away can serve you just as well — what matters is experience with your transaction type, not their postcode." },

    { type: "h1", text: "Hidden costs to watch for", icon: "shield" },
    { type: "para", text: "The gap between a tempting headline quote and the final bill is usually made of these. A good, reviewed quote includes the ones that apply to you from the start." },
    { type: "bullets", items: [
      "Leasehold management pack: £150–£800, paid to the freeholder or managing agent for the information your buyer's solicitor needs.",
      "Indemnity policies: one-off insurance (often £20–£300) used to cover minor legal defects, such as missing building regulations sign-off.",
      "Transaction supplements: extra charges for new build, shared ownership, Help to Buy, gifted deposits or a second mortgage.",
      "Expedited searches: paying a premium to jump the queue when a council's standard search turnaround is slow.",
      "Mortgage-related fees: some lenders charge their own fees, and your conveyancer may charge for acting for the lender.",
    ] },
    { type: "callout", title: "How to avoid the surprise", text: "Ask one question before you instruct anyone: 'Is this quote fixed, and does it already include every supplement for my transaction?' A firm that reviews your details before quoting — as ConveyQuote does — can answer yes." },

    { type: "h1", text: "Seven ways to keep costs down", icon: "check" },
    { type: "checklist", items: [
      "Compare the all-in total including VAT and disbursements, not the headline fee",
      "Get a fixed quote, not an estimate that can drift upward later",
      "Check that supplements for your transaction are already included",
      "Use your first-time buyer relief — it can save thousands in Stamp Duty",
      "Instruct quickly so you don't pay for expedited searches",
      "Line up your ID and proof of funds early to avoid delay-driven costs",
      "Don't auto-pick your lender's or estate agent's panel firm without comparing",
    ] },

    { type: "h1", text: "Common questions", icon: "doc" },
    { type: "h3", text: "Why are some quotes so much cheaper?" },
    { type: "para", text: "Usually because something has been left out — VAT, disbursements, or supplements that will be added once the work is under way. Compare the total, and read what's included." },
    { type: "h3", text: "Do I pay if the purchase falls through?" },
    { type: "para", text: "You won't owe the full fee, but you may have paid for searches or a survey already spent. Some firms charge a reduced abortive fee; ConveyQuote quotes are free and you only commit when you instruct." },
    { type: "h3", text: "Is Stamp Duty part of my conveyancing fee?" },
    { type: "para", text: "No. It's a separate tax paid to HMRC, which your conveyancer simply collects and forwards on completion. Budget for it separately using the worked examples above." },

    { type: "cta", heading: "See your exact figure", text: "Get a fixed, fully itemised conveyancing quote with a clear Stamp Duty estimate — reviewed before it reaches you. No hidden extras, no obligation.", url: "conveyquote.uk" },
  ],
};
