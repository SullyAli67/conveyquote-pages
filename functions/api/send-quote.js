export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();

    console.log("Incoming body:", body);
    console.log("Has RESEND_API_KEY:", !!env.RESEND_API_KEY);

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

    const detailRow = (label, value) => `
      <tr>
        <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; width:42%; font-weight:600; color:#1f2937; vertical-align:top;">
          ${label}
        </td>
        <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; color:#374151;">
          ${safe(value)}
        </td>
      </tr>
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
        html: `
          <div style="margin:0; padding:0; background-color:#f3f4f6; font-family:Arial, Helvetica, sans-serif; color:#111827;">
            <div style="max-width:760px; margin:0 auto; padding:32px 16px;">
              
              <div style="background:linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); border-radius:16px 16px 0 0; padding:28px 32px;">
                <div style="font-size:12px; letter-spacing:1.5px; text-transform:uppercase; color:#bfdbfe; margin-bottom:10px;">
                  Internal Quote Notification
                </div>
                <h1 style="margin:0; font-size:28px; line-height:1.2; color:#ffffff;">
                  New Conveyancing Enquiry Received
                </h1>
                <p style="margin:12px 0 0 0; font-size:15px; line-height:1.6; color:#dbeafe;">
                  A new quote request has been submitted through the ConveyQuote website. This email is for internal review only.
                </p>
              </div>

              <div style="background:#ffffff; border:1px solid #e5e7eb; border-top:none; border-radius:0 0 16px 16px; overflow:hidden;">
                
                <div style="padding:24px 32px 8px 32px;">
                  <div style="display:inline-block; background:#eff6ff; color:#1d4ed8; font-size:13px; font-weight:700; padding:8px 12px; border-radius:999px; margin-bottom:16px;">
                    ${prettyType}
                  </div>
                  <p style="margin:0 0 18px 0; font-size:15px; line-height:1.7; color:#374151;">
                    Review the details below before sending any client-facing quote or client care documentation.
                  </p>
                </div>

                <div style="padding:0 32px 24px 32px;">
                  <h2 style="margin:0 0 12px 0; font-size:18px; color:#111827;">Client Details</h2>
                  <table style="width:100%; border-collapse:collapse; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
                    ${detailRow("Client name", name)}
                    ${detailRow("Email address", email)}
                    ${detailRow("Phone number", phone)}
                  </table>
                </div>

                <div style="padding:0 32px 24px 32px;">
                  <h2 style="margin:0 0 12px 0; font-size:18px; color:#111827;">Matter Details</h2>
                  <table style="width:100%; border-collapse:collapse; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
                    ${detailRow("Transaction type", prettyType)}
                    ${detailRow("Tenure", tenure)}
                    ${detailRow("Property price / value", price ? `£${price}` : "")}
                    ${detailRow("Postcode", postcode)}
                  </table>
                </div>

                ${
                  type === "purchase"
                    ? `
                  <div style="padding:0 32px 24px 32px;">
                    <h2 style="margin:0 0 12px 0; font-size:18px; color:#111827;">Purchase Details</h2>
                    <table style="width:100%; border-collapse:collapse; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
                      ${detailRow("Mortgage or cash", mortgage)}
                      ${detailRow("Buyer type", ownershipType)}
                      ${detailRow("First time buyer", firstTimeBuyer)}
                      ${detailRow("Buy to let", buyToLet)}
                      ${detailRow("New build", newBuild)}
                      ${detailRow("Shared ownership", sharedOwnership)}
                      ${detailRow("Help to Buy / scheme", helpToBuy)}
                      ${detailRow("Buying via company", isCompany)}
                      ${detailRow("Gifted deposit", giftedDeposit)}
                    </table>
                  </div>
                `
                    : ""
                }

                ${
                  type === "sale"
                    ? `
                  <div style="padding:0 32px 24px 32px;">
                    <h2 style="margin:0 0 12px 0; font-size:18px; color:#111827;">Sale Details</h2>
                    <table style="width:100%; border-collapse:collapse; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
                      ${detailRow("Mortgage to redeem", saleMortgage)}
                      ${detailRow("Management company / service charge", managementCompany)}
                      ${detailRow("Property tenanted", tenanted)}
                    </table>
                  </div>
                `
                    : ""
                }

                ${
                  type === "remortgage"
                    ? `
                  <div style="padding:0 32px 24px 32px;">
                    <h2 style="margin:0 0 12px 0; font-size:18px; color:#111827;">Remortgage Details</h2>
                    <table style="width:100%; border-collapse:collapse; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
                      ${detailRow("Current lender", currentLender)}
                      ${detailRow("New lender", newLender)}
                      ${detailRow("Additional borrowing", additionalBorrowing)}
                      ${detailRow("Transfer of equity at same time", remortgageTransfer)}
                    </table>
                  </div>
                `
                    : ""
                }

                ${
                  type === "transfer"
                    ? `
                  <div style="padding:0 32px 24px 32px;">
                    <h2 style="margin:0 0 12px 0; font-size:18px; color:#111827;">Transfer Details</h2>
                    <table style="width:100%; border-collapse:collapse; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
                      ${detailRow("Mortgage on property", transferMortgage)}
                      ${detailRow("Owners changing", ownersChanging)}
                    </table>
                  </div>
                `
                    : ""
                }

                <div style="padding:0 32px 32px 32px;">
                  <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:12px; padding:16px 18px;">
                    <p style="margin:0; font-size:14px; line-height:1.7; color:#92400e;">
                      <strong>Next step:</strong> review this enquiry internally and send the approved client-facing quote separately. No automatic quote should be treated as issued to the client from this notification.
                    </p>
                  </div>
                </div>

              </div>

              <div style="padding:18px 8px 0 8px; text-align:center;">
                <p style="margin:0; font-size:12px; line-height:1.6; color:#6b7280;">
                  ConveyQuote internal notification email
                </p>
              </div>

            </div>
          </div>
        `,
      }),
    });

    const data = await resendResponse.json();

    console.log("Resend status:", resendResponse.status);
    console.log("Resend data:", data);

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
    console.error("Function crash:", error);

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
