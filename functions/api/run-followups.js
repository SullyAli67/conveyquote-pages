// Three-touch follow-up nudge runner.
//
// Invoked by a Cloudflare Cron Trigger (POST) or manually by an admin (GET,
// usually with ?dryRun=true). Both methods require a bearer token matching
// env.FOLLOWUP_SECRET; unauthenticated requests get an intentionally vague 401.

import { buildUnsubUrl } from "../lib/unsub.js";
//
// Decision logic for an eligible enquiry (quote_sent_at NOT NULL, status not
// terminal, follow-ups not paused, less than 15 days old):
//   daysSinceQuote >= 13 and stage < 3 -> send day 13 (final), set stage = 3
//   daysSinceQuote >= 8  and stage < 2 -> send day 8  (mid),   set stage = 2
//   daysSinceQuote >= 3  and stage < 1 -> send day 3  (gentle),set stage = 1
//   else skip
// A missed day fires the higher stage only — no belated catch-up sends.

const PHONE_DISPLAY = "07592 654 666";
const PHONE_TEL = "+447592654666";
const LOGO_URL = "https://conveyquote.uk/logo.png";
const FROM_ADDRESS = "ConveyQuote <quotes@conveyquote.uk>";
const REPLY_TO = "info@conveyquote.uk";

// Terminal values on the main `status` column. 'instructed' lives here too
// (set manually from the admin UI when a matter has been handed off).
const TERMINAL_STATUSES = ["accepted", "rejected", "archived", "instructed"];
// Terminal values on the firm-side `case_status` column. Mostly redundant
// (matters with these set will already have status='accepted') but belt and
// braces in case an admin reverts the main status manually.
const TERMINAL_CASE_STATUSES = ["completed", "withdrawn", "fallen_through"];
const MAX_PER_RUN = 50;

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// ── Small helpers ────────────────────────────────────────────────────────────

const safe = (value) => (value === null || value === undefined ? "" : String(value));

const escapeHtml = (value) =>
  safe(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const cleanMoney = (value) =>
  safe(value).replace(/£/g, "").replace(/,/g, "").trim();

const formatMoney = (value) => {
  const number = Number(value || 0);
  if (Number.isNaN(number)) return "0.00";
  return number.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDisplayMoney = (value) => {
  const cleaned = cleanMoney(value);
  if (!cleaned) return "";
  const number = Number(cleaned);
  if (Number.isNaN(number)) return cleaned;
  return formatMoney(number);
};

const firstNameOf = (name) => safe(name).trim().split(/\s+/)[0] || "there";

const formatLongDate = (date) =>
  date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// Returns whole days elapsed from quoteSentIso to now (UTC-aligned).
export function daysSinceQuote(quoteSentIso, nowMs = Date.now()) {
  const sentMs = Date.parse(quoteSentIso);
  if (Number.isNaN(sentMs)) return -1;
  return Math.floor((nowMs - sentMs) / (1000 * 60 * 60 * 24));
}

// Pure decision: given current stage and days elapsed, return the stage to
// send next (1/2/3) or null if nothing is due.
export function decideStage(currentStage, daysElapsed) {
  if (daysElapsed >= 13 && currentStage < 3) return 3;
  if (daysElapsed >= 8 && currentStage < 2) return 2;
  if (daysElapsed >= 3 && currentStage < 1) return 1;
  return null;
}

// ── Email rendering ──────────────────────────────────────────────────────────

const STAGE_LABELS = { 1: "day3", 2: "day8", 3: "day13" };

// Per-stage copy. Subject is a function so it can include the first name.
const STAGE_CONFIG = {
  1: {
    key: "day3",
    headerBar: "Just checking in",
    subject: (first) => `${first}, any questions about your conveyancing quote?`,
    intro: (first) =>
      `Hi ${escapeHtml(first)}, just a quick note to check you received your conveyancing quote a few days ago. We're happy to answer any questions before you decide — there's no pressure either way.`,
    recapPreamble: "Here's a quick recap of your quote:",
    closingHtml: (phoneDisplay, phoneTel) =>
      `If you'd prefer to talk it through, you can reply to this email or call us on <a href="tel:${phoneTel}" style="color:#0f2747;text-decoration:none;font-weight:600;">${escapeHtml(phoneDisplay)}</a>. We're available Monday to Friday, 9am to 5pm.`,
    showExpiry: false,
    expiryProminent: false,
    declineLinkStyle: "subtle",
  },
  2: {
    key: "day8",
    headerBar: "Quote reminder",
    subject: (first) =>
      `${first}, your conveyancing quote expires in 6 days`,
    intro: (first) =>
      `Hi ${escapeHtml(first)}, your conveyancing quote is valid for another 6 days. We didn't want it to slip your mind — here's a quick reminder of the details:`,
    recapPreamble: "",
    closingHtml: (phoneDisplay, phoneTel) =>
      `Got questions about the quote, the process, or what happens once you accept? Reply to this email or call us on <a href="tel:${phoneTel}" style="color:#0f2747;text-decoration:none;font-weight:600;">${escapeHtml(phoneDisplay)}</a>.`,
    showExpiry: true,
    expiryProminent: false,
    declineLinkStyle: "subtle",
  },
  3: {
    key: "day13",
    headerBar: "Final reminder",
    subject: (first) =>
      `${first}, your conveyancing quote expires tomorrow`,
    intro: (first) =>
      `Hi ${escapeHtml(first)}, your conveyancing quote expires tomorrow. If you'd still like to proceed at the quoted price, now's the time to lock it in:`,
    recapPreamble: "",
    closingHtml: () =>
      `If your circumstances have changed and this isn't going ahead, a quick tap below lets us know and helps us improve. No reply needed if you'd just like the quote to lapse.`,
    showExpiry: true,
    expiryProminent: true,
    declineLinkStyle: "subtle",
  },
};

// Renders the follow-up email HTML + subject for a given stage and enquiry.
// Pure function — exported so it can be exercised from a Node verification
// script without touching Resend or D1.
export function renderFollowupEmail(stage, data) {
  const config = STAGE_CONFIG[stage];
  if (!config) throw new Error(`unknown stage ${stage}`);

  const firstName = firstNameOf(data.clientName);
  const reference = safe(data.reference);
  const displayAmount = formatDisplayMoney(data.amount);
  const expiryFormatted = data.expiryDate
    ? formatLongDate(data.expiryDate)
    : "";

  const acceptUrl = `https://conveyquote.uk/api/accept-quote?ref=${encodeURIComponent(reference)}`;
  const rejectUrl = `https://conveyquote.uk/api/reject-quote?ref=${encodeURIComponent(reference)}`;
  const unsubUrl = safe(data.unsubUrl);

  const subject = config.subject(firstName);

  const recapRows = [
    `<tr><td style="padding:6px 0;color:#52606d;font-size:13px;">Reference</td>
        <td style="padding:6px 0;color:#0f2747;font-size:13px;font-weight:700;text-align:right;">${escapeHtml(reference)}</td></tr>`,
    displayAmount
      ? `<tr><td style="padding:6px 0;color:#52606d;font-size:13px;">Estimated total</td>
            <td style="padding:6px 0;color:#0f2747;font-size:15px;font-weight:700;text-align:right;">£${escapeHtml(displayAmount)}</td></tr>`
      : "",
    config.showExpiry && expiryFormatted
      ? `<tr><td style="padding:6px 0;color:#52606d;font-size:13px;">Quote valid until</td>
            <td style="padding:6px 0;color:#0f2747;font-size:13px;font-weight:700;text-align:right;">${escapeHtml(expiryFormatted)}</td></tr>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const recapBoxHtml = `
    <tr>
      <td style="padding:0 28px 20px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#f8fafc;border:1px solid #d9e2ec;border-radius:8px;">
          <tr>
            <td style="padding:16px 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                ${recapRows}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  const acceptButtonStyle = config.expiryProminent
    ? "display:inline-block;background:#0f2747;color:#ffffff;text-decoration:none;padding:16px 32px;border-radius:10px;font-weight:bold;font-size:17px;box-shadow:0 4px 12px rgba(15,39,71,0.18);"
    : "display:inline-block;background:#0f2747;color:#ffffff;text-decoration:none;padding:14px 26px;border-radius:8px;font-weight:bold;font-size:15px;";

  const declineLinkHtml = `
    <a href="${rejectUrl}" style="color:#6b7280;text-decoration:underline;font-size:13px;">
      Not the right fit? Let us know
    </a>
  `;

  const recapPreambleHtml = config.recapPreamble
    ? `<p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;color:#4b5563;">${escapeHtml(config.recapPreamble)}</p>`
    : "";

  const closingHtml = config.closingHtml(PHONE_DISPLAY, PHONE_TEL);

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f2f4f7;font-family:Arial,Helvetica,sans-serif;color:#222;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f2f4f7;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="max-width:640px;width:100%;border-collapse:collapse;">

            <tr>
              <td align="center" style="padding:0 0 12px 0;">
                <img src="${LOGO_URL}" alt="ConveyQuote" width="120" style="display:block;width:120px;max-width:120px;height:auto;border:0;margin:0 auto;" />
              </td>
            </tr>

            <tr>
              <td style="background:#ffffff;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">

                  <tr>
                    <td style="background:#0f2747;padding:20px 28px;color:#ffffff;">
                      <div style="font-size:12px;letter-spacing:0.5px;text-transform:uppercase;opacity:0.85;">
                        ConveyQuote
                      </div>
                      <div style="font-size:24px;line-height:1.25;font-weight:bold;margin-top:6px;">
                        ${escapeHtml(config.headerBar)}
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:24px 28px 8px 28px;">
                      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#222;">
                        ${config.intro(firstName)}
                      </p>
                      ${recapPreambleHtml}
                    </td>
                  </tr>

                  ${recapBoxHtml}

                  <tr>
                    <td align="center" style="padding:0 28px 8px 28px;">
                      <a href="${acceptUrl}" style="${acceptButtonStyle}">
                        Accept Quote
                      </a>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding:6px 28px 18px 28px;">
                      ${declineLinkHtml}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 28px 24px 28px;">
                      <p style="margin:0;font-size:14px;line-height:1.7;color:#4b5563;">
                        ${closingHtml}
                      </p>
                    </td>
                  </tr>

                  ${unsubUrl ? `
                  <tr>
                    <td style="text-align:center;padding:16px 28px 0;font-size:12px;color:#9ca3af;line-height:1.6;">
                      No longer interested in reminders for this quote?
                      <a href="${unsubUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe from these reminders</a>
                    </td>
                  </tr>
                  ` : ""}

                  <tr>
                    <td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.7;color:#6b7280;text-align:center;">
                      ConveyQuote is a trading name of Essentially Law Limited (Company No. 14625839).<br />
                      We are not a firm of solicitors. Legal services are provided by independent SRA-regulated firms.
                    </td>
                  </tr>

                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 10px 0 10px;text-align:center;font-size:12px;line-height:1.7;color:#6b7280;">
                ConveyQuote · <a href="mailto:info@conveyquote.uk" style="color:#0f2747;text-decoration:none;">info@conveyquote.uk</a>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html };
}

// ── Auth ─────────────────────────────────────────────────────────────────────

function checkAuth(request, env) {
  const expected = env.FOLLOWUP_SECRET;
  if (!expected) return false;
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/);
  if (!match) return false;
  return match[1].trim() === expected;
}

// ── Core runner ──────────────────────────────────────────────────────────────

async function fetchEligible(env) {
  const statusPlaceholders = TERMINAL_STATUSES.map(() => "?").join(",");
  const casePlaceholders = TERMINAL_CASE_STATUSES.map(() => "?").join(",");
  // INNER JOIN: no followup_state row means no quote_sent_at to compute
  // against, so those enquiries are correctly excluded.
  const sql = `
    SELECT e.reference,
           e.client_name,
           e.client_email,
           e.transaction_type,
           e.approved_quote_amount,
           fs.quote_sent_at,
           COALESCE(fs.followup_stage, 0) AS followup_stage
      FROM enquiries e
      INNER JOIN followup_state fs ON fs.enquiry_reference = e.reference
     WHERE e.status NOT IN (${statusPlaceholders})
       AND (e.case_status IS NULL OR e.case_status NOT IN (${casePlaceholders}))
       AND fs.quote_sent_at IS NOT NULL
       AND fs.followups_disabled = 0
       AND fs.followup_stage < 3
       AND fs.quote_sent_at > datetime('now', '-15 days')
     ORDER BY fs.quote_sent_at ASC
     LIMIT ${MAX_PER_RUN}
  `;
  const result = await env.DB.prepare(sql)
    .bind(...TERMINAL_STATUSES, ...TERMINAL_CASE_STATUSES)
    .all();
  return result.results || [];
}

async function sendResendEmail(env, to, subject, html, unsubUrl) {
  const payload = {
    from: FROM_ADDRESS,
    to: [to],
    reply_to: REPLY_TO,
    subject,
    html,
  };
  // RFC 8058 one-click unsubscribe — surfaces a native button in Gmail /
  // Yahoo / Outlook. Resend forwards custom headers via the `headers` field.
  if (unsubUrl) {
    payload.headers = {
      "List-Unsubscribe": `<${unsubUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    };
  }
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });
}

async function runFollowups(context, { dryRun }) {
  const { env } = context;
  const ranAt = new Date().toISOString();
  const now = Date.now();

  let rows;
  try {
    rows = await fetchEligible(env);
  } catch (err) {
    console.error("run-followups: fetchEligible failed", err);
    return jsonResponse(
      { success: false, error: "Database query failed", ranAt },
      500
    );
  }

  const details = [];
  const stages = { day3: 0, day8: 0, day13: 0 };
  let sentCount = 0;
  let failedCount = 0;

  for (const row of rows) {
    const daysElapsed = daysSinceQuote(row.quote_sent_at, now);
    const nextStage = decideStage(row.followup_stage || 0, daysElapsed);

    if (nextStage === null) {
      details.push({
        reference: row.reference,
        stage: "none",
        status: "skipped",
        daysElapsed,
      });
      continue;
    }

    // Expiry is exactly 14 days after quote_sent_at (matches the customer
    // email's "Lock in this price by..." copy in send-approved-quote.js).
    const sentMs = Date.parse(row.quote_sent_at);
    const expiryDate = new Date(sentMs + 14 * 24 * 60 * 60 * 1000);

    const unsubUrl = await buildUnsubUrl(row.reference, env);

    const { subject, html } = renderFollowupEmail(nextStage, {
      clientName: row.client_name,
      reference: row.reference,
      amount: row.approved_quote_amount,
      expiryDate,
      unsubUrl,
    });

    const stageKey = STAGE_LABELS[nextStage];

    if (dryRun) {
      console.log(
        `[dry-run] would send ${stageKey} to ${row.client_email} for ${row.reference}`
      );
      details.push({
        reference: row.reference,
        stage: stageKey,
        status: "dry-run",
        recipient: row.client_email,
        subject,
      });
      stages[stageKey] += 1;
      sentCount += 1;
      continue;
    }

    if (!row.client_email) {
      console.error(`run-followups: ${row.reference} missing client_email`);
      details.push({
        reference: row.reference,
        stage: stageKey,
        status: "failed",
        error: "missing email",
      });
      failedCount += 1;
      continue;
    }

    try {
      const resendResponse = await sendResendEmail(
        env,
        row.client_email,
        subject,
        html,
        unsubUrl
      );

      if (!resendResponse.ok) {
        const body = await resendResponse.text().catch(() => "");
        console.error(
          `run-followups: Resend failed for ${row.reference}`,
          resendResponse.status,
          body
        );
        details.push({
          reference: row.reference,
          stage: stageKey,
          status: "failed",
          error: `resend ${resendResponse.status}`,
        });
        failedCount += 1;
        continue;
      }

      await env.DB.prepare(
        `UPDATE followup_state
            SET followup_stage = ?,
                last_followup_at = datetime('now')
          WHERE enquiry_reference = ?`
      )
        .bind(nextStage, row.reference)
        .run();

      stages[stageKey] += 1;
      sentCount += 1;
      details.push({
        reference: row.reference,
        stage: stageKey,
        status: "sent",
      });
    } catch (err) {
      console.error(`run-followups: send failed for ${row.reference}`, err);
      details.push({
        reference: row.reference,
        stage: stageKey,
        status: "failed",
        error: err instanceof Error ? err.message : "unknown",
      });
      failedCount += 1;
    }
  }

  return jsonResponse({
    ranAt,
    dryRun,
    eligibleCount: rows.length,
    sentCount,
    failedCount,
    stages,
    details,
  });
}

// ── Handlers ─────────────────────────────────────────────────────────────────

function unauthorized() {
  return jsonResponse({ error: "unauthorized" }, 401);
}

export async function onRequestPost(context) {
  const { request } = context;
  if (!checkAuth(request, context.env)) return unauthorized();
  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "true";
  return runFollowups(context, { dryRun });
}

export async function onRequestGet(context) {
  const { request } = context;
  if (!checkAuth(request, context.env)) return unauthorized();
  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "true";
  return runFollowups(context, { dryRun });
}
