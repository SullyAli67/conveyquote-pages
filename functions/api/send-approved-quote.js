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
        <body style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f7fb;">
            <tr>
              <td align="center" style="padding:32px 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="720" style="max-width:720px;width:100%;background:#ffffff;border-collapse:collapse;">
                  
                  <tr>
                    <td style="background-color:#0f2747;padding:32px 36px;">
                      <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#c7d7ea;font-weight:bold;">
                        ConveyQuote
                      </div>
                      <div style="font-size:32px;line-height:1.2;font-weight:bold;color:#ffffff;margin-top:10px;">
                        Your Conveyancing Quote
                      </div>
                      <div style="font-size:15px;line-height:1.7;color:#d7e3f1;margin-top:14px;">
                        Thank you for your enquiry. We have reviewed the information provided and set out our estimate below.
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:32px 36px 12px 36px;font-size:16px;line-height:1.8;color:#1f2937;">
                      Dear ${safe(name) || "Client"},
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 36px 20px 36px;font-size:15px;line-height:1.8;color:#374151;">
                      Thank you for your conveyancing enquiry. Based on the information currently available, our estimated legal fee for this matter is as follows.
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 36px 28px 36px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8fbff;border:2px solid #0f2747;border-collapse:collapse;">
                        <tr>
                          <td align="center" style="padding:26px 20px;">
                            <div style="font-size:12px;letter-spacing:0.8px;text-transform:uppercase;color:#0f2747;font-weight:bold;">
                              Estimated Legal Fee
                            </div>
                            <div style="font-size:36px;line-height:1.2;font-weight:bold;color:#0f2747;margin-top:10px;">
                              £${safe(quoteAmount)}
                            </div>
                            ${
                              quoteReference
                                ? `
                                <div style="font-size:12px;color:#6b7280;margin-top:10px;">
                                  Quote reference: ${safe(quoteReference)}
                                </div>
                              `
                                : ""
                            }
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 36px 10px 36px;">
                      <div style="font-size:20px;font-weight:bold;color:#0f2747;margin-bottom:12px;">
                        Matter Summary
                      </div>
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                        <tr>
                          <td style="padding:11px 12px;border:1px solid #d9dee7;background:#f9fafb;font-weight:bold;width:36%;">Matter type</td>
                          <td style="padding:11px 12px;border:1px solid #d9dee7;">${safe(prettyType)}</td>
                        </tr>
                        <tr>
                          <td style="padding:11px 12px;border:1px solid #d9dee7;background:#f9fafb;font-weight:bold;">Tenure</td>
                          <td style="padding:11px 12px;border:1px solid #d9dee7;">${safe(tenure)}</td>
                        </tr>
                        <tr>
                          <td style="padding:11px 12px;border:1px solid #d9dee7;background:#f9fafb;font-weight:bold;">Property price / value</td>
                          <td style="padding:11px 12px;border:1px solid #d9dee7;">£${safe(price)}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  ${
                    feeBreakdown
                      ? `
                      <tr>
                        <td style="padding:28px 36px 8px 36px;">
                          <div style="font-size:20px;font-weight:bold;color:#0f2747;margin-bottom:10px;">
                            Fee Notes
                          </div>
                          <div style="font-size:15px;line-height:1.8;color:#374151;white-space:pre-line;">
                            ${safe(feeBreakdown)}
                          </div>
                        </td>
                      </tr>
                    `
                      : ""
                  }

                  <tr>
                    <td style="padding:28px 36px 8px 36px;">
                      <div style="font-size:20px;font-weight:bold;color:#0f2747;margin-bottom:10px;">
                        Important
                      </div>
                      <div style="font-size:15px;line-height:1.8;color:#374151;">
                        This quote is an estimate based on the information currently available. It may need to be revised if further information comes to light or the transaction proves more complex than initially anticipated.
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:28px 36px 8px 36px;">
                      <div style="font-size:20px;font-weight:bold;color:#0f2747;margin-bottom:10px;">
                        Next Steps
                      </div>
                      <div style="font-size:15px;line-height:1.8;color:#374151;white-space:pre-line;">
                        ${
                          nextSteps
                            ? safe(nextSteps)
                            : "If you would like to proceed, please reply to this email and we will advise you on the next stage of the instruction process."
                        }
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:30px 36px 24px 36px;font-size:15px;line-height:1.8;color:#374151;">
                      Kind regards,<br />
                      <strong>ConveyQuote</strong>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:16px 36px 28px 36px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.7;color:#6b7280;">
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
