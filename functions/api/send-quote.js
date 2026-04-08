import { buildQuoteData } from "../../src/buildQuoteData";

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
  String(value)
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

      remortgageTransferTenure,
      remortgageTransferPrice,
      remortgageTransferPostcode,
      remortgageTransferCurrentLender,
      remortgageTransferNewLender,
      remortgageTransferAdditionalBorrowing,
      remortgageTransferHasMortgage,
      remortgageTransferOwnersChanging,
    } = body;

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

    await env.DB.prepare(
      `
      INSERT INTO enquiries (
        reference,
        client_name,
        client_email,
        client_phone,
        transaction_type,
        consent_to_panel,

        tenure,
        price,
        postcode,

        mortgage,
        ownership_type,
        first_time_buyer,
        new_build,
        shared_ownership,
        help_to_buy,
        is_company,
        buy_to_let,
        gifted_deposit,
        additional_property,
        uk_resident_for_sdlt,

        sale_mortgage,
        management_company,
        tenanted,
        number_of_sellers,

        current_lender,
        new_lender,
        additional_borrowing,
        remortgage_transfer,

        transfer_mortgage,
        owners_changing,

        sale_tenure,
        sale_price,
        sale_postcode,
        sale_mortgage_combined,
        management_company_combined,
        tenanted_combined,
        number_of_sellers_combined,

        purchase_tenure,
        purchase_price,
        purchase_postcode,
        purchase_mortgage,
        purchase_ownership_type,
        purchase_first_time_buyer,
        purchase_new_build,
        purchase_shared_ownership,
        purchase_help_to_buy,
        purchase_is_company,
        purchase_buy_to_let,
        purchase_gifted_deposit,
        purchase_additional_property,
        purchase_uk_resident_for_sdlt,

        remortgage_transfer_tenure,
        remortgage_transfer_price,
        remortgage_transfer_postcode,
        remortgage_transfer_current_lender,
        remortgage_transfer_new_lender,
        remortgage_transfer_additional_borrowing,
        remortgage_transfer_has_mortgage,
        remortgage_transfer_owners_changing,

        quote_json
      )
      VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?
      )
      `
    )
      .bind(
        reference,
        name || "",
        email || "",
        phone || "",
        type || "",
        consentToPanel ? "yes" : "no",

        tenure || "",
        price || "",
        postcode || "",

        mortgage || "",
        ownershipType || "",
        firstTimeBuyer || "",
        newBuild || "",
        sharedOwnership || "",
        helpToBuy || "",
        isCompany || "",
        buyToLet || "",
        giftedDeposit || "",
        additionalProperty || "",
        ukResidentForSdlt || "",

        saleMortgage || "",
        managementCompany || "",
        tenanted || "",
        numberOfSellers || "",

        currentLender || "",
        newLender || "",
        additionalBorrowing || "",
        remortgageTransfer || "",

        transferMortgage || "",
        ownersChanging || "",

        saleTenure || "",
        salePrice || "",
        salePostcode || "",
        saleMortgageCombined || "",
        managementCompanyCombined || "",
        tenantedCombined || "",
        numberOfSellersCombined || "",

        purchaseTenure || "",
        purchasePrice || "",
        purchasePostcode || "",
        purchaseMortgage || "",
        purchaseOwnershipType || "",
        purchaseFirstTimeBuyer || "",
        purchaseNewBuild || "",
        purchaseSharedOwnership || "",
        purchaseHelpToBuy || "",
        purchaseIsCompany || "",
        purchaseBuyToLet || "",
        purchaseGiftedDeposit || "",
        purchaseAdditionalProperty || "",
        purchaseUkResidentForSdlt || "",

        remortgageTransferTenure || "",
        remortgageTransferPrice || "",
        remortgageTransferPostcode || "",
        remortgageTransferCurrentLender || "",
        remortgageTransferNewLender || "",
        remortgageTransferAdditionalBorrowing || "",
        remortgageTransferHasMortgage || "",
        remortgageTransferOwnersChanging || "",

        quoteJson
      )
      .run();

    const adminUrl = `https://conveyquote.uk/admin?ref=${reference}`;

    const summaryRows = [
      row("Reference", reference),
      row("Transaction type", prettyType),
      row("Client", safe(name)),
      row("Email", safe(email)),
      row("Phone", safe(phone)),
      row("Consent to panel", consentToPanel ? "Yes" : "No"),
      row("Estimated total", formatMoney(quote.grandTotal)),
    ];

    let matterSections = "";

    if (type === "purchase") {
      matterSections += sectionTable("Purchase Details", [
        row("Tenure", prettifyValue(tenure)),
        row("Price", formatMoney(price)),
        row("Postcode", safe(postcode)),
        row("Mortgage or cash", prettifyValue(mortgage)),
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
        row("Buyer type", prettifyValue(purchaseOwnershipType)),
        row("First time buyer", prettifyValue(purchaseFirstTimeBuyer)),
        row(
          "Additional property",
          prettifyValue(purchaseAdditionalProperty)
        ),
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

    const feeBreakdownHtml = escapeHtml(quote.feeBreakdown).replace(/\n/g, "<br>");

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

    const data = await resendResponse.json();

    if (!resendResponse.ok) {
      return jsonResponse({ success: false, data }, 500);
    }

    return jsonResponse({
      success: true,
      reference,
      quote,
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}
