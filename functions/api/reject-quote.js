// MUST STAY IN SYNC with the REASONS mapping in src/App.tsx (admin UI display).
// Keys are persisted in enquiries.decline_reason; labels are user-facing.
const REASONS = {
  price: "Price was higher than expected",
  different_firm: "I went with a different firm",
  not_ready: "I'm not ready yet / my purchase fell through",
  timeline: "The timeline didn't work",
  other: "Something else",
  skip: "(no reason given)",
};

// Reasons that are valid terminal decline records (POST handles "other").
const TERMINAL_GET_REASONS = new Set([
  "price",
  "different_firm",
  "not_ready",
  "timeline",
  "skip",
]);

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

// ─── Page templates ─────────────────────────────────────────────────────────

const SHARED_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; background: #f2f4f7; min-height: 100vh; padding: 32px 16px; color: #1a2a3a; }
  .wrap { max-width: 640px; margin: 0 auto; }
  .logo { text-align: center; margin-bottom: 20px; }
  .logo img { width: 110px; height: auto; }
  .card { background: #ffffff; border: 1px solid #d9e2ec; border-radius: 14px; overflow: hidden; }
  .card__header { background: #0f2747; padding: 24px 28px; }
  .card__header h1 { color: #fff; font-size: 24px; line-height: 1.25; margin-bottom: 6px; }
  .card__header p { color: rgba(255,255,255,0.88); font-size: 14px; line-height: 1.6; }
  .card__body { padding: 24px 28px; }
  .card__body p { font-size: 15px; line-height: 1.7; color: #374151; margin-bottom: 14px; }
  .reason-list { display: flex; flex-direction: column; gap: 10px; margin: 8px 0 16px 0; }
  .reason-btn {
    display: block;
    width: 100%;
    min-height: 56px;
    padding: 16px 18px;
    background: #ffffff;
    color: #0f2747;
    border: 1px solid #0f2747;
    border-radius: 10px;
    text-decoration: none;
    font-size: 15px;
    font-weight: 600;
    text-align: left;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }
  .reason-btn:hover {
    background: #f0fbfc;
    border-color: #0aa6b5;
    color: #064a52;
  }
  .skip-link {
    display: inline-block;
    margin-top: 6px;
    font-size: 13px;
    color: #6b7280;
    text-decoration: underline;
  }
  .skip-link:hover { color: #0f2747; }
  textarea {
    width: 100%;
    min-height: 140px;
    padding: 12px 14px;
    border: 1px solid #d9e2ec;
    border-radius: 10px;
    font-size: 15px;
    line-height: 1.5;
    font-family: inherit;
    color: #1a2a3a;
    resize: vertical;
  }
  textarea:focus {
    outline: none;
    border-color: #0aa6b5;
    box-shadow: 0 0 0 4px rgba(10, 166, 181, 0.14);
  }
  .primary-button {
    display: inline-block;
    margin-top: 14px;
    padding: 12px 22px;
    background: #0f2747;
    color: #ffffff;
    border: 0;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    text-decoration: none;
  }
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #e7ecf3;
    color: #0f2747;
    border-radius: 20px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 16px;
  }
  .status-badge svg { width: 14px; height: 14px; flex-shrink: 0; }
  .footer { text-align: center; font-size: 11px; color: #9ca3af; margin-top: 18px; line-height: 1.7; }
  @media (max-width: 480px) {
    .card__header, .card__body { padding: 20px; }
  }
`;

const FOOTER_HTML = `
  <div class="footer">
    ConveyQuote is a trading name of Essentially Law Limited (Company No. 14625839).<br />
    We are not a firm of solicitors. Legal services are provided by independent SRA-regulated firms.
  </div>
`;

const renderShell = (title, bodyHtml) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} – ConveyQuote</title>
  <style>${SHARED_STYLES}</style>
</head>
<body>
  <div class="wrap">
    <div class="logo">
      <img src="https://conveyquote.uk/logo.png" alt="ConveyQuote" />
    </div>
    <div class="card">
      ${bodyHtml}
    </div>
    ${FOOTER_HTML}
  </div>
</body>
</html>`;

const renderPickerPage = (reference) => {
  const ref = encodeURIComponent(reference);
  const buttonRows = ["price", "different_firm", "not_ready", "timeline", "other"]
    .map(
      (code) => `
        <a href="?ref=${ref}&reason=${code}" class="reason-btn">${escapeHtml(
        REASONS[code]
      )}</a>
      `
    )
    .join("");

  return renderShell(
    "Mind telling us why?",
    `
    <div class="card__header">
      <h1>Mind telling us why?</h1>
      <p>A quick tap helps us improve. We won't follow up unless you'd like us to.</p>
    </div>
    <div class="card__body">
      <div class="reason-list">${buttonRows}</div>
      <a href="?ref=${ref}&reason=skip" class="skip-link">Skip this — just record my decline</a>
    </div>
    `
  );
};

const renderFreeTextPage = (reference) => {
  const ref = encodeURIComponent(reference);

  return renderShell(
    "Tell us a bit more",
    `
    <div class="card__header">
      <h1>Tell us a bit more</h1>
      <p>Even a few words helps. Optional — you can submit blank.</p>
    </div>
    <div class="card__body">
      <form method="POST" action="/api/reject-quote?ref=${ref}">
        <input type="hidden" name="reason" value="other" />
        <textarea name="text" rows="5" maxlength="500" placeholder="What didn't quite fit?"></textarea>
        <div>
          <button type="submit" class="primary-button">Send</button>
        </div>
      </form>
      <p style="margin-top:18px;margin-bottom:0;">
        <a href="?ref=${ref}&reason=skip" class="skip-link">Skip — just record my decline</a>
      </p>
    </div>
    `
  );
};

const renderThankYouPage = ({ alreadyRecorded }) =>
  renderShell(
    "Thanks — your reply has been recorded",
    `
    <div class="card__header">
      <h1>Thanks — your reply has been recorded</h1>
    </div>
    <div class="card__body">
      <div class="status-badge">
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clip-rule="evenodd" />
        </svg>
        Decline recorded
      </div>
      <p>
        We appreciate you taking a moment to let us know. If you change your mind, or if circumstances change later in your transaction, just reply to your quote email or contact us at <a href="mailto:info@conveyquote.uk" style="color:#0f2747;font-weight:600;text-decoration:none;">info@conveyquote.uk</a>.
      </p>
      ${
        alreadyRecorded
          ? `<p style="margin-bottom:0;color:#6b7280;font-size:13px;">We had already recorded your reply earlier, so no duplicate action has been taken.</p>`
          : ""
      }
    </div>
    `
  );

// ─── Email senders ──────────────────────────────────────────────────────────

const buildInternalEmailHtml = ({
  reference,
  clientName,
  clientEmail,
  transactionType,
  reasonLabel,
  reasonText,
}) => `
  <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a;background:#f4f6f8;padding:24px;">
    <div style="max-width:700px;margin:0 auto;background:#ffffff;border:1px solid #d9e2ec;border-radius:10px;overflow:hidden;">
      <div style="background:#0f2747;color:#ffffff;padding:20px 24px;">
        <h2 style="margin:0;">Client declined quote</h2>
      </div>
      <div style="padding:24px;">
        <p style="margin-top:0;">A client has declined their conveyancing quote.</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0;">
          <tr>
            <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;width:35%;">Reference</td>
            <td style="padding:10px 12px;border:1px solid #d9d9d9;">${escapeHtml(reference)}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;">Client name</td>
            <td style="padding:10px 12px;border:1px solid #d9d9d9;">${escapeHtml(clientName)}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;">Client email</td>
            <td style="padding:10px 12px;border:1px solid #d9d9d9;">${escapeHtml(clientEmail)}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;">Transaction type</td>
            <td style="padding:10px 12px;border:1px solid #d9d9d9;">${escapeHtml(transactionType)}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;">Status</td>
            <td style="padding:10px 12px;border:1px solid #d9d9d9;">Rejected</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;">Decline reason</td>
            <td style="padding:10px 12px;border:1px solid #d9d9d9;">${escapeHtml(reasonLabel)}</td>
          </tr>
          ${
            reasonText
              ? `<tr>
                  <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;vertical-align:top;">Customer added</td>
                  <td style="padding:10px 12px;border:1px solid #d9d9d9;white-space:pre-wrap;">${escapeHtml(reasonText)}</td>
                </tr>`
              : ""
          }
        </table>
      </div>
    </div>
  </div>
`;

// Specific reasons that warrant a single soft acknowledgement line in the
// customer email. Skip / other-blank / other-with-text deliberately do NOT
// echo the reason back to the customer.
const CUSTOMER_REASON_ACK = {
  price: "Thanks for letting us know that price was a factor.",
  different_firm: "Thanks for letting us know you've gone with another firm.",
  not_ready: "Thanks for letting us know — we hope it works out, and we're here if you want to revisit later.",
  timeline: "Thanks for letting us know that the timeline didn't suit.",
};

const buildCustomerAckHtml = ({
  reference,
  clientName,
  transactionType,
  reasonAckLine,
}) => `
  <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a;background:#f4f6f8;padding:24px;">
    <div style="max-width:700px;margin:0 auto;background:#ffffff;border:1px solid #d9e2ec;border-radius:10px;overflow:hidden;">
      <div style="background:#0f2747;color:#ffffff;padding:20px 24px;">
        <h2 style="margin:0;">Thank you for letting us know</h2>
      </div>
      <div style="padding:24px;">
        <p style="margin-top:0;">Dear ${escapeHtml(clientName)},</p>
        <p>We have recorded that you do not wish to proceed with this quote at present.</p>
        ${reasonAckLine ? `<p>${escapeHtml(reasonAckLine)}</p>` : ""}
        <table style="border-collapse:collapse;width:100%;margin:16px 0 24px 0;">
          <tr>
            <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;width:35%;">Reference</td>
            <td style="padding:10px 12px;border:1px solid #d9d9d9;">${escapeHtml(reference)}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;">Transaction type</td>
            <td style="padding:10px 12px;border:1px solid #d9d9d9;">${escapeHtml(transactionType)}</td>
          </tr>
        </table>
        <p>
          If your circumstances change and you would like to revisit the matter, just reply to this email or contact us at
          <a href="mailto:info@conveyquote.uk">info@conveyquote.uk</a>.
        </p>
      </div>
    </div>
  </div>
`;

// Risk 1 — customer-facing endpoint. The customer's decline is
// recorded BEFORE these emails go out (see callers) and is the
// user-facing outcome that must always succeed; we must never show
// the customer a 500 error page because an internal Resend call
// failed. This function used to throw on either email failure,
// which the outer try/catch then surfaced as a generic 500 to the
// customer. It now returns a structured outcome — the caller logs
// it onto the enquiry's email-tracking columns and the customer
// still sees the clean thank-you page either way.
const sendDeclineEmails = async ({
  env,
  reference,
  clientName,
  clientEmail,
  transactionType,
  reasonKey,
  reasonText,
}) => {
  const reasonLabel = REASONS[reasonKey] || REASONS.skip;
  const reasonAckLine = CUSTOMER_REASON_ACK[reasonKey] || "";

  const errors = [];
  let customerOk = false;
  let customerMessageId = null;

  try {
    const internalEmail = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ConveyQuote <quotes@conveyquote.uk>",
        to: ["info@conveyquote.uk"],
        reply_to: "info@conveyquote.uk",
        subject: `Client declined quote - ${reference}`,
        html: buildInternalEmailHtml({
          reference,
          clientName,
          clientEmail,
          transactionType,
          reasonLabel,
          reasonText,
        }),
      }),
    });
    if (!internalEmail.ok) {
      const body = await internalEmail.text().catch(() => "");
      const detail = `HTTP ${internalEmail.status} ${body}`.slice(0, 240);
      errors.push(`internal: ${detail}`);
      console.error(
        `reject-quote: internal notification failed for ref=${reference}: ${detail}`
      );
    }
  } catch (err) {
    const detail = String(err instanceof Error ? err.message : err).slice(0, 240);
    errors.push(`internal: ${detail}`);
    console.error(
      `reject-quote: internal notification threw for ref=${reference}:`,
      err
    );
  }

  try {
    const customerEmail = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ConveyQuote <quotes@conveyquote.uk>",
        to: [clientEmail],
        reply_to: "info@conveyquote.uk",
        subject: `We've recorded your decision - ${reference}`,
        html: buildCustomerAckHtml({
          reference,
          clientName,
          transactionType,
          reasonAckLine,
        }),
      }),
    });
    if (!customerEmail.ok) {
      const body = await customerEmail.text().catch(() => "");
      const detail = `HTTP ${customerEmail.status} ${body}`.slice(0, 240);
      errors.push(`client: ${detail}`);
      console.error(
        `reject-quote: client confirmation failed for ref=${reference}: ${detail}`
      );
    } else {
      const okJson = await customerEmail.json().catch(() => ({}));
      customerMessageId = okJson?.id || null;
      customerOk = true;
    }
  } catch (err) {
    const detail = String(err instanceof Error ? err.message : err).slice(0, 240);
    errors.push(`client: ${detail}`);
    console.error(
      `reject-quote: client confirmation threw for ref=${reference}:`,
      err
    );
  }

  return {
    customerOk,
    customerMessageId,
    lastError: errors.length ? errors.join("; ").slice(0, 240) : null,
  };
};

const recordEmailOutcome = async (env, reference, outcome) => {
  try {
    await env.DB.prepare(
      `UPDATE enquiries
          SET client_email_sent_at    = COALESCE(?, client_email_sent_at),
              client_email_message_id = COALESCE(?, client_email_message_id),
              client_email_last_error = ?
        WHERE reference = ?`
    )
      .bind(
        outcome.customerOk ? new Date().toISOString() : null,
        outcome.customerMessageId,
        outcome.lastError,
        reference
      )
      .run();
  } catch (writeErr) {
    console.error(
      `reject-quote: failed to record email outcome on enquiry ref=${reference}:`,
      writeErr
    );
  }
};

// ─── DB helpers ─────────────────────────────────────────────────────────────

const loadEnquiry = async (env, reference) =>
  env.DB.prepare(
    `SELECT reference, client_name, client_email, transaction_type, status
     FROM enquiries WHERE reference = ? LIMIT 1`
  )
    .bind(reference)
    .first();

const recordRejection = async (env, reference, reasonKey, reasonText) =>
  env.DB.prepare(
    `UPDATE enquiries
     SET status = 'rejected',
         decline_reason = ?,
         decline_reason_text = ?
     WHERE reference = ?`
  )
    .bind(reasonKey, reasonText, reference)
    .run();

// ─── Handlers ───────────────────────────────────────────────────────────────

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const reference = url.searchParams.get("ref");
    const reason = url.searchParams.get("reason");

    if (!reference) {
      return textResponse("Missing reference", 400);
    }

    const enquiry = await loadEnquiry(env, reference);

    if (!enquiry) {
      return textResponse(`Quote reference not found: ${reference}`, 404);
    }

    // No reason yet → reason picker
    if (!reason) {
      return htmlResponse(renderPickerPage(reference));
    }

    // Free-text path (state 2). Does not record yet — the POST handler does.
    if (reason === "other") {
      return htmlResponse(renderFreeTextPage(reference));
    }

    // Unknown reason → fall back to picker rather than recording bad data
    if (!TERMINAL_GET_REASONS.has(reason)) {
      return htmlResponse(renderPickerPage(reference));
    }

    // Idempotency — already declined, do not re-record or re-email
    if (enquiry.status === "rejected") {
      return htmlResponse(renderThankYouPage({ alreadyRecorded: true }));
    }

    const clientEmail = enquiry.client_email || "";
    if (!clientEmail) {
      return textResponse(
        `Client email not found for reference: ${reference}`,
        400
      );
    }

    await recordRejection(env, reference, reason, null);

    const outcome = await sendDeclineEmails({
      env,
      reference,
      clientName: enquiry.client_name || "Client",
      clientEmail,
      transactionType: getTransactionLabel(enquiry.transaction_type),
      reasonKey: reason,
      reasonText: null,
    });
    await recordEmailOutcome(env, reference, outcome);

    return htmlResponse(renderThankYouPage({ alreadyRecorded: false }));
  } catch (error) {
    return textResponse(
      `Error rejecting quote: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      500
    );
  }
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const reference = url.searchParams.get("ref");

    if (!reference) {
      return textResponse("Missing reference", 400);
    }

    const enquiry = await loadEnquiry(env, reference);

    if (!enquiry) {
      return textResponse(`Quote reference not found: ${reference}`, 404);
    }

    if (enquiry.status === "rejected") {
      return htmlResponse(renderThankYouPage({ alreadyRecorded: true }));
    }

    const clientEmail = enquiry.client_email || "";
    if (!clientEmail) {
      return textResponse(
        `Client email not found for reference: ${reference}`,
        400
      );
    }

    const formData = await request.formData();
    // POST is the free-text path only — coerce to "other" regardless of what
    // the hidden field actually says.
    const reasonKey = "other";
    const textRaw = String(formData.get("text") || "").trim();
    const reasonText = textRaw ? textRaw.slice(0, 500) : null;

    await recordRejection(env, reference, reasonKey, reasonText);

    const outcome = await sendDeclineEmails({
      env,
      reference,
      clientName: enquiry.client_name || "Client",
      clientEmail,
      transactionType: getTransactionLabel(enquiry.transaction_type),
      reasonKey,
      reasonText,
    });
    await recordEmailOutcome(env, reference, outcome);

    return htmlResponse(renderThankYouPage({ alreadyRecorded: false }));
  } catch (error) {
    return textResponse(
      `Error rejecting quote: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      500
    );
  }
}
