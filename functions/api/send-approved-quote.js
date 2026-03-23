export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();

    const {
      name,
      email,
      type,
      tenure,
      price,
      quoteAmount,
      quoteReference,
      feeBreakdown,
      nextSteps,
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
        : "Conveyancing Matter";

    const safe = (value) => (value ? String(value) : "");

    const clientHtml = `
      <html>
        <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#222;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f6f8;">
            <tr>
              <td align="center" style="padding:24px 12px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="720" style="max-width:720px;width:100%;background:#ffffff;border-collapse:collapse;">
                  
                  <tr>
                    <td style="background:#0f2747;padding:28px 32px;color:#ffffff;">
                      <div style="font-size:12px;letter-spacing:0.5px;text-transform:uppercase;opacity:0.9;">
                        ConveyQuote
                      </div>
                      <div style="font-size:30px;line-height:1.2;font-weight:bold;margin-top:8px;">
                        Your Conveyancing Quote
                      </div>
                      <div style="font-size:15px;line-height:1.6;margin-top:12px;opacity:0.95;">
                        Thank you for your enquiry. We have reviewed the information provided and set out our estimate below.
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:28px 32px 10px 32px;font-size:16px;line-height:1.7;">
                      Dear ${safe(name) || "Client"},
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 32px 18px 32px;font-size:15px;line-height:1.8;color:#333;">
                      Thank you for your conveyancing enquiry. Based on the information currently provided, our estimated legal fee for this matter is:
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 32px 24px 32px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#f8fbff;border:2px solid #0f2747;">
                        <tr>
                          <td style="padding:22px;text-align:center;">
                            <div style="font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:#0f2747;font-weight:bold;">
                              Estimated Legal Fee
                            </div>
                            <div style="font-size:34px;line-height:1.2;font-weight:bold;color:#0f2747;margin-top:8px;">
                              £${safe(quoteAmount)}
                            </div>
                            ${
                              quoteReference
                                ? `<div style="font-size:12px;color:#555;margin-top:8px;">Reference: ${safe(quoteReference)}</div>`
                                : ""
                            }
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 32px 8px 32px;">
                      <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f2747;">Matter Summary</h2>
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                        <tr>
                          <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;width:35%;">Matter type</td>
                          <td style="padding:10px 12px;border:1px solid #d9d9d9;">${safe(prettyType)}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;">Tenure</td>
                          <td style="padding:10px 12px;border:1px solid #d9d9d9;">${safe(tenure)}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;">Property price / value</td>
                          <td style="padding:10px 12px;border:1px solid #d9d9d9;">£${safe(price)}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  ${
                    feeBreakdown
                      ? `
                      <tr>
                        <td style="padding:24px 32px 8px 32px;">
                          <h2 style="margin:0 0 10px 0;font-size:20px;color:#0f2747;">Fee Notes</h2>
                          <div style="font-size:15px;line-height:1.8;color:#333;white-space:pre-line;">${safe(feeBreakdown)}</div>
                        </td>
                      </tr>
                    `
                      : ""
                  }

                  <tr>
                    <td style="padding:24px 32px 8px 32px;">
                      <h2 style="margin:0 0 10px 0;font-size:20px;color:#0f2747;">Important</h2>
                      <div style="font-size:15px;line-height:1.8;color:#333;">
                        This quote is an estimate based on the information currently available. It may need to be revised if further information comes to light or the transaction proves more complex than initially anticipated.
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:24px 32px 8px 32px;">
                      <h2 style="margin:0 0 10px 0;font-size:20px;color:#0f2747;">Next Steps</h2>
                      <div style="font-size:15px;line-height:1.8;color:#333;">
                        ${
                          nextSteps
                            ? safe(nextSteps)
                            : "If you would like to proceed, please reply to this email and we will advise you on the next stage of the instruction process."
                        }
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:28px 32px;font-size:15px;line-height:1.8;color:#333;">
                      Kind regards,<br />
                      <strong>ConveyQuote</strong>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:16px 32px 28px 32px;font-size:12px;line-height:1.6;color:#666;border-top:1px solid #e5e5e5;">
                      This email contains an estimate only and does not itself create a solicitor-client retainer.
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
        to: [email],
        cc: ["liveandletlaw@outlook.com"],
        reply_to: "liveandletlaw@outlook.com",
        subject: `Your Conveyancing Quote${quoteReference ? ` - ${quoteReference}` : ""}`,
        html: clientHtml,
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
