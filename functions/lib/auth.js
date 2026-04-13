// functions/lib/auth.js
// Shared authentication utilities for ConveyQuote
// Uses Web Crypto API (available in Cloudflare Workers)

const SALT = "conveyquote_salt_";
const SESSION_HOURS = 8;

// ── Hashing ───────────────────────────────────────────────────

export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(SALT + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(password, storedHash) {
  const hash = await hashPassword(password);
  return hash === storedHash;
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
         AND expires_at > datetime('now')
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
    .prepare(`DELETE FROM sessions WHERE expires_at <= datetime('now')`)
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
