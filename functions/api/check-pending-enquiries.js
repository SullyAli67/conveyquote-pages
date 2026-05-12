// Daily safety-net check for enquiries Sully hasn't actioned within the
// "within one working day" promise. Sends an internal digest email to
// info@conveyquote.uk listing pending enquiries; tracks each alert in
// admin_alerts so the same enquiry isn't nagged about more than once per 24h.
//
// Triggered by a cron-job.org schedule (weekdays 9am UK). Reuses FOLLOWUP_SECRET
// for auth so Sully doesn't have to manage another secret.

const TO_ADDRESS = "info@conveyquote.uk";
const FROM_ADDRESS = "ConveyQuote <noreply@conveyquote.uk>";
const MAX_PER_RUN = 50;
const URGENT_THRESHOLD = 5;

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const safe = (value) => (value === null || value === undefined ? "" : String(value));

const escapeHtml = (value) =>
  safe(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function checkAuth(request, env) {
  const expected = env.FOLLOWUP_SECRET;
  if (!expected) return false;
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/);
  if (!match) return false;
  return match[1].trim() === expected;
}

function prettyType(type) {
  const t = safe(type).toLowerCase();
  if (t === "purchase") return "Purchase";
  if (t === "sale") return "Sale";
  if (t === "sale_purchase") return "Sale & Purchase";
  if (t === "remortgage") return "Remortgage";
  if (t === "remortgage_transfer") return "Remortgage & Transfer";
  if (t === "transfer") return "Transfer of Equity";
  return t ? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";
}

function formatGbp(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return (
    "£" +
    n.toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// Pulls totalIncludingSdlt if present (purchase matters), otherwise grandTotal.
// Tolerates missing / malformed JSON by returning null.
export function extractHeadlineTotal(quoteJsonString) {
  if (!quoteJsonString) return null;
  try {
    const parsed = JSON.parse(quoteJsonString);
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.totalIncludingSdlt === "number") {
        return parsed.totalIncludingSdlt;
      }
      if (typeof parsed.grandTotal === "number") {
        return parsed.grandTotal;
      }
    }
    return null;
  } catch (err) {
    console.error("extractHeadlineTotal: JSON parse failed", err);
    return null;
  }
}

// "19 hours ago", "1 day, 3 hours ago", "3 days ago"
export function formatAge(createdAtIso, nowMs = Date.now()) {
  const createdMs = Date.parse(createdAtIso);
  if (!Number.isFinite(createdMs)) return "—";
  const diffMs = Math.max(0, nowMs - createdMs);
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (totalHours < 1) return "less than an hour ago";
  if (totalHours < 24) return `${totalHours} hour${totalHours === 1 ? "" : "s"} ago`;
  const days = Math.floor(totalHours / 24);
  const remHours = totalHours % 24;
  if (remHours === 0) return `${days} day${days === 1 ? "" : "s"} ago`;
  return `${days} day${days === 1 ? "" : "s"}, ${remHours} hour${remHours === 1 ? "" : "s"} ago`;
}

// Short absolute date + London time, e.g. "Mon 11 May at 08:00". Relative
// labels ("Today" / "Yesterday") need careful calendar-day handling across
// timezones; the absolute form is unambiguous and the Age column already
// conveys recency.
export function formatSubmitted(createdAtIso) {
  const createdMs = Date.parse(createdAtIso);
  if (!Number.isFinite(createdMs)) return "—";
  const d = new Date(createdMs);
  const dateStr = d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
  return `${dateStr} at ${time}`;
}

// ── Digest rendering (exported for testing) ──────────────────────────────────

export function renderDigest(rows, nowMs = Date.now()) {
  const count = rows.length;
  const subject =
    count === 1
      ? "1 pending enquiry needs your action"
      : `${count} pending enquiries need your action`;

  const urgentBanner =
    count >= URGENT_THRESHOLD
      ? `<p style="margin:0 0 16px 0;color:#b91c1c;font-weight:700;font-size:14px;">${count} pending — please prioritise</p>`
      : "";

  const tableRows = rows
    .map((row) => {
      const adminUrl = `https://conveyquote.uk/admin?ref=${encodeURIComponent(
        safe(row.reference)
      )}`;
      const estimate = row.headlineTotal === null
        ? "—"
        : formatGbp(row.headlineTotal);
      const mailto = row.client_email
        ? `<a href="mailto:${escapeHtml(row.client_email)}" style="color:#0f2747;text-decoration:none;">${escapeHtml(row.client_email)}</a>`
        : "—";
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;">
            <a href="${adminUrl}" style="color:#0f2747;font-weight:600;text-decoration:none;">${escapeHtml(row.reference)}</a>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(row.client_name || "—")}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${mailto}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(prettyType(row.transaction_type))}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(formatSubmitted(row.created_at))}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#b91c1c;font-weight:600;">${escapeHtml(formatAge(row.created_at, nowMs))}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${escapeHtml(estimate)}</td>
        </tr>
      `;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f2f4f7;font-family:Arial,Helvetica,sans-serif;color:#222;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f2f4f7;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="900" style="max-width:900px;width:100%;border-collapse:collapse;">
            <tr>
              <td align="center" style="padding:0 0 12px 0;">
                <img src="https://conveyquote.uk/logo.png" alt="ConveyQuote" width="120" style="display:block;width:120px;max-width:120px;height:auto;border:0;margin:0 auto;" />
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td style="background:#0f2747;padding:20px 28px;color:#ffffff;">
                      <div style="font-size:12px;letter-spacing:0.5px;text-transform:uppercase;opacity:0.85;">ConveyQuote</div>
                      <div style="font-size:24px;line-height:1.25;font-weight:bold;margin-top:6px;">Pending enquiries</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px 28px;">
                      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#222;">Hi Sully,</p>
                      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#4b5563;">
                        The following enquir${count === 1 ? "y has" : "ies have"} been waiting for your review for more than 18 hours. To honour the "within one working day" promise, please action ${count === 1 ? "it" : "them"} today.
                      </p>
                      ${urgentBanner}
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:16px;font-size:13px;">
                        <thead>
                          <tr style="background:#f7f9fb;">
                            <th align="left" style="padding:10px 12px;border-bottom:2px solid #d9e2ec;color:#374151;">Reference</th>
                            <th align="left" style="padding:10px 12px;border-bottom:2px solid #d9e2ec;color:#374151;">Client</th>
                            <th align="left" style="padding:10px 12px;border-bottom:2px solid #d9e2ec;color:#374151;">Email</th>
                            <th align="left" style="padding:10px 12px;border-bottom:2px solid #d9e2ec;color:#374151;">Type</th>
                            <th align="left" style="padding:10px 12px;border-bottom:2px solid #d9e2ec;color:#374151;">Submitted</th>
                            <th align="left" style="padding:10px 12px;border-bottom:2px solid #d9e2ec;color:#374151;">Age</th>
                            <th align="right" style="padding:10px 12px;border-bottom:2px solid #d9e2ec;color:#374151;">Estimate</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${tableRows}
                        </tbody>
                      </table>
                      <p style="margin:0;font-size:13px;line-height:1.7;color:#6b7280;">
                        These were flagged automatically by the pending-enquiries check. Once you send the approved quote (or mark the enquiry as archived), it will drop off this list.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.7;color:#6b7280;text-align:center;">
                      ConveyQuote internal alert · Essentially Law Limited (Company No. 14625839)
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
</html>`;

  return { subject, html };
}

// ── DB + send ────────────────────────────────────────────────────────────────

async function fetchPending(env) {
  const sql = `
    SELECT e.reference,
           e.client_name,
           e.client_email,
           e.transaction_type,
           e.created_at,
           e.quote_json
      FROM enquiries e
     WHERE e.status = 'new'
       AND e.created_at < datetime('now', '-18 hours')
       AND e.created_at > datetime('now', '-7 days')
       AND NOT EXISTS (
         SELECT 1 FROM admin_alerts a
          WHERE a.enquiry_reference = e.reference
            AND a.alert_type = 'pending_quote'
            AND a.sent_at > datetime('now', '-24 hours')
       )
     ORDER BY e.created_at ASC
     LIMIT ${MAX_PER_RUN}
  `;
  const result = await env.DB.prepare(sql).all();
  return result.results || [];
}

async function runCheck(context, { dryRun }) {
  const { env } = context;
  const ranAt = new Date().toISOString();

  let rows;
  try {
    rows = await fetchPending(env);
  } catch (err) {
    console.error("check-pending-enquiries: fetch failed", err);
    return jsonResponse(
      { success: false, error: "Database query failed", ranAt },
      500
    );
  }

  if (rows.length === 0) {
    return jsonResponse({
      ranAt,
      dryRun,
      sent: false,
      eligibleCount: 0,
    });
  }

  const enriched = rows.map((row) => ({
    ...row,
    headlineTotal: extractHeadlineTotal(row.quote_json),
  }));

  const { subject, html } = renderDigest(enriched);
  const references = enriched.map((r) => r.reference);

  if (dryRun) {
    console.log(`[dry-run] would email digest of ${rows.length} pending enquiries`);
    return jsonResponse({
      ranAt,
      dryRun: true,
      sent: false,
      eligibleCount: rows.length,
      subject,
      references,
    });
  }

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [TO_ADDRESS],
        subject,
        html,
      }),
    });
    if (!resendResponse.ok) {
      const body = await resendResponse.text().catch(() => "");
      console.error(
        "check-pending-enquiries: Resend failed",
        resendResponse.status,
        body
      );
      return jsonResponse(
        {
          ranAt,
          sent: false,
          eligibleCount: rows.length,
          error: `resend ${resendResponse.status}`,
        },
        500
      );
    }
  } catch (err) {
    console.error("check-pending-enquiries: Resend threw", err);
    return jsonResponse(
      {
        ranAt,
        sent: false,
        eligibleCount: rows.length,
        error: err instanceof Error ? err.message : "unknown",
      },
      500
    );
  }

  // Email is out — record alerts so the same enquiry isn't nagged again within
  // 24h. Each insert is best-effort; one failure shouldn't poison the rest.
  for (const ref of references) {
    try {
      await env.DB.prepare(
        `INSERT INTO admin_alerts (enquiry_reference, alert_type) VALUES (?, 'pending_quote')`
      )
        .bind(ref)
        .run();
    } catch (err) {
      console.error(`admin_alerts insert failed for ${ref}`, err);
    }
  }

  return jsonResponse({
    ranAt,
    dryRun: false,
    sent: true,
    eligibleCount: rows.length,
    references,
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
  return runCheck(context, { dryRun });
}

export async function onRequestGet(context) {
  const { request } = context;
  if (!checkAuth(request, context.env)) return unauthorized();
  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "true";
  return runCheck(context, { dryRun });
}
