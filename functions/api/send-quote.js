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

    const prettyType =
      type === "purchase"
        ? "Purchase"
        : type === "sale"
        ? "Sale"
        : type === "remortgage"
        ? "Remortgage"
        : type === "transfer"
        ? "Transfer of Equity"
        : "Quote Request";

    const safe = (value) => (value ? String(value) : "Not provided");

    const prettifyValue = (value) => {
      if (value === null || value === undefined || value === "") {
        return "Not provided";
      }

      const str = String(value).trim();

      if (!str) return "Not provided";
      if (str.toLowerCase() === "yes") return "Yes";
      if (str.toLowerCase() === "no") return "No";
      if (str.toLowerCase() === "mortgage") return "Mortgage";
      if (str.toLowerCase() === "cash") return "Cash";
      if (str === "1") return "1 seller";
      if (str === "2") return "2 sellers";
      if (str === "3") return "3 or more sellers";
      if (str.toLowerCase() === "true") return "Yes";
      if (str.toLowerCase() === "false") return "No";

      return str
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
    };

    const formatMoney = (value) => {
      if (value === null || value === undefined || value === "") {
        return "Not provided";
      }

      const num = Number(value);

      if (Number.isNaN(num)) {
        return `£${value}`;
      }

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

    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(now.getDate()).padStart(2, "0")}`;
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const reference = `CQ-${datePart}-${randomPart}`;

    const quote = calculateQuote({
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
    });

    const quoteJson = JSON.stringify(quote);

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

    const adminUrl = `https://conveyquote.uk/admin?ref=${encodeURIComponent(
      reference
    )}`;

    const sdltItem = Array.isArray(quote.disbursementItems)
      ? quote.disbursementItems.find(
          (item) => item.label === "Stamp Duty Land Tax"
        )
      : null;

    const sdltDisplay = (() => {
      if (!sdltItem) return "Not applicable";
      if (sdltItem.note) return sdltItem.note;
      return formatMoney(sdltItem.amount);
    })();

    const quoteSnapshotHtml = `
      <tr>
        <td style="padding:0 28px 20px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#f8fafc;border:1px solid #d9e2ec;">
            <tr>
              <td style="padding:18px 20px;">
                <div style="font-size:13px;text-transform:uppercase;letter-spacing:0.4px;color:#486581;margin-bottom:8px;">
                  Internal Quote Snapshot
                </div>
                <div style="font-size:32px;font-weight:bold;color:#0f2747;">
                  ${quote.grandTotal ? formatMoney(quote.grandTotal) : "Estimate not available"}
                </div>
                <div style="font-size:14px;color:#52606d;margin-top:8px;line-height:1.8;">
                  ${
                    quote.legalTotalInclVat
                      ? `Legal fees (inc VAT): ${formatMoney(quote.legalTotalInclVat)}`
                      : "Legal fees (inc VAT): Not provided"
                  }
                  &nbsp;&nbsp;|&nbsp;&nbsp;
                  ${
                    quote.vatAmount
                      ? `VAT: ${formatMoney(quote.vatAmount)}`
                      : "VAT: Not provided"
                  }
                  &nbsp;&nbsp;|&nbsp;&nbsp;
                  ${
                    quote.disbursementTotal
                      ? `Disbursements: ${formatMoney(quote.disbursementTotal)}`
                      : "Disbursements: Not provided"
                  }
                  &nbsp;&nbsp;|&nbsp;&nbsp;
                  SDLT: ${sdltDisplay}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;

    const quoteSummaryRows = `
      ${row(
        "Legal fees (excl VAT)",
        quote.legalFeeTotalExVat ? formatMoney(quote.legalFeeTotalExVat) : ""
      )}
      ${row("VAT", quote.vatAmount ? formatMoney(quote.vatAmount) : "")}
      ${row(
        "Legal fees (incl VAT)",
        quote.legalTotalInclVat ? formatMoney(quote.legalTotalInclVat) : ""
      )}
      ${row(
        "Disbursements total",
        quote.disbursementTotal ? formatMoney(quote.disbursementTotal) : ""
      )}
      ${row("SDLT", sdltDisplay)}
      ${row(
        "Estimated total",
        quote.grandTotal ? formatMoney(quote.grandTotal) : ""
      )}
    `;

    const supplementItems = Array.isArray(quote.legalFeeItems)
      ? quote.legalFeeItems.filter((item) => item.label !== "Base legal fee")
      : [];

    const supplementsHtml =
      supplementItems.length > 0
        ? `
          <tr>
            <td style="padding:0 28px 0 28px;">
              <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f2747;">Supplements</h2>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:24px;">
                ${supplementItems
                  .map((item) => row(item.label, formatMoney(item.amount)))
                  .join("")}
              </table>
            </td>
          </tr>
        `
        : "";

    const disbursementsHtml =
      Array.isArray(quote.disbursementItems) && quote.disbursementItems.length > 0
        ? `
          <tr>
            <td style="padding:0 28px 0 28px;">
              <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f2747;">Disbursements</h2>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:24px;">
                ${quote.disbursementItems
                  .map((item) =>
                    row(
                      item.label,
                      item.note ? item.note : formatMoney(item.amount)
                    )
                  )
                  .join("")}
              </table>
            </td>
          </tr>
        `
        : "";

    const disclaimersHtml =
      Array.isArray(quote.disclaimerLines) && quote.disclaimerLines.length > 0
        ? `
          <tr>
            <td style="padding:0 28px 24px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#fff8e6;border:1px solid #e2c275;">
                <tr>
                  <td style="padding:14px 16px;font-size:14px;line-height:1.8;color:#7a4b00;">
                    <strong>Important notes:</strong><br />
                    ${quote.disclaimerLines.map((item) => `• ${item}`).join("<br />")}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `
        : "";

    const internalHtml = `
      <html>
        <body style="margin:0;padding:0;background:#f2f4f7;font-family:Arial,Helvetica,sans-serif;color:#222;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f2f4f7;">
            <tr>
              <td align="center" style="padding:24px 12px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="760" style="max-width:760px;width:100%;background:#ffffff;border-collapse:collapse;">
                  
                  <tr>
                    <td style="background:#0f2747;padding:24px 28px;color:#ffffff;">
                      <div style="font-size:12px;letter-spacing:0.5px;text-transform:uppercase;opacity:0.85;">
                        ConveyQuote Internal Review
                      </div>
                      <div style="font-size:30px;line-height:1.2;font-weight:bold;margin-top:8px;">
                        New Quote Enquiry Received
                      </div>
                      <div style="font-size:15px;line-height:1.6;margin-top:10px;opacity:0.95;">
                        This notification is for internal review only. No client-facing quote has been issued.
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:20px 28px 0 28px;">
                      <p style="margin:0 0 10px 0;font-size:15px;">
                        <strong>Reference:</strong> ${reference}
                      </p>
                      <p style="margin:0 0 20px 0;font-size:15px;">
                        <strong>Matter type:</strong> ${prettyType}
                      </p>
                    </td>
                  </tr>

                  ${quoteSnapshotHtml}

                  <tr>
                    <td style="padding:0 28px 20px 28px;">
                      <a
                        href="${adminUrl}"
                        style="display:inline-block;background:#0f2747;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:bold;"
                      >
                        Review in Admin
                      </a>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:8px 28px 0 28px;">
                      <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f2747;">Client Details</h2>
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:24px;">
                        ${row("Client name", name)}
                        ${row("Email address", email)}
                        ${row("Phone number", phone)}
                        ${row(
                          "Consent to panel referral",
                          consentToPanel ? "Yes" : "No"
                        )}
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 28px 0 28px;">
                      <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f2747;">Matter Details</h2>
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:24px;">
                        ${row("Transaction type", prettyType)}
                        ${row("Tenure", prettifyValue(tenure))}
                        ${row("Property price / value", price ? formatMoney(price) : "")}
                        ${row("Postcode", postcode)}
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 28px 0 28px;">
                      <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f2747;">Estimated Quote Summary</h2>
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:24px;">
                        ${quoteSummaryRows}
                      </table>
                    </td>
                  </tr>

                  ${supplementsHtml}
                  ${disbursementsHtml}

                  ${
                    type === "purchase"
                      ? `
                      <tr>
                        <td style="padding:0 28px 0 28px;">
                          <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f2747;">Purchase Details</h2>
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:24px;">
                            ${row("Mortgage or cash", prettifyValue(mortgage))}
                            ${row("Buyer type", prettifyValue(ownershipType))}
                            ${row("First time buyer", prettifyValue(firstTimeBuyer))}
                            ${row("Additional property", prettifyValue(additionalProperty))}
                            ${row("UK resident for SDLT", prettifyValue(ukResidentForSdlt))}
                            ${row("Buy to let", prettifyValue(buyToLet))}
                            ${row("New build", prettifyValue(newBuild))}
                            ${row("Shared ownership", prettifyValue(sharedOwnership))}
                            ${row("Help to Buy / scheme", prettifyValue(helpToBuy))}
                            ${row("Buying via company", prettifyValue(isCompany))}
                            ${row("Gifted deposit", prettifyValue(giftedDeposit))}
                          </table>
                        </td>
                      </tr>
                    `
                      : ""
                  }

                  ${
                    type === "sale"
                      ? `
                      <tr>
                        <td style="padding:0 28px 0 28px;">
                          <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f2747;">Sale Details</h2>
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:24px;">
                            ${row("Mortgage to redeem", prettifyValue(saleMortgage))}
                            ${row("Management company / service charge", prettifyValue(managementCompany))}
                            ${row("Number of sellers", prettifyValue(numberOfSellers))}
                            ${row("Property tenanted", prettifyValue(tenanted))}
                          </table>
                        </td>
                      </tr>
                    `
                      : ""
                  }

                  ${
                    type === "remortgage"
                      ? `
                      <tr>
                        <td style="padding:0 28px 0 28px;">
                          <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f2747;">Remortgage Details</h2>
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:24px;">
                            ${row("Current lender", prettifyValue(currentLender))}
                            ${row("New lender", prettifyValue(newLender))}
                            ${row("Additional borrowing", prettifyValue(additionalBorrowing))}
                            ${row("Transfer of equity at same time", prettifyValue(remortgageTransfer))}
                          </table>
                        </td>
                      </tr>
                    `
                      : ""
                  }

                  ${
                    type === "transfer"
                      ? `
                      <tr>
                        <td style="padding:0 28px 0 28px;">
                          <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f2747;">Transfer Details</h2>
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:24px;">
                            ${row("Mortgage on property", prettifyValue(transferMortgage))}
                            ${row("Owners changing", prettifyValue(ownersChanging))}
                          </table>
                        </td>
                      </tr>
                    `
                      : ""
                  }

                  ${disclaimersHtml}

                  <tr>
                    <td style="padding:0 28px 24px 28px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#fff8e6;border:1px solid #e2c275;">
                        <tr>
                          <td style="padding:14px 16px;font-size:14px;line-height:1.6;color:#7a4b00;">
                            <strong>Next step:</strong> review this enquiry in admin, adjust the quote if needed, then send the approved client-facing quote.
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:16px 28px 28px 28px;font-size:12px;color:#666;text-align:center;border-top:1px solid #e5e5e5;">
                      ConveyQuote internal notification email
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
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
        subject: `New Conveyancing Quote Request - ${safe(name)} - ${prettyType} - ${reference}`,
        html: internalHtml,
      }),
    });

    const data = await resendResponse.json();

    if (!resendResponse.ok) {
      return jsonResponse(
        {
          success: false,
          source: "resend",
          status: resendResponse.status,
          data,
        },
        500
      );
    }

    return jsonResponse({
      success: true,
      reference,
      quote,
      data,
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        source: "function",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}
