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
      saleMortgage,
      managementCompany,
      tenanted,
      currentLender,
      newLender,
      additionalBorrowing,
      remortgageTransfer,
      transferMortgage,
      ownersChanging,
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
                    <td style="padding:24px 28px 8px 28px;">
                      <div style="display:inline-block;background:#e8f1fb;color:#0f2747;padding:8px 12px;font-size:13px;font-weight:bold;">
                        ${prettyType}
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:8px 28px 0 28px;">
                      <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f2747;">Client Details</h2>
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:24px;">
                        ${row("Client name", name)}
                        ${row("Email address", email)}
                        ${row("Phone number", phone)}
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 28px 0 28px;">
                      <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f2747;">Matter Details</h2>
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:24px;">
                        ${row("Transaction type", prettyType)}
                        ${row("Tenure", tenure)}
                        ${row("Property price / value", price ? `£${price}` : "")}
                        ${row("Postcode", postcode)}
                      </table>
                    </td>
                  </tr>

                  ${
                    type === "purchase"
                      ? `
                      <tr>
                        <td style="padding:0 28px 0 28px;">
                          <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f2747;">Purchase Details</h2>
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:24px;">
                            ${row("Mortgage or cash", mortgage)}
                            ${row("Buyer type", ownershipType)}
                            ${row("First time buyer", firstTimeBuyer)}
                            ${row("Buy to let", buyToLet)}
                            ${row("New build", newBuild)}
                            ${row("Shared ownership", sharedOwnership)}
                            ${row("Help to Buy / scheme", helpToBuy)}
                            ${row("Buying via company", isCompany)}
                            ${row("Gifted deposit", giftedDeposit)}
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
                            ${row("Mortgage to redeem", saleMortgage)}
                            ${row("Management company / service charge", managementCompany)}
                            ${row("Property tenanted", tenanted)}
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
                            ${row("Current lender", currentLender)}
                            ${row("New lender", newLender)}
                            ${row("Additional borrowing", additionalBorrowing)}
                            ${row("Transfer of equity at same time", remortgageTransfer)}
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
                            ${row("Mortgage on property", transferMortgage)}
                            ${row("Owners changing", ownersChanging)}
                          </table>
                        </td>
                      </tr>
                    `
                      : ""
                  }

                  <tr>
                    <td style="padding:0 28px 24px 28px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#fff8e6;border:1px solid #e2c275;">
                        <tr>
                          <td style="padding:14px 16px;font-size:14px;line-height:1.6;color:#7a4b00;">
                            <strong>Next step:</strong> review this enquiry, calculate the quote, then use the separate approval function to send the client-facing quote.
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
        to: ["liveandletlaw@outlook.com"],
        reply_to: email || "liveandletlaw@outlook.com",
        subject: `New Conveyancing Quote Request - ${safe(name)} - ${prettyType}`,
        html: internalHtml,
      }),
    });

    const data = await resendResponse.json();

    if (!resendResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          source: "resend",
          status: resendResponse.status,
          data,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        source: "function",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
