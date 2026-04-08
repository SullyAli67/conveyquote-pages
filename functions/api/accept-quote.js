const htmlResponse = (html, status = 200) =>
  new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });

const textResponse = (text, status = 200) =>
  new Response(text, {
    status,
    headers: { "Content-Type": "text/plain; charset=UTF-8" },
  });

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const reference = url.searchParams.get("ref");

    if (!reference) {
      return textResponse("Missing reference", 400);
    }

    const enquiry = await env.DB.prepare(
      `
      SELECT
        reference,
        client_name,
        client_email,
        transaction_type,
        status
      FROM enquiries
      WHERE reference = ?
      LIMIT 1
      `
    )
      .bind(reference)
      .first();

    if (!enquiry) {
      return textResponse(`Quote reference not found: ${reference}`, 404);
    }

    const clientName = enquiry.client_name || "Client";
    const clientEmail = enquiry.client_email || "";
    const transactionType = enquiry.transaction_type || "conveyancing matter";

    if (!clientEmail) {
      return textResponse(
        `Client email not found for reference: ${reference}`,
        400
      );
    }

    await env.DB.prepare(
      `UPDATE enquiries SET status = 'accepted' WHERE reference = ?`
    )
      .bind(reference)
      .run();

    const adminUrl = `https://conveyquote.uk/admin?ref=${encodeURIComponent(
      reference
    )}`;

    const internalEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ConveyQuote <quotes@conveyquote.uk>",
        to: ["info@conveyquote.uk"],
        reply_to: "info@conveyquote.uk",
        subject: `Client has instructed - ${reference}`,
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a;background:#f4f6f8;padding:24px;">
            <div style="max-width:700px;margin:0 auto;background:#ffffff;border:1px solid #d9e2ec;border-radius:10px;overflow:hidden;">
              <div style="background:#0f2747;color:#ffffff;padding:20px 24px;">
                <h2 style="margin:0;">Client has instructed</h2>
              </div>

              <div style="padding:24px;">
                <p style="margin-top:0;">A client has accepted their conveyancing quote.</p>

                <table style="border-collapse:collapse;width:100%;margin:16px 0;">
                  <tr>
                    <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;width:35%;">Reference</td>
                    <td style="padding:10px 12px;border:1px solid #d9d9d9;">${escapeHtml(
                      reference
                    )}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;">Client name</td>
                    <td style="padding:10px 12px;border:1px solid #d9d9d9;">${escapeHtml(
                      clientName
                    )}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;">Client email</td>
                    <td style="padding:10px 12px;border:1px solid #d9d9d9;">${escapeHtml(
                      clientEmail
                    )}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;">Transaction type</td>
                    <td style="padding:10px 12px;border:1px solid #d9d9d9;">${escapeHtml(
                      transactionType
                    )}</td>
                  </tr>
                </table>

                <p style="margin:24px 0 0 0;">
                  <a href="${escapeHtml(
                    adminUrl
                  )}" style="display:inline-block;padding:12px 18px;background:#0f2747;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">
                    Open Admin
                  </a>
                </p>
              </div>
            </div>
          </div>
        `,
      }),
    });

    if (!internalEmailResponse.ok) {
      return textResponse("Failed to send internal notification email.", 500);
    }

    const clientEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ConveyQuote <quotes@conveyquote.uk>",
        to: [clientEmail],
        reply_to: "info@conveyquote.uk",
        subject: `We've received your instruction - ${reference}`,
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a;background:#f4f6f8;padding:24px;">
            <div style="max-width:700px;margin:0 auto;background:#ffffff;border:1px solid #d9e2ec;border-radius:10px;overflow:hidden;">
              <div style="background:#0f2747;color:#ffffff;padding:20px 24px;">
                <h2 style="margin:0;">Thank you for your instruction</h2>
              </div>

              <div style="padding:24px;">
                <p style="margin-top:0;">Dear ${escapeHtml(clientName)},</p>
                <p>We have received your instruction to proceed.</p>

                <table style="border-collapse:collapse;width:100%;margin:16px 0 24px 0;">
                  <tr>
                    <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;width:35%;">Reference</td>
                    <td style="padding:10px 12px;border:1px solid #d9d9d9;">${escapeHtml(
                      reference
                    )}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;">Transaction type</td>
                    <td style="padding:10px 12px;border:1px solid #d9d9d9;">${escapeHtml(
                      transactionType
                    )}</td>
                  </tr>
                </table>

                <p>We will be in touch shortly with the next steps and your client care documentation.</p>
                <p>If you need to contact us in the meantime, please email <a href="mailto:info@conveyquote.uk">info@conveyquote.uk</a>.</p>
              </div>
            </div>
          </div>
        `,
      }),
    });

    if (!clientEmailResponse.ok) {
      return textResponse("Failed to send client confirmation email.", 500);
    }

    return htmlResponse(`
      <html>
        <head>
          <title>Instruction Received</title>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="font-family:Arial,Helvetica,sans-serif;background:#f2f4f7;padding:40px;">
          <div style="max-width:700px;margin:0 auto;background:#fff;padding:36px;border-radius:10px;border:1px solid #d9e2ec;">
            <h1 style="color:#0f2747;margin-top:0;">Thank you</h1>
            <p>Your instruction has been received.</p>
            <p>Reference: <strong>${escapeHtml(reference)}</strong></p>
            <p>We will be in touch shortly with the next steps and client care documentation.</p>
            <p style="margin-top:24px;">
              If you need to contact us, please email
              <a href="mailto:info@conveyquote.uk">info@conveyquote.uk</a>.
            </p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    return textResponse(
      `Error accepting quote: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      500
    );
  }
}
