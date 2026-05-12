// Shared helper for the follow-up unsubscribe link.
// Both the email builders (send-approved-quote.js, run-followups.js) and
// the endpoint (unsubscribe-followups.js) compute the token the same way
// so a tampered link is rejected.

// Falls back to FOLLOWUP_SECRET when UNSUB_SECRET isn't configured, so
// nobody has to add a second secret to ship this feature.
export function unsubSigningKey(env) {
  return env.UNSUB_SECRET || env.FOLLOWUP_SECRET || "";
}

// 16 hex chars (8 bytes) of SHA-256 over "reference:secret".
export async function computeUnsubToken(reference, secret) {
  if (!secret) return "";
  const input = `${reference}:${secret}`;
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

export async function buildUnsubUrl(reference, env) {
  const token = await computeUnsubToken(reference, unsubSigningKey(env));
  const ref = encodeURIComponent(reference);
  return `https://conveyquote.uk/api/unsubscribe-followups?ref=${ref}&token=${token}`;
}

// Constant-time-ish comparison so we don't leak timing info on token mismatch.
export function tokensEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
