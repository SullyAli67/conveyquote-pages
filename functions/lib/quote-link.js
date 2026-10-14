// functions/lib/quote-link.js
//
// Signed Accept / Decline links in client quote emails.
//
// A quote reference (CQ-<date>-<4 digits>) is guessable, so a link that
// carries only the reference would let anyone accept or decline someone
// else's quote and see its property address. Every link now also carries
// t=<code>: an HMAC-SHA256 of the reference made with a server-side
// secret, which can't be worked out without that secret.
//
// Links sent before this change have no code. They keep working until
// LEGACY_LINKS_UNTIL, and only for quotes that had actually been emailed
// before LEGACY_SENT_BEFORE — so a guessed reference for a newer quote,
// or one never sent, is refused.

export const LEGACY_LINKS_UNTIL = "2026-11-13T23:59:59Z";
export const LEGACY_SENT_BEFORE = "2026-10-15T00:00:00Z";
const QUOTED_STATUSES = new Set(["quote_sent", "accepted", "rejected"]);

// The secret: a dedicated one if set, else the ones the site already has.
export function quoteLinkKey(env) {
  return env.QUOTE_LINK_SECRET || env.UNSUB_SECRET || env.FOLLOWUP_SECRET || env.RESEND_API_KEY || "";
}

const toHex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

// 32 hex characters (128 bits). "" when no secret is configured.
export async function quoteLinkToken(reference, env) {
  const secret = quoteLinkKey(env);
  if (!secret) return "";
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`quote-link:${reference}`));
  return toHex(sig).slice(0, 32);
}

// "?ref=…&t=…" for a quote's links.
export async function quoteLinkQuery(reference, env) {
  const t = await quoteLinkToken(reference, env);
  return `ref=${encodeURIComponent(reference)}${t ? `&t=${t}` : ""}`;
}

const sameText = (a, b) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

// enquiry: { status, notification_email_sent_at } or null.
// Returns true when the link may act on this quote.
export async function quoteLinkAllowed(env, reference, token, enquiry, now = new Date()) {
  if (!enquiry) return false;
  const expected = await quoteLinkToken(reference, env);
  if (token) return Boolean(expected) && sameText(String(token), expected);
  // No code: an old link, allowed only during the changeover.
  if (now > new Date(LEGACY_LINKS_UNTIL)) return false;
  if (!QUOTED_STATUSES.has(String(enquiry.status || ""))) return false;
  const sentAt = enquiry.notification_email_sent_at ? new Date(enquiry.notification_email_sent_at) : null;
  return !sentAt || Number.isNaN(sentAt.getTime()) || sentAt < new Date(LEGACY_SENT_BEFORE);
}

// Shown for any link that isn't valid. Says nothing about the quote, or
// whether the reference exists.
export const invalidQuoteLinkHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Link not valid — ConveyQuote</title></head>
<body style="margin:0;background:#f2f4f7;font-family:Arial,Helvetica,sans-serif;color:#222;">
<div style="max-width:560px;margin:48px auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;">
<h1 style="margin:0 0 12px;font-size:22px;color:#0f2747;">This link isn't valid</h1>
<p style="font-size:15px;line-height:1.7;margin:0 0 12px;">Please use the button in your most recent quote email from ConveyQuote. If it still doesn't work, reply to that email or contact <a href="mailto:info@conveyquote.uk" style="color:#0f2747;">info@conveyquote.uk</a> and we'll help straight away.</p>
</div></body></html>`;
