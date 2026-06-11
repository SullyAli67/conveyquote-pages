// Guide 8 — ConveyQuote Referral Program Overview (B2B, ~8pp)
module.exports = {
  id: "08",
  file: "ConveyQuote-Referral-Program-Overview.pdf",
  category: "Partner Guide · Platform Overview",
  headerLabel: "Referral Program Overview",
  icon: "chart",
  title: "ConveyQuote Referral Program",
  subtitle: "A quick tour of the platform and how to get started",
  coverBlurb:
    "A short overview of the ConveyQuote partner platform: what it does, how the dashboard and quote process work, how you track referrals and payments, and how to get up and running in minutes.",
  coverFootCta: "Apply at conveyquote.uk",
  pagesTarget: 8,
  blocks: [
    { type: "h1", text: "The platform at a glance", icon: "chart" },
    { type: "lead", text: "ConveyQuote is a conveyancing referral platform for estate agents, brokers and introducers. You refer a client in about two minutes; we produce a reviewed, fixed quote; an SRA-regulated panel firm does the work; and you earn on completion." },
    { type: "para", text: "Everything happens in one simple partner portal. No spreadsheets, no chasing, no paperwork — the platform handles quoting, tracking and payment records for you." },
    { type: "h3", text: "What the platform gives you" },
    { type: "bullets", items: [
      "Instant, itemised quote preview before anything is sent to your client",
      "Quotes reviewed by a real person and issued within one working day",
      "Live case tracking from instruction to completion",
      "A payments view showing exactly what you've earned, matter by matter",
      "Your personal note attached to every client quote",
    ] },

    { type: "h1", text: "Your dashboard", icon: "doc" },
    { type: "para", text: "The dashboard is the home of your referral business — your whole pipeline on one screen. At a glance you see referrals made this month, active matters, completed matters and fees earned, with every case listed below." },
    { type: "dashboard" },
    { type: "para", text: "Each row shows the client, the transaction type, the live case status, and the fee. Click any matter to see its full history and estimated completion date." },

    { type: "h1", text: "The quote process", icon: "doc" },
    { type: "para", text: "Referring takes about two minutes, and you see the quote before your client does." },
    { type: "processflow", steps: [
      { title: "Enter details", text: "Property & client basics" },
      { title: "Instant preview", text: "See the itemised quote" },
      { title: "We review & issue", text: "Sent with your note" },
      { title: "Track to completion", text: "Live status in the portal" },
    ] },
    { type: "callout", title: "Re-quote in two clicks", text: "If a purchase falls through, you don't start again. Reopen the matter, adjust the details, and send a fresh quote for the new property — the client and their history are already there." },

    { type: "h1", text: "Tracking and reporting", icon: "chart" },
    { type: "para", text: "Every referral carries a live case status — client care sent, searches ordered, enquiries raised, exchanged, completed — plus an estimated completion date where the solicitor has set one. The payments view lists what you've earned as cases complete, so reconciliation takes minutes, not email threads." },
    { type: "callout", title: "Always know where a case is", text: "When a client asks how their matter is progressing, you answer from the portal in seconds — without ringing anyone. That visibility is something agents and brokers almost never have, and it makes you better at your own job." },

    { type: "h1", text: "Support", icon: "shield" },
    { type: "para", text: "You get direct access to the team who run the platform — by email at info@conveyquote.uk and by phone on 07592 654 666, Monday to Friday, 9am to 5pm. New partners get a portal walkthrough and plain-English guidance for introducing the service to clients. No call centre, no ticket queue, no script." },

    { type: "h1", text: "Getting started", icon: "check" },
    { type: "checklist", items: [
      "Apply through the partner portal at conveyquote.uk — it takes a few minutes",
      "We confirm your commission rates in writing — no joining cost, no minimum volume",
      "You get portal access and a short walkthrough",
      "Make your first referral and see the quote preview instantly",
      "Track it to completion and watch your fees build in the payments view",
    ] },

    { type: "cta", heading: "Ready to start earning?", text: "Apply to join the ConveyQuote referral programme. No joining cost, no minimum volume, and your name on every introduction.", url: "conveyquote.uk" },
  ],
};
