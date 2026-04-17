import { buildQuoteData } from "../lib/calculate-quote.js";

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const safe = (value) =>
  value === null || value === undefined || value === ""
    ? "Not provided"
    : String(value);

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const prettifyValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  const str = String(value).trim();
  if (!str) return "Not provided";

  const lower = str.toLowerCase();

  if (lower === "yes") return "Yes";
  if (lower === "no") return "No";
  if (lower === "mortgage") return "Mortgage";
  if (lower === "cash") return "Cash";
  if (lower === "joint") return "Joint";
  if (lower === "individual") return "Individual";
  if (lower === "company") return "Company";
  if (lower === "one") return "One owner";
  if (lower === "two") return "Two owners";
  if (lower === "more") return "More than two owners";
  if (str === "1") return "1 seller";
  if (str === "2") return "2 sellers";
  if (str === "3") return "3 or more sellers";

  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "Not provided";

  return `£${num.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const row = (label, value) => `
  <tr>
    <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;width:35%;vertical-align:top;">
      ${escapeHtml(label)}
    </td>
    <td style="padding:10px 12px;border:1px solid #d9d9d9;vertical-align:top;">
      ${escapeHtml(value)}
    </td>
  </tr>
`;

const sectionTable = (title, rows) => `
  <h3 style="margin:24px 0 10px 0;color:#0f2747;">${escapeHtml(title)}</h3>
  <table style="border-collapse:collapse;width:100%;margin-bottom:18px;">
    ${rows.join("")}
  </table>
`;

const getTransactionLabel = (type) => {
  if (type === "purchase") return "Purchase";
  if (type === "sale") return "Sale";
  if (type === "sale_purchase") return "Sale and Purchase";
  if (type === "remortgage") return "Remortgage";
  if (type === "transfer") return "Transfer of Equity";
  if (type === "remortgage_transfer") {
    return "Remortgage and Transfer of Equity";
  }
  return "Quote Request";
};


const getExistingEnquiryColumns = async (db) => {
  const result = await db.prepare(`PRAGMA table_info(enquiries)`).all();
  const rows = Array.isArray(result?.results) ? result.results : [];
  return new Set(rows.map((row) => String(row.name)));
};

const insertEnquiryRow = async (db, row) => {
  const existingColumns = await getExistingEnquiryColumns(db);
  const entries = Object.entries(row).filter(([key]) => existingColumns.has(key));

  if (entries.length === 0) {
    throw new Error("The enquiries table could not be inspected or has no matching columns.");
  }

  const columns = entries.map(([key]) => key);
  const values = entries.map(([, value]) => value);
  const placeholders = entries.map(() => "?").join(",");

  await db
    .prepare(
      `INSERT INTO enquiries (${columns.join(", ")}) VALUES (${placeholders})`
    )
    .bind(...values)
    .run();
};

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();

    const {
      name,
      email,
      phone,
      type,
      consentToPanel,

      tenure,
      price,
      postcode,

      mortgage,
      lender,
      ownershipType,
      firstTimeBuyer,
      newBuild,
      sharedOwnership,
      helpToBuy,
      isCompany,
      buyToLet,
      giftedDeposit,
      additionalProperty,
      ukResidentForSdlt,
      lifetimeIsa,
      rightToBuy,

      saleMortgage,
      managementCompany,
      tenanted,
      numberOfSellers,

      currentLender,
      newLender,
      additionalBorrowing,
      remortgageTransfer,

      transferMortgage,
      ownersChanging,

      saleTenure,
      salePrice,
      salePostcode,
      saleMortgageCombined,
      managementCompanyCombined,
      tenantedCombined,
      numberOfSellersCombined,

      purchaseTenure,
      purchasePrice,
      purchasePostcode,
      purchaseMortgage,
      purchaseLender,
      purchaseOwnershipType,
      purchaseFirstTimeBuyer,
      purchaseNewBuild,
      purchaseSharedOwnership,
      purchaseHelpToBuy,
      purchaseIsCompany,
      purchaseBuyToLet,
      purchaseGiftedDeposit,
      purchaseAdditionalProperty,
      purchaseUkResidentForSdlt,
      purchaseLifetimeIsa,

      remortgageTransferTenure,
      remortgageTransferPrice,
      remortgageTransferPostcode,
      remortgageTransferCurrentLender,
      remortgageTransferNewLender,
      remortgageTransferAdditionalBorrowing,
      remortgageTransferHasMortgage,
      remortgageTransferOwnersChanging,
      remortgageTransferOwnershipType,
    } = body;

    // Lender is preferred but not required - reviewer will confirm lender eligibility

    const prettyType = getTransactionLabel(type);

    const now = new Date();
    const reference = `CQ-${now.getFullYear()}${String(
      now.getMonth() + 1
    ).padStart(2, "0")}${String(now.getDate()).padStart(
      2,
      "0"
    )}-${Math.floor(1000 + Math.random() * 9000)}`;

    const quote = buildQuoteData(body);
    const quoteJson = JSON.stringify(quote);

    const enquiryRow = {
      reference,
      client_name: name || "",
      client_email: email || "",
      client_phone: phone || "",
      transaction_type: type || "",
      consent_to_panel: consentToPanel ? "yes" : "no",

      tenure: tenure || "",
      price: price || "",
      postcode: postcode || "",

      mortgage: mortgage || "",
      lender: lender || "",
      ownership_type: ownershipType || "",
      first_time_buyer: firstTimeBuyer || "",
      new_build: newBuild || "",
      shared_ownership: sharedOwnership || "",
      help_to_buy: helpToBuy || "",
      is_company: isCompany || "",
      buy_to_let: buyToLet || "",
      gifted_deposit: giftedDeposit || "",
      additional_property: additionalProperty || "",
      uk_resident_for_sdlt: ukResidentForSdlt || "",
      lifetime_isa: lifetimeIsa || "",
      right_to_buy: rightToBuy || "",

      sale_mortgage: saleMortgage || "",
      management_company: managementCompany || "",
      tenanted: tenanted || "",
      number_of_sellers: numberOfSellers || "",

      current_lender: currentLender || "",
      new_lender: newLender || "",
      additional_borrowing: additionalBorrowing || "",
      remortgage_transfer: remortgageTransfer || "",
      transfer_mortgage: transferMortgage || "",
      owners_changing: ownersChanging || "",

      sale_tenure: saleTenure || "",
      sale_price: salePrice || "",
      sale_postcode: salePostcode || "",
      sale_mortgage_combined: saleMortgageCombined || "",
      management_company_combined: managementCompanyCombined || "",
      tenanted_combined: tenantedCombined || "",
      number_of_sellers_combined: numberOfSellersCombined || "",

      purchase_tenure: purchaseTenure || "",
      purchase_price: purchasePrice || "",
      purchase_postcode: purchasePostcode || "",
      purchase_mortgage: purchaseMortgage || "",
      purchase_lender: purchaseLender || "",
      purchase_ownership_type: purchaseOwnershipType || "",
      purchase_first_time_buyer: purchaseFirstTimeBuyer || "",
      purchase_new_build: purchaseNewBuild || "",
      purchase_shared_ownership: purchaseSharedOwnership || "",
      purchase_help_to_buy: purchaseHelpToBuy || "",
      purchase_is_company: purchaseIsCompany || "",
      purchase_buy_to_let: purchaseBuyToLet || "",
      purchase_gifted_deposit: purchaseGiftedDeposit || "",
      purchase_additional_property: purchaseAdditionalProperty || "",
      purchase_uk_resident_for_sdlt: purchaseUkResidentForSdlt || "",
      purchase_lifetime_isa: purchaseLifetimeIsa || "",

      remortgage_transfer_tenure: remortgageTransferTenure || "",
      remortgage_transfer_price: remortgageTransferPrice || "",
      remortgage_transfer_postcode: remortgageTransferPostcode || "",
      remortgage_transfer_current_lender:
        remortgageTransferCurrentLender || "",
      remortgage_transfer_new_lender: remortgageTransferNewLender || "",
      remortgage_transfer_additional_borrowing:
        remortgageTransferAdditionalBorrowing || "",
      remortgage_transfer_has_mortgage:
        remortgageTransferHasMortgage || "",
      remortgage_transfer_owners_changing:
        remortgageTransferOwnersChanging || "",
      remortgage_transfer_ownership_type:
        remortgageTransferOwnershipType || "",

      status: "new",
      quote_json: JSON.stringify({ ...body, ...quote }),
    };

    await insertEnquiryRow(env.DB, enquiryRow);

    const adminUrl = `https://conveyquote.uk/admin/?ref=${reference}`;

    const summaryRows = [
      row("Reference", reference),
      row("Transaction type", prettyType),
      row("Client", safe(name)),
      row("Email", safe(email)),
      row("Phone", safe(phone)),
      row("Consent to panel", consentToPanel ? "Yes" : "No"),
      row(
        "Estimated legal + disbursement total",
        formatMoney(quote.grandTotal)
      ),
      ...(typeof quote.sdltAmount === "number"
        ? [row("Estimated SDLT", formatMoney(quote.sdltAmount))]
        : quote.sdltNote
        ? [row("SDLT", quote.sdltNote)]
        : []),
      ...(typeof quote.totalIncludingSdlt === "number"
        ? [row("Total including SDLT", formatMoney(quote.totalIncludingSdlt))]
        : []),
    ];

    let matterSections = "";

    if (type === "purchase") {
      matterSections += sectionTable("Purchase Details", [
        row("Tenure", prettifyValue(tenure)),
        row("Price", formatMoney(price)),
        row("Postcode", safe(postcode)),
        row("Mortgage or cash", prettifyValue(mortgage)),
        row(
          "Lender",
          mortgage === "mortgage" ? safe(lender) : "Not applicable"
        ),
        row("Buyer type", prettifyValue(ownershipType)),
        row("First time buyer", prettifyValue(firstTimeBuyer)),
        row("Additional property", prettifyValue(additionalProperty)),
        row("UK resident for SDLT", prettifyValue(ukResidentForSdlt)),
        row("Buy to let", prettifyValue(buyToLet)),
        row("New build", prettifyValue(newBuild)),
        row("Shared ownership", prettifyValue(sharedOwnership)),
        row("Help to Buy / scheme", prettifyValue(helpToBuy)),
        row("Buying via company", prettifyValue(isCompany)),
        row("Gifted deposit", prettifyValue(giftedDeposit)),
        row("Lifetime ISA", prettifyValue(lifetimeIsa)),
        row("Right to Buy", prettifyValue(rightToBuy)),
      ]);
    }

    if (type === "sale") {
      matterSections += sectionTable("Sale Details", [
        row("Tenure", prettifyValue(tenure)),
        row("Price", formatMoney(price)),
        row("Postcode", safe(postcode)),
        row("Mortgage to redeem", prettifyValue(saleMortgage)),
        row(
          "Management company / service charge",
          prettifyValue(managementCompany)
        ),
        row("Number of sellers", prettifyValue(numberOfSellers)),
        row("Tenanted", prettifyValue(tenanted)),
      ]);
    }

    if (type === "sale_purchase") {
      matterSections += sectionTable("Sale Details", [
        row("Sale tenure", prettifyValue(saleTenure)),
        row("Sale price", formatMoney(salePrice)),
        row("Sale postcode", safe(salePostcode)),
        row("Mortgage to redeem", prettifyValue(saleMortgageCombined)),
        row(
          "Management company / service charge",
          prettifyValue(managementCompanyCombined)
        ),
        row("Number of sellers", prettifyValue(numberOfSellersCombined)),
        row("Tenanted", prettifyValue(tenantedCombined)),
      ]);

      matterSections += sectionTable("Purchase Details", [
        row("Purchase tenure", prettifyValue(purchaseTenure)),
        row("Purchase price", formatMoney(purchasePrice)),
        row("Purchase postcode", safe(purchasePostcode)),
        row("Mortgage or cash", prettifyValue(purchaseMortgage)),
        row(
          "Purchase lender",
          purchaseMortgage === "mortgage"
            ? safe(purchaseLender)
            : "Not applicable"
        ),
        row("Buyer type", prettifyValue(purchaseOwnershipType)),
        row("First time buyer", prettifyValue(purchaseFirstTimeBuyer)),
        row("Additional property", prettifyValue(purchaseAdditionalProperty)),
        row(
          "UK resident for SDLT",
          prettifyValue(purchaseUkResidentForSdlt)
        ),
        row("Buy to let", prettifyValue(purchaseBuyToLet)),
        row("New build", prettifyValue(purchaseNewBuild)),
        row("Shared ownership", prettifyValue(purchaseSharedOwnership)),
        row("Help to Buy / scheme", prettifyValue(purchaseHelpToBuy)),
        row("Buying via company", prettifyValue(purchaseIsCompany)),
        row("Gifted deposit", prettifyValue(purchaseGiftedDeposit)),
        row("Lifetime ISA", prettifyValue(purchaseLifetimeIsa)),
      ]);
    }

    if (type === "remortgage") {
      matterSections += sectionTable("Remortgage Details", [
        row("Tenure", prettifyValue(tenure)),
        row("Property value", formatMoney(price)),
        row("Postcode", safe(postcode)),
        row("Current lender", safe(currentLender)),
        row("New lender", safe(newLender)),
        row("Additional borrowing", prettifyValue(additionalBorrowing)),
        row(
          "Transfer of equity at same time",
          prettifyValue(remortgageTransfer)
        ),
        row("Ownership type", prettifyValue(ownershipType)),
      ]);
    }

    if (type === "transfer") {
      matterSections += sectionTable("Transfer of Equity Details", [
        row("Tenure", prettifyValue(tenure)),
        row("Property value", formatMoney(price)),
        row("Postcode", safe(postcode)),
        row("Mortgage on property", prettifyValue(transferMortgage)),
        row("Owners changing", prettifyValue(ownersChanging)),
      ]);
    }

    if (type === "remortgage_transfer") {
      matterSections += sectionTable("Property Details", [
        row("Tenure", prettifyValue(remortgageTransferTenure)),
        row("Property value", formatMoney(remortgageTransferPrice)),
        row("Postcode", safe(remortgageTransferPostcode)),
      ]);

      matterSections += sectionTable("Remortgage Details", [
        row("Current lender", safe(remortgageTransferCurrentLender)),
        row("New lender", safe(remortgageTransferNewLender)),
        row(
          "Additional borrowing",
          prettifyValue(remortgageTransferAdditionalBorrowing)
        ),
        row(
          "Ownership type",
          prettifyValue(remortgageTransferOwnershipType)
        ),
      ]);

      matterSections += sectionTable("Transfer of Equity Details", [
        row(
          "Mortgage on property",
          prettifyValue(remortgageTransferHasMortgage)
        ),
        row(
          "Owners changing",
          prettifyValue(remortgageTransferOwnersChanging)
        ),
      ]);
    }

    const feeBreakdownHtml = escapeHtml(quote.feeBreakdown || "").replace(
      /\n/g,
      "<br>"
    );

    const internalHtml = `
      <html>
        <body style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f8;padding:24px;color:#10233f;">
          <div style="max-width:860px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dfe5ec;">
            <div style="padding:24px 28px;background:#10233f;color:#ffffff;">
              <h2 style="margin:0 0 8px 0;">New Quote Enquiry</h2>
              <p style="margin:0;font-size:14px;">Reference: ${escapeHtml(
                reference
              )}</p>
            </div>

            <div style="padding:24px 28px;">
              <p style="margin-top:0;">
                A new enquiry has been submitted and saved. Use the admin link
                below to review and approve the client-facing quote.
              </p>

              <p style="margin:18px 0 24px 0;">
                <a
                  href="${escapeHtml(adminUrl)}"
                  style="display:inline-block;padding:12px 18px;background:#10233f;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;"
                >
                  Review Quote in Admin
                </a>
              </p>

              ${sectionTable("Enquiry Summary", summaryRows)}

              ${matterSections}

              <h3 style="margin:24px 0 10px 0;color:#0f2747;">System Quote Breakdown</h3>
              <div style="padding:16px;border:1px solid #d9d9d9;background:#fbfbfb;white-space:normal;line-height:1.6;">
                ${feeBreakdownHtml}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send notification email - awaited so failures are caught and reported
    let emailSent = false;

    if (env.RESEND_API_KEY) {
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "ConveyQuote <quotes@conveyquote.uk>",
          to: ["info@conveyquote.uk"],
          reply_to: email || undefined,
          subject: `New Quote - ${prettyType} - ${reference}`,
          html: internalHtml,
        }),
      });

      const resendText = await resendResponse.text();

      if (!resendResponse.ok) {
        throw new Error(
          `Resend email failed: ${resendResponse.status} ${resendText}`
        );
      }

      emailSent = true;
    }

    // Send client-facing quote email if we have their email address
    if (env.RESEND_API_KEY && email) {
      const acceptUrl = `https://conveyquote.uk/api/accept-quote?ref=${encodeURIComponent(reference)}`;
      const fmt = (v) => `£${Number(v || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const prettifyTenure = (t) =>
        t === "leasehold" ? "Leasehold" : t === "freehold" ? "Freehold" : (t || "Not provided");

      const prettifyTypeShort = (t) => {
        if (t === "purchase") return "Purchase";
        if (t === "sale") return "Sale";
        if (t === "sale_purchase") return "Sale &amp; Purchase";
        if (t === "remortgage") return "Remortgage";
        if (t === "transfer") return "Transfer of Equity";
        if (t === "remortgage_transfer") return "Remortgage &amp; Transfer";
        return t || "Conveyancing";
      };

      const legalFeeRows = (quote.legalFees || []).map((f) =>
        `<tr>
          <td style="padding:9px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#374151;">${escapeHtml(f.label || "Legal fee")}</td>
          <td style="padding:9px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#111827;font-weight:600;text-align:right;">${fmt(f.amount)}</td>
        </tr>`
      ).join("");

      const vatRow = quote.vat > 0
        ? `<tr>
            <td style="padding:9px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#374151;">VAT (20%)</td>
            <td style="padding:9px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#111827;font-weight:600;text-align:right;">${fmt(quote.vat)}</td>
          </tr>`
        : "";

      const legalTotalRow = `<tr>
        <td style="padding:9px 0;border-bottom:2px solid #e5e7eb;font-size:14px;color:#0f2747;font-weight:700;">Total legal fees (inc. VAT)</td>
        <td style="padding:9px 0;border-bottom:2px solid #e5e7eb;font-size:14px;color:#0f2747;font-weight:700;text-align:right;">${fmt(quote.legalTotalInclVat)}</td>
      </tr>`;

      const disbursementRows = (quote.disbursements || []).map((d) =>
        `<tr>
          <td style="padding:9px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#6b7280;">${escapeHtml(d.label || "Disbursement")}${d.note ? ` <span style="font-size:12px;">(${escapeHtml(d.note)})</span>` : ""}</td>
          <td style="padding:9px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#374151;font-weight:600;text-align:right;">${fmt(d.amount)}</td>
        </tr>`
      ).join("");

      const disbTotalRow = quote.disbursementTotal > 0
        ? `<tr>
            <td style="padding:9px 0;border-bottom:2px solid #e5e7eb;font-size:14px;color:#0f2747;font-weight:700;">Total disbursements</td>
            <td style="padding:9px 0;border-bottom:2px solid #e5e7eb;font-size:14px;color:#0f2747;font-weight:700;text-align:right;">${fmt(quote.disbursementTotal)}</td>
          </tr>`
        : "";

      const sdltSection = typeof quote.sdltAmount === "number"
        ? `<tr>
            <td style="padding:9px 0;font-size:14px;color:#374151;">Estimated Stamp Duty (SDLT) <span style="font-size:12px;color:#9ca3af;">— paid to HMRC separately</span></td>
            <td style="padding:9px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${fmt(quote.sdltAmount)}</td>
          </tr>`
        : (quote.sdltNote
          ? `<tr>
              <td style="padding:9px 0;font-size:14px;color:#374151;">Stamp Duty (SDLT)</td>
              <td style="padding:9px 0;font-size:14px;color:#6b7280;text-align:right;">${escapeHtml(quote.sdltNote)}</td>
            </tr>`
          : "");

      const grandTotal = quote.totalIncludingSdlt ?? quote.grandTotal ?? 0;

      // Primary display price (used in matter summary — price or property value)
      const displayPrice = price || purchasePrice || salePrice || remortgageTransferPrice || "";
      const displayTenure = tenure || saleTenure || purchaseTenure || remortgageTransferTenure || "";
      const displayLender = lender || purchaseLender || remortgageTransferNewLender || "";

      const matterSummaryRows = [
        displayPrice ? `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#6b7280;width:40%;">Property price / value</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#111827;font-weight:600;">${fmt(displayPrice)}</td>
        </tr>` : "",
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#6b7280;">Transaction type</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#111827;font-weight:600;">${prettifyTypeShort(type)}</td>
        </tr>`,
        displayTenure ? `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#6b7280;">Tenure</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f2f5;font-size:14px;color:#111827;font-weight:600;">${prettifyTenure(displayTenure)}</td>
        </tr>` : "",
        (type === "purchase" || type === "sale_purchase") ? `<tr>
          <td style="padding:8px 0;${displayLender ? "border-bottom:1px solid #f0f2f5;" : ""}font-size:14px;color:#6b7280;">Mortgage</td>
          <td style="padding:8px 0;${displayLender ? "border-bottom:1px solid #f0f2f5;" : ""}font-size:14px;color:#111827;font-weight:600;">${mortgage === "mortgage" ? "Yes" : "No (cash purchase)"}</td>
        </tr>` : "",
        displayLender ? `<tr>
          <td style="padding:8px 0;font-size:14px;color:#6b7280;">Lender</td>
          <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${escapeHtml(displayLender)}</td>
        </tr>` : "",
      ].filter(Boolean).join("");

      const clientQuoteHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Your Conveyancing Quote — ${escapeHtml(reference)}</title>
</head>
<body style="margin:0;padding:0;background:#f2f4f7;font-family:Arial,Helvetica,sans-serif;color:#222;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f7;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding:0 0 16px 0;">
              <img src="https://conveyquote.uk/logo.png" alt="ConveyQuote" width="100"
                style="display:block;width:100px;height:auto;border:0;" />
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

                <!-- Header -->
                <tr>
                  <td style="background:#0f2747;padding:28px 32px;">
                    <div style="font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:rgba(255,255,255,0.7);">ConveyQuote</div>
                    <h1 style="color:#ffffff;margin:8px 0 6px;font-size:26px;line-height:1.2;">Your Conveyancing Estimate</h1>
                    <p style="color:rgba(255,255,255,0.8);margin:0;font-size:14px;">Reference: <strong>${escapeHtml(reference)}</strong></p>
                  </td>
                </tr>

                <!-- Greeting -->
                <tr>
                  <td style="padding:24px 32px 0 32px;">
                    <p style="margin:0 0 10px;font-size:15px;color:#222;">Dear ${escapeHtml(name || "there")},</p>
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#4b5563;">
                      Thank you for your enquiry. Please find your conveyancing estimate below.
                      This estimate is based on the information currently available and may be subject
                      to change if further details come to light.
                    </p>
                  </td>
                </tr>

                <!-- Matter Summary -->
                <tr>
                  <td style="padding:20px 32px 0 32px;">
                    <h2 style="margin:0 0 12px;font-size:16px;color:#0f2747;border-bottom:2px solid #0f2747;padding-bottom:6px;">Matter Summary</h2>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                      ${matterSummaryRows}
                    </table>
                  </td>
                </tr>

                <!-- Total highlight -->
                <tr>
                  <td style="padding:20px 32px 0 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                      style="background:#f8fafc;border:1px solid #d9e2ec;border-radius:8px;">
                      <tr>
                        <td style="padding:18px 20px;text-align:center;">
                          <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.4px;color:#486581;margin-bottom:6px;">Total Estimated Cost</div>
                          <div style="font-size:32px;font-weight:700;color:#0f2747;">${fmt(grandTotal)}</div>
                          <div style="font-size:13px;color:#52606d;margin-top:6px;">
                            ${typeof quote.sdltAmount === "number" ? "Including VAT, disbursements and estimated SDLT" : "Including VAT and disbursements"}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Legal Fees -->
                <tr>
                  <td style="padding:20px 32px 0 32px;">
                    <h2 style="margin:0 0 12px;font-size:16px;color:#0f2747;border-bottom:2px solid #0f2747;padding-bottom:6px;">Legal Fees</h2>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${legalFeeRows}
                      ${vatRow}
                      ${legalTotalRow}
                    </table>
                  </td>
                </tr>

                <!-- Disbursements -->
                ${disbursementRows ? `<tr>
                  <td style="padding:20px 32px 0 32px;">
                    <h2 style="margin:0 0 6px;font-size:16px;color:#0f2747;border-bottom:2px solid #0f2747;padding-bottom:6px;">Disbursements</h2>
                    <p style="margin:0 0 10px;font-size:12px;color:#9ca3af;">Third-party costs paid on your behalf during the transaction.</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${disbursementRows}
                      ${disbTotalRow}
                    </table>
                  </td>
                </tr>` : ""}

                <!-- SDLT -->
                ${sdltSection ? `<tr>
                  <td style="padding:16px 32px 0 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${sdltSection}
                    </table>
                  </td>
                </tr>` : ""}

                <!-- Grand total bar -->
                <tr>
                  <td style="padding:20px 32px 0 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                      style="background:#0f2747;border-radius:8px;">
                      <tr>
                        <td style="padding:14px 20px;font-size:15px;color:#ffffff;font-weight:700;">Total Estimated Cost</td>
                        <td style="padding:14px 20px;font-size:18px;color:#ffffff;font-weight:700;text-align:right;">${fmt(grandTotal)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Important note -->
                <tr>
                  <td style="padding:16px 32px 0 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                      style="background:#fff8e6;border:1px solid #e2c275;border-radius:8px;">
                      <tr>
                        <td style="padding:14px 16px;font-size:13px;line-height:1.7;color:#7a4b00;">
                          <strong>Important:</strong> This is an indicative estimate based on the information you have provided.
                          Final costs will be confirmed in writing by the instructed solicitor.
                          If the matter proves more complex than anticipated, any change in costs will be discussed with you first.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Accept button -->
                <tr>
                  <td align="center" style="padding:28px 32px 12px 32px;">
                    <a href="${acceptUrl}"
                      style="display:inline-block;background:#0f2747;color:#ffffff;text-decoration:none;
                             padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;">
                      Accept This Quote &amp; Proceed
                    </a>
                  </td>
                </tr>

                <!-- Next steps -->
                <tr>
                  <td style="padding:0 32px 20px 32px;">
                    <p style="margin:0 0 4px;font-size:13px;color:#6b7280;text-align:center;">
                      By accepting, we will allocate your matter to a suitable panel solicitor firm and be in touch shortly.
                    </p>
                  </td>
                </tr>

                <!-- Contact -->
                <tr>
                  <td style="padding:0 32px 24px 32px;text-align:center;font-size:13px;color:#6b7280;">
                    Questions? Contact us at
                    <a href="mailto:info@conveyquote.uk" style="color:#0f2747;font-weight:600;">info@conveyquote.uk</a>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;
                             font-size:11px;color:#9ca3af;text-align:center;line-height:1.7;">
                    This estimate does not create a solicitor-client relationship until you are formally onboarded.
                    ConveyQuote is a trading name of Essentially Law Limited (Company No. 14625839).
                    Legal services are provided by independent SRA-regulated firms.
                  </td>
                </tr>

              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      // Send client email — non-fatal if it fails (internal email already sent)
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "ConveyQuote <quotes@conveyquote.uk>",
          to: [email],
          reply_to: "info@conveyquote.uk",
          subject: `Your Conveyancing Quote — ${reference}`,
          html: clientQuoteHtml,
        }),
      }).catch((err) => console.error("Client quote email failed:", err));
    }

    return jsonResponse({
      success: true,
      reference,
      quote,
      emailSent,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : "";
    return jsonResponse(
      {
        success: false,
        error: message,
        detail: stack?.slice(0, 300),
      },
      500
    );
  }
}
