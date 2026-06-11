// Guide 3 — Freehold vs Leasehold Complete Guide (consumer, ~14pp)
module.exports = {
  id: "03",
  file: "Freehold-vs-Leasehold-Complete-Guide.pdf",
  category: "Complete Guide",
  headerLabel: "Freehold vs Leasehold Complete Guide",
  icon: "house",
  title: "Freehold vs Leasehold",
  subtitle: "The complete guide to how you own your home",
  coverBlurb:
    "Freehold or leasehold is one of the most important things to understand before you buy — it affects what you own, what you pay each year, and how the conveyancing works. This guide explains both in plain English, with the costs and questions that matter.",
  coverFootCta: "Get your free quote at conveyquote.uk",
  pagesTarget: 14,
  blocks: [
    { type: "h1", text: "The question behind every purchase", icon: "house" },
    { type: "lead", text: "When you buy a home in England or Wales, you buy it in one of two ways: freehold or leasehold. It sounds like legal small print, but the difference shapes what you actually own, what you pay every year, and how long your purchase takes." },
    { type: "para", text: "Most houses are freehold and most flats are leasehold, but there are exceptions — and new-build estates have made the picture more complicated. This guide explains both, side by side, so you know exactly what you're taking on before you commit." },
    { type: "callout", title: "The one-line version", text: "Freehold: you own the building and the land it stands on, outright and forever. Leasehold: you own the right to live in the property for a fixed number of years, while someone else owns the building and land." },

    { type: "h1", text: "What is freehold?", icon: "key" },
    { type: "para", text: "As a freeholder, you own the property and the land it sits on with no time limit. There is no landlord above you, no lease to run down, and no ground rent or service charge to pay. You are responsible for maintaining the whole property yourself." },
    { type: "h3", text: "What freehold gives you" },
    { type: "bullets", items: [
      "Permanent ownership — nothing runs out and nothing reverts to anyone else",
      "No ground rent and no service charge to a freeholder",
      "Freedom to alter, extend or improve, subject only to planning and building rules",
      "Full responsibility for repairs, insurance and maintenance",
    ] },
    { type: "callout", title: "Watch for: freehold with a service charge", text: "On some modern estates, freehold homes still pay an estate management charge for shared roads, play areas or green space. It behaves like a service charge even though you own the freehold — ask what it covers and how it can rise." },

    { type: "h1", text: "What is leasehold?", icon: "doc" },
    { type: "para", text: "As a leaseholder, you own the property for the length of the lease — often 99, 125 or 999 years from when it was first granted — but not the building or land. The freeholder retains those, and you typically pay ground rent and a service charge, and must follow the terms of the lease." },
    { type: "h3", text: "The four things that define a lease" },
    { type: "bullets", items: [
      "Lease length: how many years remain. Below about 80 years, extending becomes markedly more expensive.",
      "Ground rent: an annual charge to the freeholder, though new long residential leases now have it set at a peppercorn (effectively nil).",
      "Service charge: your share of maintaining the building and shared areas, billed annually and variable.",
      "Lease terms: rules on subletting, pets, alterations and more, which you are legally bound to follow.",
    ] },
    { type: "callout", title: "The 80-year rule", text: "If a lease drops below 80 years, the cost of extending it jumps because of an extra payment called marriage value. Many lenders are also wary of short leases. If you're buying leasehold, always check the remaining term — it is one of the first things your conveyancer will report on." },

    { type: "h1", text: "Freehold vs leasehold at a glance", icon: "doc" },
    { type: "table", widths: [24, 38, 38], headers: ["", "Freehold", "Leasehold"], rows: [
      ["**What you own", "Building and land, outright", "The property for the lease term"],
      ["**Duration", "Permanent", "Fixed years, counting down"],
      ["**Ground rent", "None", "Sometimes — peppercorn on new leases"],
      ["**Service charge", "Usually none*", "Yes, billed annually and variable"],
      ["**Maintenance", "All yours", "Shared, arranged by the freeholder/agent"],
      ["**Alterations", "Your choice, within the rules", "Often need freeholder consent"],
      ["**Typical property", "Houses", "Flats and some new-build houses"],
      ["**Selling", "Generally simpler", "More paperwork; lease length matters"],
    ] },
    { type: "para", text: "*Except on managed estates, where a freehold home may still pay an estate charge.", size: 9.5, color: "#667085" },

    { type: "h1", text: "The cost differences", icon: "coins" },
    { type: "para", text: "Leasehold carries ongoing costs that freehold usually doesn't. None of these are deal-breakers on their own, but you should know the numbers before you commit — and factor them into what you can afford." },
    { type: "table", widths: [30, 30, 40], headers: ["Cost", "Typical range", "What to check"], rows: [
      ["**Ground rent", "£0–£400/year", "Is it fixed, or does it escalate over time?"],
      ["**Service charge", "£1,000–£3,000+/year", "What it covers, and its recent history of rises"],
      ["**Major works", "Occasional, can be £000s", "Any planned works that you'd contribute to"],
      ["**Lease extension", "£0 to many £000s", "Cheaper the longer the remaining term"],
      ["**Consent fees", "£50–£300 each", "Charged by the freeholder for permissions"],
    ] },
    { type: "callout", title: "Ask for the figures in writing", text: "Before you exchange on a leasehold property, your conveyancer obtains a management pack showing the actual ground rent, service charge history and any planned major works. Read it carefully — a low headline price with a £4,000 service charge is a very different deal." },

    { type: "h1", text: "Legal implications", icon: "shield" },
    { type: "para", text: "Because a lease is a contract, it carries obligations on both sides. Most are reasonable, but some older or poorly drafted leases contain terms worth understanding before you buy." },
    { type: "bullets", items: [
      "You must pay ground rent and service charges on time — persistent non-payment can, in extreme cases, put the lease at risk.",
      "You usually need the freeholder's consent to make structural alterations, sublet, or keep certain pets.",
      "The freeholder must maintain the building and common parts, and account for how your service charge is spent.",
      "You may have rights to extend your lease, buy the freehold jointly with neighbours, or take over management — collectively known as enfranchisement.",
    ] },

    { type: "h1", text: "How the conveyancing differs", icon: "clock" },
    { type: "para", text: "Buying leasehold involves real extra legal work, which is why it costs a little more and takes a little longer. Here are the additional steps a leasehold purchase adds on top of a standard freehold one." },
    { type: "timeline", stages: [
      { n: 1, title: "Obtain the management pack", dur: "The slowest step", text: "Your conveyancer requests the leasehold information pack from the freeholder or managing agent. It can take weeks and carries a fee — order it as early as possible." },
      { n: 2, title: "Review the lease", dur: "Within the purchase", text: "Your conveyancer reads the lease in full: term remaining, ground rent, service charge, and any restrictive terms, then reports anything that should concern you." },
      { n: 3, title: "Raise leasehold enquiries", dur: "Pre-contract", text: "Extra enquiries go to the freeholder and managing agent about charges, disputes, planned works and building safety." },
      { n: 4, title: "Notice and registration", dur: "After completion", text: "After completion, your conveyancer serves notice on the freeholder and registers your leasehold ownership at HM Land Registry." },
    ] },
    { type: "callout", title: "Building safety since Grenfell", text: "For flats in larger buildings, your conveyancer may need information on cladding and fire safety. This protects you, but can add time. Asking the seller's agent about an EWS1 form early can save weeks later." },

    { type: "h1", text: "Leasehold reform: the direction of travel", icon: "doc" },
    { type: "para", text: "Leasehold has been the subject of major reform. New residential long leases now have ground rent set at a peppercorn, and legislation has aimed to make extending leases and buying freeholds cheaper and simpler over time." },
    { type: "para", text: "The detail continues to evolve, and not every change applies to every existing lease at once. The practical takeaway for a buyer today: check the specific terms of the lease in front of you, and ask your conveyancer how any current rules affect it — rather than relying on general headlines." },

    { type: "h1", text: "When to choose each", icon: "check" },
    { type: "h3", text: "Freehold tends to suit you if" },
    { type: "bullets", items: [
      "You want full control and no ongoing charges to a third party",
      "You're buying a house and don't need shared services",
      "You'd rather manage and budget for maintenance yourself",
    ] },
    { type: "h3", text: "Leasehold can work well if" },
    { type: "bullets", items: [
      "You're buying a flat, where shared maintenance is unavoidable and sensible",
      "The lease is long (ideally well over 100 years) with low or peppercorn ground rent",
      "The service charge is reasonable and the building well managed",
    ] },

    { type: "h1", text: "Common questions", icon: "doc" },
    { type: "h3", text: "Can I buy the freehold of my leasehold flat?" },
    { type: "para", text: "Often, yes — usually jointly with the other leaseholders in the building, through a legal process called collective enfranchisement. Your conveyancer can advise whether you qualify and what it involves." },
    { type: "h3", text: "Is a short lease a deal-breaker?" },
    { type: "para", text: "Not necessarily, but it affects value and mortgageability, and extending costs more once it drops below 80 years. If you're buying a short lease, factor the extension cost into your offer." },
    { type: "h3", text: "Why is my leasehold conveyancing taking longer?" },
    { type: "para", text: "Almost always the management pack. It depends on a third party — the managing agent — and is the single most common cause of delay in a leasehold purchase. Ordering it early is the best fix." },
    { type: "h3", text: "Do freehold houses ever have charges?" },
    { type: "para", text: "Yes — on managed estates, freehold homes can pay an estate rentcharge for communal areas. Ask what it covers and how it can increase before you buy." },

    { type: "cta", heading: "Buying freehold or leasehold?", text: "Either way, get a fixed, itemised conveyancing quote that already accounts for your property type — reviewed before it reaches you, with no hidden leasehold surprises.", url: "conveyquote.uk" },
  ],
};
