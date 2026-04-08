import { calculateQuote } from "../lib/calculate-quote";

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();

    const {
      name,
      email,
      phone,
      type,
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

      consentToPanel,
    } = body;

    // =========================
    // TYPE LABELS (UPDATED)
    // =========================
    const prettyType =
      type === "purchase"
        ? "Purchase"
        : type === "sale"
        ? "Sale"
        : type === "sale_purchase"
        ? "Sale & Purchase"
        : type === "remortgage"
        ? "Remortgage"
        : type === "remortgage_purchase"
        ? "Remortgage & Purchase"
        : type === "transfer"
        ? "Transfer of Equity"
        : "Quote Request";

    const safe = (value) => (value ? String(value) : "Not provided");

    const prettifyValue = (value) => {
      if (!value) return "Not provided";

      const str = String(value).trim().toLowerCase();

      if (str === "yes") return "Yes";
      if (str === "no") return "No";
      if (str === "mortgage") return "Mortgage";
      if (str === "cash") return "Cash";
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
        <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;width:35%;">
          ${label}
        </td>
        <td style="padding:10px 12px;border:1px solid #d9d9d9;">
          ${safe(value)}
        </td>
      </tr>
    `;

    // =========================
    // REFERENCE
    // =========================
    const now = new Date();
    const reference = `CQ-${now.getFullYear()}${String(
      now.getMonth() + 1
    ).padStart(2, "0")}${String(now.getDate()).padStart(
      2,
      "0"
    )}-${Math.floor(1000 + Math.random() * 9000)}`;

    // =========================
    // QUOTE BUILD
    // =========================
    const quote = calculateQuote(body);
    const quoteJson = JSON.stringify(quote);

    // =========================
    // SAVE TO DB
    // =========================
    await env.DB.prepare(
      `
      INSERT INTO enquiries (
        reference,
        client_name,
        client_email,
        client_phone,
        transaction_type,
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
        consent_to_panel,
        quote_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
      .bind(
        reference,
        name || "",
        email || "",
        phone || "",
        type || "",
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
        consentToPanel ? "yes" : "no",
        quoteJson
      )
      .run();

    // =========================
    // CONDITIONAL HELPERS
    // =========================
    const isPurchase =
      type === "purchase" ||
      type === "sale_purchase" ||
      type === "remortgage_purchase";

    const isSale = type === "sale" || type === "sale_purchase";

    const isRemortgage =
      type === "remortgage" || type === "remortgage_purchase";

    const isTransfer = type === "transfer";

    const adminUrl = `https://conveyquote.uk/admin?ref=${reference}`;

    // =========================
    // EMAIL HTML
    // =========================
    const internalHtml = `
      <html>
        <body style="font-family:Arial;padding:20px;">
          <h2>New Quote Enquiry</h2>
          <p><strong>Reference:</strong> ${reference}</p>
          <p><strong>Type:</strong> ${prettyType}</p>

          <p><strong>Client:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>

          <h3>Summary</h3>
          <p>Total: ${formatMoney(quote.grandTotal)}</p>

          <p>
            <a href="${adminUrl}">
              Review in Admin
            </a>
          </p>

          ${isPurchase ? `<h3>Purchase Details</h3>` : ""}
          ${isSale ? `<h3>Sale Details</h3>` : ""}
          ${isRemortgage ? `<h3>Remortgage Details</h3>` : ""}
          ${isTransfer ? `<h3>Transfer Details</h3>` : ""}
        </body>
      </html>
    `;

    // =========================
    // SEND EMAIL
    // =========================
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
