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

const getTransactionLabel = (type) => {
  if (type === "purchase") return "Purchase";
  if (type === "sale") return "Sale";
  if (type === "sale_purchase") return "Sale and Purchase";
  if (type === "remortgage") return "Remortgage";
  if (type === "transfer") return "Transfer of Equity";
  if (type === "remortgage_transfer") {
    return "Remortgage and Transfer of Equity";
  }
  return "Conveyancing Matter";
};

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
        status,
        property_address,
        price,
        tenure,
        mortgage
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
    const transactionType = getTransactionLabel(enquiry.transaction_type);
    const currentStatus = enquiry.status || "";

    if (!clientEmail) {
      return textResponse(
        `Client email not found for reference: ${reference}`,
        400
      );
    }

    const adminUrl = `https://conveyquote.uk/admin?ref=${encodeURIComponent(
      reference
    )}`;

    const alreadyAccepted = currentStatus === "accepted";

    if (!alreadyAccepted) {
      await env.DB.prepare(
        `UPDATE enquiries SET status = 'accepted' WHERE reference = ?`
      )
        .bind(reference)
        .run();

      const internalEmailResponse = await fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "ConveyQuote <quotes@conveyquote.uk>",
            to: ["info@conveyquote.uk"],
            reply_to: "info@conveyquote.uk",
            subject: `Client accepted quote - ${reference}`,
            html: `
              <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a;background:#f4f6f8;padding:24px;">
                <div style="max-width:700px;margin:0 auto;background:#ffffff;border:1px solid #d9e2ec;border-radius:10px;overflow:hidden;">
                  <div style="background:#0f2747;color:#ffffff;padding:20px 24px;">
                    <h2 style="margin:0;">Client accepted quote</h2>
                  </div>

                  <div style="padding:24px;">
                    <p style="margin-top:0;">
                      A client has accepted their conveyancing quote and asked to proceed.
                    </p>

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
                      <tr>
                        <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;">Status</td>
                        <td style="padding:10px 12px;border:1px solid #d9d9d9;">Accepted</td>
                      </tr>
                    </table>

                    <p style="margin:0 0 16px 0;">
                      The matter can now be reviewed for the next stage, which may include referral to a selected panel solicitor firm.
                    </p>

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
        }
      );

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
          subject: `We’ve received your instruction - ${reference}`,
          html: `
            <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a;background:#f4f6f8;padding:24px;">
              <div style="max-width:700px;margin:0 auto;background:#ffffff;border:1px solid #d9e2ec;border-radius:10px;overflow:hidden;">
                <div style="background:#0f2747;color:#ffffff;padding:20px 24px;">
                  <h2 style="margin:0;">Thank you for your instruction</h2>
                </div>

                <div style="padding:24px;">
                  <p style="margin-top:0;">Dear ${escapeHtml(clientName)},</p>

                  <p>
                    Thank you for confirming that you would like to proceed. We have now recorded your instruction.
                  </p>

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

                  <p>
                    Your matter will now move to the next stage of review and onboarding. This may include referral to one of our selected panel solicitor firms, depending on the type of transaction, lender requirements and panel availability.
                  </p>

                  <p>
                    Please allow us a short time to process your instruction and prepare the next steps. If you have any questions in the meantime, please contact us at
                    <a href="mailto:info@conveyquote.uk">info@conveyquote.uk</a>.
                  </p>

                  <p style="margin-bottom:0;">
                    We appreciate your patience and will be in touch shortly.
                  </p>
                </div>
              </div>
            </div>
          `,
        }),
      });

      if (!clientEmailResponse.ok) {
        return textResponse("Failed to send client confirmation email.", 500);
      }
    }

    return htmlResponse(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Quote Accepted – ConveyQuote</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; background: #f2f4f7; min-height: 100vh; padding: 32px 16px; color: #1a2a3a; }
    .wrap { max-width: 640px; margin: 0 auto; }
    .logo { text-align: center; margin-bottom: 20px; }
    .logo img { width: 110px; height: auto; }
    .card { background: #ffffff; border: 1px solid #d9e2ec; border-radius: 14px; overflow: hidden; }
    .card__header { background: #0f2747; padding: 28px 32px; }
    .card__header h1 { color: #fff; font-size: 26px; line-height: 1.2; margin-bottom: 6px; }
    .card__header p { color: rgba(255,255,255,0.85); font-size: 14px; line-height: 1.6; }
    .card__body { padding: 28px 32px; }
    .card__body p { font-size: 15px; line-height: 1.7; color: #374151; margin-bottom: 14px; }
    .status-badge { display: inline-flex; align-items: center; gap: 8px; background: #d1fae5; color: #065f46; border-radius: 20px; padding: 6px 14px; font-size: 14px; font-weight: 700; margin-bottom: 20px; }
    .status-badge svg { width: 16px; height: 16px; flex-shrink: 0; }
    .detail-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
    .detail-table td { padding: 10px 12px; border: 1px solid #e5e7eb; }
    .detail-table tr td:first-child { background: #f7f9fb; font-weight: 600; width: 38%; color: #374151; }
    .detail-table tr td:last-child { color: #111827; }
    .next-steps { background: #f0f7ff; border: 1px solid #c9dcef; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px; }
    .next-steps h3 { color: #0f2747; font-size: 14px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
    .next-steps ol { padding-left: 18px; }
    .next-steps li { font-size: 14px; color: #374151; line-height: 1.7; margin-bottom: 4px; }
    .contact { text-align: center; font-size: 13px; color: #6b7280; padding-top: 8px; }
    .contact a { color: #0f2747; font-weight: 600; text-decoration: none; }
    .footer { text-align: center; font-size: 11px; color: #9ca3af; margin-top: 18px; line-height: 1.7; }
    @media (max-width: 480px) {
      .card__header, .card__body { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="logo">
      <img src="https://conveyquote.uk/logo.png" alt="ConveyQuote" />
    </div>

    <div class="card">
      <div class="card__header">
        <h1>${alreadyAccepted ? "Already Confirmed" : "Thank You – Quote Accepted"}</h1>
        <p>${alreadyAccepted
          ? "We had already recorded your instruction — no duplicate action has been taken."
          : "Your instruction has been received. We are now allocating your matter to a panel firm."
        }</p>
      </div>

      <div class="card__body">
        <div class="status-badge">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clip-rule="evenodd" />
          </svg>
          ${alreadyAccepted ? "Instruction already recorded" : "Quote accepted"}
        </div>

        <table class="detail-table">
          <tr>
            <td>Reference</td>
            <td><strong>${escapeHtml(reference)}</strong></td>
          </tr>
          <tr>
            <td>Client name</td>
            <td>${escapeHtml(clientName)}</td>
          </tr>
          <tr>
            <td>Transaction type</td>
            <td>${escapeHtml(transactionType)}</td>
          </tr>
          ${enquiry.property_address ? `<tr>
            <td>Property</td>
            <td>${escapeHtml(String(enquiry.property_address))}</td>
          </tr>` : ""}
          <tr>
            <td>Status</td>
            <td style="color:#065f46;font-weight:700;">Accepted</td>
          </tr>
        </table>

        ${alreadyAccepted ? "" : `
        <div class="next-steps">
          <h3>What happens next</h3>
          <ol>
            <li>We are allocating your matter to a suitable panel solicitor firm.</li>
            <li>You will receive a welcome pack and client care letter from the firm directly.</li>
            <li>The firm will request your ID and any further information needed to open your file.</li>
            <li>Your conveyancing matter will then begin in earnest.</li>
          </ol>
        </div>
        `}

        <p style="margin-bottom:0;">
          If you have any questions in the meantime, please do not hesitate to contact us.
        </p>

        <div class="contact" style="margin-top:16px;">
          <a href="mailto:info@conveyquote.uk">info@conveyquote.uk</a>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>ConveyQuote is a trading name of Essentially Law Limited (Company No. 14625839).</p>
      <p>We are not a firm of solicitors. Legal services are provided by independent SRA-regulated firms.</p>
    </div>
  </div>
</body>
</html>`);
  } catch (error) {
    return textResponse(
      `Error accepting quote: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      500
    );
  }
}
