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
          <table width="100%" style="background:#f2f4f7;">
            <tr>
              <td align="center" style="padding:24px 12px;">
                <table width="760" style="max-width:760px;width:100%;background:#ffffff;">

                  <tr>
                    <td style="background:#0f2747;padding:24px 28px;color:#ffffff;">
                      <div style="font-size:12px;text-transform:uppercase;opacity:0.85;">
                        ConveyQuote
                      </div>
                      <div style="font-size:30px;font-weight:bold;margin-top:8px;">
                        Your Conveyancing Quote
                      </div>
                      <div style="font-size:15px;margin-top:10px;">
                        Thank you for your enquiry. We have reviewed the information provided and set out our estimate below.
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:28px;">
                      <p>Dear ${safe(name)},</p>
                      <p>
                        Thank you for your conveyancing enquiry. Based on the information currently available, our estimated costs are set out below.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 28px;">
                      <div style="background:#f8fafc;border:1px solid #d9e2ec;padding:18px;">
                        <div style="font-size:13px;color:#486581;">Total Estimated Cost</div>
                        <div style="font-size:32px;font-weight:bold;color:#0f2747;">
                          £${cleanQuoteAmount}
                        </div>
                        <div style="font-size:14px;margin-top:6px;">
                          Reference: ${safe(quoteReference)}
                        </div>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:28px;">
                      <h3>Matter Summary</h3>
                      <p><strong>Type:</strong> ${safe(prettyType)}</p>
                      <p><strong>Tenure:</strong> ${safe(tenure)}</p>
                      <p><strong>Price:</strong> £${cleanPrice}</p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 28px;">
                      <h3>Estimated Costs Breakdown</h3>
                      <div style="background:#fafafa;border:1px solid #e5e7eb;padding:16px;">
                        ${formattedBreakdown}
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:28px;">
                      <div style="background:#fff8e6;border:1px solid #e2c275;padding:12px;">
                        <strong>Important:</strong><br />
                        This quote is an estimate and may change if further information comes to light.
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 28px 20px 28px;">
                      <h3>Next Steps</h3>
                      <p>${safe(nextSteps)}</p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 28px 28px 28px;">
                      <a href="${acceptUrl}" style="background:#0f2747;color:#fff;padding:14px 22px;border-radius:6px;text-decoration:none;font-weight:bold;">
                        Instruct Us
                      </a>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 28px 28px;">
                      <p>Kind regards,<br/>ConveyQuote</p>
                      <p style="font-size:13px;color:#666;">
                        If you have any questions, please contact us at 
                        <a href="mailto:info@conveyquote.uk">info@conveyquote.uk</a>
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:16px;text-align:center;font-size:12px;color:#666;border-top:1px solid #e5e5e5;">
                      This email contains an estimate only and does not create a solicitor-client retainer.
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
        cc: ["info@conveyquote.uk"],

        // ✅ FIXED HERE
        reply_to: "info@conveyquote.uk",

        subject: `Your Conveyancing Quote - ${safe(quoteReference)}`,
        html: clientHtml,
      }),
    });

    const data = await resendResponse.json();

    if (!resendResponse.ok) {
      return new Response(JSON.stringify({ success: false, data }), {
        status: 500,
      });
    }

    if (quoteReference) {
      await env.DB.prepare(
        `UPDATE enquiries SET status = 'quote_sent' WHERE reference = ?`
      )
        .bind(quoteReference)
        .run();
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500 }
    );
  }
}
