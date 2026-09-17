// Pauses the automated follow-up sequence when a client replies.
//
// POST /api/inbound-email — called by whatever receives mail for
// info@conveyquote.uk. Authenticated with a bearer token matching
// env.INBOUND_EMAIL_SECRET; unauthenticated requests get an intentionally
// vague 401, as in run-followups.js. Note this is its OWN secret, not a
// reuse of FOLLOWUP_SECRET — a webhook endpoint reachable from the public
// internet should not share a key with the unsubscribe signer.
//
// Why this exists
// ---------------
// run-followups.js nudges at days 3, 8 and 13 after a quote is sent, and
// only stops on a terminal status, the admin toggle, or an unsubscribe.
// A client who simply REPLIES to the quote email is invisible to it, so
// they carry on receiving "just checking in" nudges days after they have
// actually been in touch. This endpoint closes that gap by setting the
// same followups_disabled flag admin-toggle-followups.js sets, so the
// pause is visible in, and reversible from, the existing admin UI.
//
// Deliberately narrow: it does not store the message, classify it, draft
// anything, or reply. It matches a sender to an enquiry and stops the
// nudges. Nothing client-facing happens as a result.
//
// Matching
// --------
//   1. sender address against enquiries.client_email, and
//   2. a CQ-YYYYMMDD-NNNN reference appearing in the subject line, which
//      also catches a client replying from a different address or an
//      admin forwarding a thread in.
// Only enquiries with an active follow-up sequence are touched. Repeat
// deliveries are harmless: a sequence already paused no longer matches.
//
// Automated mail (out-of-office replies, bounces, mailing lists) is
// ignored. Treating an out-of-office as a reply would silently kill a
// live nudge sequence — a quiet, revenue-losing failure.
//
// ── Setup (one-off, dashboard work) ──────────────────────────────────
// Sully — this endpoint expects a normalised JSON body. Either source
// works; pick one:
//
//   A. Cloudflare Email Routing (keeps everything with one vendor)
//      1. Email → Email Routing → enable for conveyquote.uk.
//      2. Keep the existing rule delivering info@conveyquote.uk to your
//         normal inbox — do NOT replace it. This endpoint takes a COPY.
//         If it breaks, you lose an automation, never a client's email.
//      3. Add an Email Worker that POSTs here with:
//           Authorization: Bearer <INBOUND_EMAIL_SECRET>
//           { from, subject, messageId, headers }
//
//   B. Resend Inbound (you already have the account)
//      1. Add the MX record Resend gives you for the receiving domain.
//      2. Point the inbound webhook at a small forwarder that adds the
//         bearer header and posts the fields above.
//
// Then add INBOUND_EMAIL_SECRET under Pages → Settings → Environment
// variables (Production AND Preview), as an encrypted secret. Until it
// is set this endpoint refuses every request, so it is safe to deploy
// before the mail side is wired up.

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const safe = (value) => (value === null || value === undefined ? "" : String(value));

// Enquiry references are generated as CQ-YYYYMMDD-NNNN (see
// referrer-submit-enquiry.js).
const REFERENCE_RE = /\bCQ-\d{8}-\d{4}\b/i;

// Our own addresses. A quote email that loops back to us must never be
// mistaken for the client replying to it.
const OWN_DOMAIN = "@conveyquote.uk";

const AUTO_SUBJECT_RE =
  /^\s*(re:\s*|fw:\s*|fwd:\s*)*(out of (the )?office|automatic reply|auto[-\s]?reply|autoreply|undeliverable|delivery (status notification|failure)|mail delivery (failed|subsystem)|returned mail)/i;

const AUTO_PRECEDENCE = ["auto_reply", "bulk", "junk", "list"];

function checkAuth(request, env) {
  const expected = env.INBOUND_EMAIL_SECRET;
  if (!expected) return false;
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/);
  if (!match) return false;
  return match[1].trim() === expected;
}

// "Jane Smith <jane@example.com>" -> "jane@example.com"
export function extractAddress(value) {
  const raw = safe(value).trim();
  if (!raw) return "";
  const angled = raw.match(/<([^>]+)>/);
  const candidate = (angled ? angled[1] : raw).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : "";
}

// Forwarders disagree on how they represent the sender: a bare string, a
// "Name <addr>" string, an object, or an array of either. Accept all of it.
export function readSender(payload) {
  const candidates = [
    payload.from,
    payload.sender,
    payload.envelope && payload.envelope.from,
    payload.envelope_from,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const first = Array.isArray(candidate) ? candidate[0] : candidate;
    if (!first) continue;
    const value =
      typeof first === "object"
        ? first.address || first.email || first.value || ""
        : first;
    const address = extractAddress(value);
    if (address) return address;
  }
  return "";
}

// Accepts either { "Auto-Submitted": "..." } or [{ name, value }, ...].
export function normaliseHeaders(raw) {
  const out = {};
  if (!raw) return out;
  if (Array.isArray(raw)) {
    for (const header of raw) {
      if (!header) continue;
      const name = safe(header.name || header.key).toLowerCase();
      if (name) out[name] = safe(header.value);
    }
    return out;
  }
  if (typeof raw === "object") {
    for (const [key, value] of Object.entries(raw)) {
      out[safe(key).toLowerCase()] = safe(value);
    }
  }
  return out;
}

// True for anything a machine sent: out-of-office, bounce, mailing list.
export function isAutomatedMail(headers, subject) {
  const autoSubmitted = safe(headers["auto-submitted"]).toLowerCase().trim();
  if (autoSubmitted && autoSubmitted !== "no") return true;
  if (
    headers["x-autoreply"] ||
    headers["x-autorespond"] ||
    headers["x-auto-response-suppress"] ||
    headers["list-unsubscribe"]
  ) {
    return true;
  }
  const precedence = safe(headers["precedence"]).toLowerCase().trim();
  if (AUTO_PRECEDENCE.includes(precedence)) return true;
  return AUTO_SUBJECT_RE.test(safe(subject));
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!checkAuth(request, env)) {
    return jsonResponse({ success: false, error: "Not found" }, 401);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
  }
  if (!payload || typeof payload !== "object") {
    return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
  }

  const sender = readSender(payload);
  if (!sender) {
    return jsonResponse(
      { success: false, error: "No usable sender address in payload" },
      400
    );
  }

  const subject = safe(payload.subject);
  const headers = normaliseHeaders(payload.headers);

  // From here on every outcome is a 200. The caller is a mail forwarder:
  // a non-2xx makes it retry, and there is nothing to retry for a message
  // we have deliberately decided not to act on.

  if (sender.endsWith(OWN_DOMAIN)) {
    return jsonResponse({ success: true, matched: 0, skipped: "own_domain" });
  }

  if (isAutomatedMail(headers, subject)) {
    return jsonResponse({ success: true, matched: 0, skipped: "automated" });
  }

  const subjectReference = (subject.match(REFERENCE_RE) || [""])[0].toUpperCase();

  let rows;
  try {
    const result = await env.DB.prepare(
      `SELECT e.reference
         FROM enquiries e
         INNER JOIN followup_state fs ON fs.enquiry_reference = e.reference
        WHERE fs.followups_disabled = 0
          AND fs.quote_sent_at IS NOT NULL
          AND (LOWER(e.client_email) = ? OR e.reference = ?)`
    )
      // An empty string matches no reference, which is what we want when
      // the subject line does not carry one.
      .bind(sender, subjectReference)
      .all();
    rows = result.results || [];
  } catch (error) {
    console.error("inbound-email: lookup failed", error);
    return jsonResponse({ success: false, error: "Database query failed" }, 500);
  }

  const references = rows.map((row) => row.reference);
  if (references.length === 0) {
    return jsonResponse({ success: true, matched: 0, skipped: "no_match" });
  }

  const placeholders = references.map(() => "?").join(",");
  try {
    await env.DB.prepare(
      `UPDATE followup_state
          SET followups_disabled = 1
        WHERE enquiry_reference IN (${placeholders})`
    )
      .bind(...references)
      .run();
  } catch (error) {
    console.error("inbound-email: pause failed", error);
    return jsonResponse({ success: false, error: "Database update failed" }, 500);
  }

  // Audit failures must never fail the pause — same convention as
  // archive-enquiry.js and delete-enquiry-core.js.
  const trimmedSubject = subject.length > 120 ? `${subject.slice(0, 117)}...` : subject;
  const details = trimmedSubject
    ? `Follow-ups paused — client replied from ${sender}: "${trimmedSubject}"`
    : `Follow-ups paused — client replied from ${sender}`;

  for (const reference of references) {
    try {
      await env.DB.prepare(
        `INSERT INTO audit_log (action, reference, actor, details)
         VALUES ('followups_paused_client_reply', ?, 'system', ?)`
      )
        .bind(reference, details)
        .run();
    } catch (error) {
      console.error("Audit log error:", error);
    }
  }

  return jsonResponse({
    success: true,
    matched: references.length,
    references,
    matchedBy: subjectReference ? "email_or_reference" : "email",
  });
}
