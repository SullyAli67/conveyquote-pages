// functions/lib/auth.js
// Shared authentication utilities for ConveyQuote
// Uses Web Crypto API (available in Cloudflare Workers)

const SALT = "conveyquote_salt_";
const SESSION_HOURS = 8;

// ── Hashing ───────────────────────────────────────────────────
//
// New passwords are stored as PBKDF2-SHA256 with a random salt per
// password and 100,000 rounds ("pbkdf2$100000$<salt>$<hash>"), which makes
// working a password out from a leaked database very slow. Older
// passwords were one fast SHA-256 with a fixed salt; they still verify,
// and each login upgrades them (see passwordNeedsUpgrade).

const PBKDF2_ROUNDS = 100000; // the Workers runtime's maximum
const toHex = (bytes) => Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (hex) => new Uint8Array((hex.match(/.{2}/g) || []).map((h) => parseInt(h, 16)));

async function legacyHash(password) {
  const data = new TextEncoder().encode(SALT + password);
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

async function pbkdf2(password, salt, rounds) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: rounds }, key, 256);
  return toHex(bits);
}

const sameText = (a, b) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${PBKDF2_ROUNDS}$${toHex(salt)}$${await pbkdf2(String(password), salt, PBKDF2_ROUNDS)}`;
}

export async function verifyPassword(password, storedHash) {
  const stored = String(storedHash || "");
  if (!stored) return false;
  if (stored.startsWith("pbkdf2$")) {
    const [, rounds, saltHex, hash] = stored.split("$");
    if (!rounds || !saltHex || !hash) return false;
    return sameText(await pbkdf2(String(password), fromHex(saltHex), Number(rounds)), hash);
  }
  return sameText(await legacyHash(String(password)), stored);
}

// True for passwords still stored the old way; re-hash them after a
// successful login.
export const passwordNeedsUpgrade = (storedHash) => !String(storedHash || "").startsWith("pbkdf2$");

// ── Login attempt limit ───────────────────────────────────────
//
// Failed logins are written to audit_log (action 'login_failed'). After 5
// failures for one login email in 15 minutes, or 30 from one IP address,
// further attempts are refused until the 15 minutes pass. Unknown emails
// count too, so the limit doesn't reveal which accounts exist.

const FAIL_WINDOW = "-15 minutes";
const MAX_PER_ACCOUNT = 5;
const MAX_PER_IP = 30;
export const TOO_MANY_ATTEMPTS = "Too many unsuccessful attempts. Please wait 15 minutes and try again.";

const clientIp = (request) => request.headers.get("CF-Connecting-IP") || "";

// portal: "referrer", "firm" or "admin".
export async function loginLocked(db, request, portal, email) {
  try {
    const account = `${portal}:${String(email || "").toLowerCase().trim()}`;
    const row = await db.prepare(
      `SELECT
         SUM(CASE WHEN actor = ? THEN 1 ELSE 0 END) AS by_account,
         SUM(CASE WHEN details = ? THEN 1 ELSE 0 END) AS by_ip
       FROM audit_log
       WHERE action = 'login_failed' AND created_at > datetime('now', ?)`
    ).bind(account, `ip:${clientIp(request)}`, FAIL_WINDOW).first();
    if (Number(row?.by_account) >= MAX_PER_ACCOUNT) return true;
    return Boolean(clientIp(request)) && Number(row?.by_ip) >= MAX_PER_IP;
  } catch {
    return false;
  }
}

export async function recordFailedLogin(db, request, portal, email) {
  try {
    await db.prepare(
      `INSERT INTO audit_log (action, reference, actor, details) VALUES ('login_failed', NULL, ?, ?)`
    ).bind(`${portal}:${String(email || "").toLowerCase().trim()}`, `ip:${clientIp(request)}`).run();
  } catch (e) {
    console.error("recordFailedLogin:", e);
  }
}

// ── Tokens ────────────────────────────────────────────────────

export function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function expiresAt() {
  const d = new Date();
  d.setHours(d.getHours() + SESSION_HOURS);
  return d.toISOString();
}

// Rows written by expiresAt() are ISO-8601 ("2026-09-17T18:45:00.000Z"),
// but SQLite's datetime('now') is space-separated ("2026-09-17 18:45:00").
// Comparing the two as plain strings compares "T" (0x54) against " " (0x20)
// at index 10, so a same-day expiry always sorts as "in the future" and the
// session survives until the UTC date rolls over — up to 16 hours past its
// real 8-hour life. Wrapping the column in datetime() normalises both
// formats (and existing rows) to the same comparable shape.
const NOT_EXPIRED = "datetime(expires_at) > datetime('now')";
const HAS_EXPIRED = "datetime(expires_at) <= datetime('now')";

// ── Session management ────────────────────────────────────────

export async function createSession(db, userType, userId = null) {
  const token = generateToken();
  const expires = expiresAt();

  await db
    .prepare(
      `INSERT INTO sessions (token, user_type, user_id, expires_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(token, userType, userId, expires)
    .run();

  return token;
}

export async function validateSession(db, token, requiredType) {
  if (!token) return null;

  const session = await db
    .prepare(
      `SELECT * FROM sessions
       WHERE token = ?
         AND user_type = ?
         AND ${NOT_EXPIRED}
       LIMIT 1`
    )
    .bind(token, requiredType)
    .first();

  return session || null;
}

export async function deleteSession(db, token) {
  await db
    .prepare(`DELETE FROM sessions WHERE token = ?`)
    .bind(token)
    .run();
}

export async function cleanExpiredSessions(db) {
  await db
    .prepare(`DELETE FROM sessions WHERE ${HAS_EXPIRED}`)
    .run();
}

// ── Token extraction from request ────────────────────────────

export function getTokenFromRequest(request) {
  // Check Authorization header first: "Bearer <token>"
  const authHeader = request.headers.get("Authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  // Fall back to cookie
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)cq_session=([^;]+)/);
  return match ? match[1] : null;
}

// ── Response helpers ──────────────────────────────────────────

export const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const unauthorised = () =>
  jsonResponse({ success: false, error: "Unauthorised" }, 401);
