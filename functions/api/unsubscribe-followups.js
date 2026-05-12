// Customer-facing unsubscribe for the follow-up nudge sequence.
//
// GET /api/unsubscribe-followups?ref=XXX&token=YYY
//
// Unsubscribing only stops reminders — it does NOT decline the quote. The
// customer can still come back and accept via the original email. We send
// an internal notification on the first unsubscribe so Sully knows.

import { computeUnsubToken, unsubSigningKey, tokensEqual } from "../lib/unsub.js";

const PHONE_DISPLAY = "07592 654 666";
const PHONE_TEL = "+447592654666";

const htmlResponse = (html, status = 200) =>
  new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const SHARED_STYLES = `
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
  .contact { text-align: center; font-size: 13px; color: #6b7280; padding-top: 8px; }
  .contact a { color: #0f2747; font-weight: 600; text-decoration: none; }
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

function renderConfirmation() {
  return renderShell(
    "Reminders stopped",
    `
      <div class="card__header">
        <h1>Reminders stopped</h1>
        <p>You won't receive any further follow-up emails about this quote.</p>
      </div>
      <div class="card__body">
        <p>We won't send any more reminder emails for this quote. Your quote remains valid until its expiry date — you can still accept or decline at any time using the original quote email.</p>
        <p>If you need anything, you can reach us at <a href="mailto:info@conveyquote.uk" style="color:#0f2747;font-weight:600;text-decoration:none;">info@conveyquote.uk</a> or on <a href="tel:${PHONE_TEL}" style="color:#0f2747;font-weight:600;text-decoration:none;">${escapeHtml(PHONE_DISPLAY)}</a>.</p>
        <div class="contact" style="margin-top:16px;">
          <a href="https://conveyquote.uk/">Back to ConveyQuote</a>
        </div>
      </div>
    `
  );
}

function renderNotFound() {
  return renderShell(
    "Quote not found",
    `
      <div class="card__header">
        <h1>We couldn't find that quote</h1>
        <p>The reference in this link doesn't match anything in our records.</p>
      </div>
      <div class="card__body">
        <p>It's possible the link was truncated by your email client, or the quote was archived. If you'd like help, please email <a href="mailto:info@conveyquote.uk" style="color:#0f2747;font-weight:600;text-decoration:none;">info@conveyquote.uk</a> and we'll sort it out.</p>
      </div>
    `
  );
}

function renderInvalidLink() {
  return renderShell(
    "Invalid link",
    `
      <div class="card__header">
        <h1>This link looks invalid or has expired</h1>
        <p>We weren't able to verify the unsubscribe request.</p>
      </div>
      <div class="card__body">
        <p>If you'd like us to stop sending reminders, please reply to any of the quote emails or contact us at <a href="mailto:info@conveyquote.uk" style="color:#0f2747;font-weight:600;text-decoration:none;">info@conveyquote.uk</a> and we'll take care of it manually.</p>
      </div>
    `
  );
}

async function sendInternalNotification(env, reference, clientName, clientEmail) {
  if (!env.RESEND_API_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ConveyQuote <noreply@conveyquote.uk>",
        to: ["info@conveyquote.uk"],
        subject: `Client unsubscribed from follow-ups — ${reference}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
            <p>A client has unsubscribed from follow-up reminders.</p>
            <table style="border-collapse:collapse;margin-top:12px;">
              <tr><td style="padding:6px 12px 6px 0;color:#6b7280;">Reference</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(reference)}</td></tr>
              <tr><td style="padding:6px 12px 6px 0;color:#6b7280;">Client</td><td style="padding:6px 0;">${escapeHtml(clientName || "—")}</td></tr>
              <tr><td style="padding:6px 12px 6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;">${escapeHtml(clientEmail || "—")}</td></tr>
            </table>
            <p style="margin-top:16px;color:#6b7280;font-size:13px;">The quote remains open — they can still accept or decline at any time.</p>
          </div>
        `,
      }),
    });
  } catch (err) {
    console.error("Unsubscribe notification failed", err);
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const reference = url.searchParams.get("ref") || "";
  const token = url.searchParams.get("token") || "";

  if (!reference || !token) {
    return htmlResponse(renderInvalidLink(), 400);
  }

  const enquiry = await env.DB.prepare(
    `SELECT reference, client_name, client_email FROM enquiries WHERE reference = ? LIMIT 1`
  )
    .bind(reference)
    .first();

  if (!enquiry) {
    return htmlResponse(renderNotFound(), 404);
  }

  const expected = await computeUnsubToken(reference, unsubSigningKey(env));
  if (!expected || !tokensEqual(token, expected)) {
    return htmlResponse(renderInvalidLink(), 400);
  }

  // Look up existing followup_state to know whether this is the first
  // unsubscribe (for the internal notification, which is idempotent).
  const existing = await env.DB.prepare(
    `SELECT followups_disabled FROM followup_state WHERE enquiry_reference = ? LIMIT 1`
  )
    .bind(reference)
    .first();

  const alreadyDisabled = existing && Number(existing.followups_disabled) === 1;

  if (existing) {
    if (!alreadyDisabled) {
      await env.DB.prepare(
        `UPDATE followup_state SET followups_disabled = 1 WHERE enquiry_reference = ?`
      )
        .bind(reference)
        .run();
    }
  } else {
    // Stub row so the unsubscribe sticks even if a quote is sent later.
    // send-approved-quote.js uses ON CONFLICT DO UPDATE that intentionally
    // omits followups_disabled, so this row's followups_disabled = 1
    // survives subsequent quote sends.
    await env.DB.prepare(
      `INSERT INTO followup_state
         (enquiry_reference, quote_sent_at, followup_stage, last_followup_at, followups_disabled)
       VALUES (?, NULL, 0, NULL, 1)`
    )
      .bind(reference)
      .run();
  }

  if (!alreadyDisabled) {
    await sendInternalNotification(
      env,
      reference,
      enquiry.client_name,
      enquiry.client_email
    );
  }

  return htmlResponse(renderConfirmation(), 200);
}
