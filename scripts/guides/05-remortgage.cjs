// Guide 5 — Remortgage Conveyancing Guide (consumer, ~10pp)
module.exports = {
  id: "05",
  file: "Remortgage-Conveyancing-Guide.pdf",
  category: "Remortgage Guide",
  headerLabel: "Remortgage Conveyancing Guide",
  icon: "doc",
  title: "The Remortgage Conveyancing Guide",
  subtitle: "The legal side of switching your mortgage, made simple",
  coverBlurb:
    "Remortgaging needs a solicitor too — but it's quicker, cheaper and simpler than buying. This guide explains why legal work is involved, how long it takes, what it costs, and what you need to have ready.",
  coverFootCta: "Get your free quote at conveyquote.uk",
  pagesTarget: 10,
  blocks: [
    { type: "h1", text: "Remortgaging? Here's the legal bit", icon: "doc" },
    { type: "lead", text: "A remortgage is when you switch your existing mortgage to a new deal — either with your current lender or a new one. If you're moving to a new lender, there's legal work involved, and that means a conveyancer." },
    { type: "para", text: "The good news: remortgage conveyancing is far lighter than buying a home. There's no chain, no negotiation, and often no survey beyond a basic valuation. Many remortgages complete in four to eight weeks, and some lenders even cover the legal cost for you." },
    { type: "callout", title: "Do you even need a solicitor?", text: "If you're staying with your current lender and simply moving to a new rate (a product transfer), usually no legal work is needed. If you're switching to a new lender, yes — they need a conveyancer to update the legal charge on your property." },

    { type: "h1", text: "Why a solicitor is needed", icon: "shield" },
    { type: "para", text: "When you move to a new lender, the old lender's legal interest in your property has to be removed and the new lender's registered in its place. That's legal work on the title, and only a conveyancer can do it." },
    { type: "h3", text: "What your conveyancer actually does" },
    { type: "bullets", items: [
      "Checks the legal title to your property and confirms you're entitled to remortgage",
      "Carries out searches or uses indemnity insurance where the lender allows it",
      "Redeems (pays off) your existing mortgage with the new funds",
      "Registers the new lender's charge at HM Land Registry",
      "Handles any transfer of equity if you're adding or removing someone from the deeds",
    ] },

    { type: "h1", text: "The remortgage timeline", icon: "clock" },
    { type: "para", text: "Most remortgages complete within four to eight weeks of your application. Starting early matters — ideally begin three months before your current deal ends, so you switch the moment it expires and avoid your lender's standard variable rate." },
    { type: "timeline", stages: [
      { n: 1, title: "Apply and instruct", dur: "Week 1", text: "Your mortgage offer is issued and a conveyancer is instructed — often from the lender's panel, though you can usually choose your own." },
      { n: 2, title: "Title check & searches", dur: "Weeks 2–4", text: "Your conveyancer reviews the title and carries out searches, or uses search indemnity insurance where the lender accepts it to save time." },
      { n: 3, title: "Report & sign", dur: "Weeks 4–6", text: "You receive a short report and the mortgage deed to sign. Far simpler than a purchase — there's no seller to wait on." },
      { n: 4, title: "Completion", dur: "Weeks 5–8", text: "The new mortgage funds redeem your old one, the new charge is registered, and any surplus is sent to you." },
    ] },

    { type: "h1", text: "What it costs", icon: "pound" },
    { type: "para", text: "Remortgage conveyancing is inexpensive, and frequently free to you. Many remortgage deals come with 'free legals' where the lender covers a basic conveyancing service. Here's the lie of the land." },
    { type: "table", widths: [34, 26, 40], headers: ["Cost", "Typical amount", "Notes"], rows: [
      ["**Legal fee", "£300–£600 +VAT", "Often £0 if your deal includes free legals"],
      ["**Searches / indemnity", "£20–£250", "Many lenders accept cheaper indemnity insurance"],
      ["**Land Registry fee", "£20–£140", "To register the new lender's charge"],
      ["**Bank transfer fee", "£20–£45", "Sending the redemption funds"],
      ["**Transfer of equity", "+£200–£400", "Only if changing who's on the title"],
    ] },
    { type: "callout", title: "Free legals vs cashback", text: "Lenders often offer either free conveyancing or a cash lump sum. Free legals use the lender's panel firm, which can be slower and less communicative. If you'd prefer to choose your own conveyancer, taking the cashback and paying for your own can be worth it." },

    { type: "h1", text: "Valuation, not a survey", icon: "house" },
    { type: "para", text: "Unlike buying, a remortgage doesn't usually need a full survey. Your new lender will carry out a valuation — often a quick desktop or drive-by assessment — purely to confirm the property is worth enough to lend against. You won't normally receive a detailed condition report, because you already know the property." },
    { type: "callout", title: "If your valuation comes in low", text: "A lower-than-expected valuation reduces how much you can borrow against the property (your loan-to-value), which can affect the rates available. If it happens, your broker can challenge it with evidence or look at alternative lenders." },

    { type: "h1", text: "Completion day", icon: "key" },
    { type: "para", text: "Remortgage completion is quiet — no keys, no moving van. The new funds simply pay off your old mortgage, and you start your new deal. Here's how to make it seamless." },
    { type: "checklist", items: [
      "Start the process about three months before your current deal ends",
      "Have your ID and latest mortgage statement ready for your conveyancer",
      "Reply quickly to your conveyancer's forms and the mortgage deed",
      "Confirm whether anyone is being added to or removed from the title",
      "Check the completion date lines up with the end of your current deal",
    ] },

    { type: "h1", text: "Common questions", icon: "doc" },
    { type: "h3", text: "How long does a remortgage take?" },
    { type: "para", text: "Typically four to eight weeks from application to completion. Product transfers with your existing lender can be near-instant, as no legal work is involved." },
    { type: "h3", text: "Can I choose my own conveyancer?" },
    { type: "para", text: "Usually yes, even on a free-legals deal — though using your own may mean forgoing the free service. Many people prefer their own conveyancer for better communication and speed." },
    { type: "h3", text: "Will I need new searches?" },
    { type: "para", text: "Sometimes. Many lenders accept search indemnity insurance instead of full searches on a remortgage, which is cheaper and faster. Your conveyancer will follow your lender's requirements." },

    { type: "cta", heading: "Switching your mortgage?", text: "Get a fixed, itemised remortgage conveyancing quote — reviewed before it reaches you, with no hidden extras. Quick, clear, and no obligation.", url: "conveyquote.uk" },
  ],
};
