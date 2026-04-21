// functions/api/request-call.js
// Handles call-back requests submitted from /book-call
// Emails info@conveyquote.uk with the request and sends a confirmation to the client.
//
// FUTURE: When the admin calendar tab is built, add a DB insert here:
//   await env.DB.prepare(
//     `INSERT INTO call_requests
//      (quote_ref, client_name, client_email, client_phone, preferred_time, notes, status, created_at)
//      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
//   ).bind(quoteRef, clientName, clientEmail, clientPhone, preferredTime, notes, new Date().toISOString()).run();

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const escapeHtml = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();

    const {
      clientName,
      clientEmail,
      clientPhone,
      preferredTime,
      notes,
      quoteRef,
    } = body;

    // Basic validation
    if (!clientName || !clientEmail || !clientPhone || !preferredTime) {
      return jsonResponse(
        { success: false, error: "Name, email, phone and preferred time are required." },
        400
      );
    }

    if (!env.RESEND_API_KEY) {
      return jsonResponse(
        { success: false, error: "Email service not configured." },
        500
      );
    }

    const receivedAt = new Date().toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Europe/London",
    });

    // ── Admin notification email ─────────────────────────────────────────────
    const adminHtml = `
      <html>
        <body style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f8;padding:24px;color:#10233f;">
          <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dfe5ec;">

            <div style="padding:24px 28px;background:#10233f;color:#ffffff;">
              <h2 style="margin:0 0 6px 0;font-size:20px;">&#128222; New Call-Back Request</h2>
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.75);">Received: ${escapeHtml(receivedAt)}</p>
            </div>

            <div style="padding:24px 28px;">

              <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
                <tr>
                  <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;width:35%;vertical-align:top;">Client name</td>
                  <td style="padding:10px 12px;border:1px solid #d9d9d9;vertical-align:top;">${escapeHtml(clientName)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;">Phone</td>
                  <td style="padding:10px 12px;border:1px solid #d9d9d9;">
                    <a href="tel:${escapeHtml(clientPhone)}" style="color:#0f2747;font-weight:bold;font-size:16px;">${escapeHtml(clientPhone)}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;">Email</td>
                  <td style="padding:10px 12px;border:1px solid #d9d9d9;">
                    <a href="mailto:${escapeHtml(clientEmail)}" style="color:#0f2747;">${escapeHtml(clientEmail)}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;">Preferred time</td>
                  <td style="padding:10px 12px;border:1px solid #d9d9d9;font-weight:bold;color:#1d6f42;">${escapeHtml(preferredTime)}</td>
                </tr>
                ${quoteRef ? `
                <tr>
                  <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;">Quote reference</td>
                  <td style="padding:10px 12px;border:1px solid #d9d9d9;">${escapeHtml(quoteRef)}</td>
                </tr>` : ""}
                ${notes ? `
                <tr>
                  <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;vertical-align:top;">Notes from client</td>
                  <td style="padding:10px 12px;border:1px solid #d9d9d9;">${escapeHtml(notes)}</td>
                </tr>` : ""}
              </table>

              <div style="background:#e8f5e9;border:1px solid #a5d6a7;border-radius:8px;padding:16px 18px;margin-bottom:20px;">
                <p style="margin:0;font-size:14px;color:#1b5e20;">
                  <strong>Next step:</strong> Call <strong>${escapeHtml(clientName)}</strong> on
                  <a href="tel:${escapeHtml(clientPhone)}" style="color:#1b5e20;font-weight:bold;">${escapeHtml(clientPhone)}</a>
                  during their preferred time: <strong>${escapeHtml(preferredTime)}</strong>.
                  ${quoteRef ? `Their quote reference is <strong>${escapeHtml(quoteRef)}</strong>.` : ""}
                </p>
              </div>

              <p style="font-size:12px;color:#9ca3af;margin:0;">
                A confirmation email has been sent automatically to ${escapeHtml(clientEmail)}.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ConveyQuote <quotes@conveyquote.uk>",
        to: ["info@conveyquote.uk"],
        reply_to: clientEmail,
        subject: `Call Request — ${clientName} — ${preferredTime}${quoteRef ? ` — ${quoteRef}` : ""}`,
        html: adminHtml,
      }),
    });

    // ── Client confirmation email ────────────────────────────────────────────
    const clientHtml = `
      <html>
        <body style="margin:0;padding:0;background:#f2f4f7;font-family:Arial,Helvetica,sans-serif;color:#222;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f7;">
            <tr>
              <td align="center" style="padding:24px 12px;">
                <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

                  <tr>
                    <td align="center" style="padding:0 0 16px 0;">
                      <img src="https://conveyquote.uk/logo.png" alt="ConveyQuote" width="90"
                        style="display:block;width:90px;height:auto;border:0;" />
                    </td>
                  </tr>

                  <tr>
                    <td style="background:#ffffff;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

                        <tr>
                          <td style="background:#0f2747;padding:24px 28px;color:#ffffff;">
                            <div style="font-size:11px;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.6);margin-bottom:8px;">ConveyQuote</div>
                            <h1 style="margin:0;font-size:22px;font-weight:700;">We have received your call request</h1>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:24px 28px;">
                            <p style="margin:0 0 14px;font-size:15px;color:#222;">Dear ${escapeHtml(clientName)},</p>
                            <p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#4b5563;">
                              Thank you for requesting a call back. A member of our team will contact you
                              on <strong>${escapeHtml(clientPhone)}</strong> during your preferred time:
                              <strong>${escapeHtml(preferredTime)}</strong>.
                            </p>
                            <p style="margin:0;font-size:14px;line-height:1.7;color:#4b5563;">
                              We will aim to be in touch within one business day. In the meantime, if you
                              have any urgent questions please email us at
                              <a href="mailto:info@conveyquote.uk" style="color:#0f2747;font-weight:600;">info@conveyquote.uk</a>.
                            </p>
                          </td>
                        </tr>

                        ${quoteRef ? `
                        <tr>
                          <td style="padding:0 28px 24px 28px;">
                            <div style="background:#f0f4fa;border:1px solid #c7d6ea;border-radius:8px;padding:14px 16px;font-size:13px;color:#0f2747;">
                              Your quote reference: <strong>${escapeHtml(quoteRef)}</strong>
                            </div>
                          </td>
                        </tr>` : ""}

                        <tr>
                          <td style="padding:0 28px 28px 28px;">
                            <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:16px 18px;">
                              <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0f2747;">Your request summary</p>
                              <p style="margin:0;font-size:13px;color:#4b5563;line-height:1.8;">
                                <strong>Name:</strong> ${escapeHtml(clientName)}<br />
                                <strong>Phone:</strong> ${escapeHtml(clientPhone)}<br />
                                <strong>Preferred time:</strong> ${escapeHtml(preferredTime)}<br />
                                ${notes ? `<strong>Your notes:</strong> ${escapeHtml(notes)}` : ""}
                              </p>
                            </div>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:11px;line-height:1.7;color:#9ca3af;text-align:center;">
                            ConveyQuote is a trading name of Essentially Law Limited (Company No. 14625839).
                            Legal services are provided by independent SRA-regulated firms.
                          </td>
                        </tr>

                      </table>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ConveyQuote <quotes@conveyquote.uk>",
        to: [clientEmail],
        reply_to: "info@conveyquote.uk",
        subject: "Your call request — ConveyQuote",
        html: clientHtml,
      }),
    });

    return jsonResponse({ success: true });

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
