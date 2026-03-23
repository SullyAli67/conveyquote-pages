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

    const cleanQuoteAmount = String(quoteAmount || "")
      .replace(/£/g, "")
      .trim();

    const cleanPrice = String(price || "")
      .replace(/£/g, "")
      .trim();

    const acceptUrl = `https://conveyquote.uk/accept-quote?ref=${encodeURIComponent(
      quoteReference || ""
    )}`;

    const formattedBreakdown = safe(feeBreakdown)
      .replace(/\n/g, "<br />")
      .replace(/  /g, "&nbsp;&nbsp;");

    const clientHtml = `
      <html>
        <body style="margin:0;padding:0;background:#f2f4f7;font-family:Arial,Helvetica,sans-serif;color:#222;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f2f4f7;">
            <tr>
              <td align="center" style="padding:24px 12px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="760" style="max-width:760px;width:100%;background:#ffffff;border-collapse:collapse;">

                  <tr>
                    <td style="background:#0f2747;padding:24px 28px;color:#ffffff;">
                      <div style="font-size:12px;letter-spacing:0.5px;text-transform:uppercase;opacity:0.85;">
                        ConveyQuote
                      </div>
                      <div style="font-size:30px;line-height:1.2;font-weight:bold;margin-top:8px;">
                        Your Conveyancing Quote
                      </div>
                      <div style="font-size:15px;line-height:1.6;margin-top:10px;opacity:0.95;">
                        Thank you for your enquiry. We have reviewed the information provided and set out our estimate below.
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:28px 28px 8px 28px;">
                      <p style="margin:0 0 16px 0;font-size:16px;">Dear ${safe(name)},</p>
                      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;">
                        Thank you for your conveyancing enquiry. Based on the information currently available, our estimated costs for this matter are set out below.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 28px 0 28px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:24px;background:#f8fafc;border:1px solid #d9e2ec;">
                        <tr>
                          <td style="padding:18px 20px;">
                            <div style="font-size:13px;text-transform:uppercase;letter-spacing:0.4px;color:#486581;margin-bottom:8px;">
                              Total Estimated Cost
                            </div>
                            <div style="font-size:34px;font-weight:bold;color:#0f2747;">
                              £${cleanQuoteAmount}
                            </div>
                            <div style="font-size:14px;color:#52606d;margin-top:8px;">
                              Quote reference: ${safe(quoteReference)}
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 28px 0 28px;">
                      <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f2747;">Matter Summary</h2>
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:24px;">
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
                          <td style="padding:10px 12px;border:1px solid #d9d9d9;">£${cleanPrice}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 28px 0 28px;">
                      <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f2747;">Estimated Costs Breakdown</h2>
                      <div style="line-height:1.8;font-size:15px;color:#222;background:#fafafa;border:1px solid #e5e7eb;padding:18px 20px;margin-bottom:24px;">
                        ${formattedBreakdown}
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 28px 0 28px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#fff8e6;border:1px solid #e2c275;margin-bottom:24px;">
                        <tr>
                          <td style="padding:14px 16px;font-size:14px;line-height:1.7;color:#7a4b00;">
                            <strong>Important:</strong><br />
                            This quote is an estimate based on the information currently available. It may need to be revised if further information comes to light or the transaction proves more complex than initially anticipated.
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 28px 12px 28px;">
                      <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f2747;">Next Steps</h2>
                      <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;">
                        ${safe(nextSteps)}
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 28px 28px 28px;">
                      <a
                        href="${acceptUrl}"
                        style="display:inline-block;background:#0f2747;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:6px;font-weight:bold;font-size:15px;"
                      >
                        Instruct Us
                      </a>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 28px 28px 28px;font-size:15px;line-height:1.7;color:#222;">
                      <p style="margin:0 0 14px 0;">Kind regards,</p>
                      <p style="margin:0;">ConveyQuote</p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:16px 28px 28px 28px;font-size:12px;color:#666;text-align:center;border-top:1px solid #e5e5e5;">
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
        subject: `Your Conveyancing Quote - ${safe(quoteReference)}`,
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

    if (quoteReference) {
      await env.DB.prepare(
        `UPDATE enquiries SET status = 'quote_sent' WHERE reference = ?`
      )
        .bind(quoteReference)
        .run();
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
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
