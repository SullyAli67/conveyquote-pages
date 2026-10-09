// functions/lib/referrer-setup-link.js
//
// One-time "set your password" links for referrers — used for the welcome
// email when admin creates a referrer, the admin "Send invite / reset link"
// button, and the public "Forgot password?" form.
//
// The link carries a random token stored in the existing sessions table
// with user_type 'referrer_setup' (no schema change). That type can't be
// used to log in: login sessions are validated as user_type 'referrer'.
// A welcome link (account has no password yet) lasts 4 days; a reset link
// (forgot password, or admin resend once a password exists) lasts 7 days.
// Each works once, and issuing a new one cancels any earlier unused link
// for the same referrer. No password is ever emailed.

import { generateToken } from "./auth.js";

export const SETUP_TOKEN_TYPE = "referrer_setup";
export const LINK_DAYS = { welcome: 4, reset: 7 };
const SET_PASSWORD_URL = "https://conveyquote.uk/referrer-set-password/";
const LOGIN_URL = "https://conveyquote.uk/referrer-login/";

const escapeHtml = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function createSetupLink(db, referrerId, days) {
  await db
    .prepare(`DELETE FROM sessions WHERE user_type = ? AND user_id = ?`)
    .bind(SETUP_TOKEN_TYPE, referrerId)
    .run();

  const token = generateToken();
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await db
    .prepare(`INSERT INTO sessions (token, user_type, user_id, expires_at) VALUES (?, ?, ?, ?)`)
    .bind(token, SETUP_TOKEN_TYPE, referrerId, expires.toISOString())
    .run();

  return { url: `${SET_PASSWORD_URL}?token=${token}`, expires };
}

// kind: "welcome" (new account) or "reset" (forgot password / admin resend).
// Returns { sent: true } or { sent: false, error }.
export async function sendSetupEmail(env, { to, referrerName, url, expires, kind }) {
  if (!env.RESEND_API_KEY) return { sent: false, error: "Email is not configured." };

  const expiryText = expires.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London",
  });
  const welcome = kind === "welcome";
  const subject = welcome
    ? "Welcome to the ConveyQuote referrer portal — set your password"
    : "Set a new password for your ConveyQuote referrer portal";
  const intro = welcome
    ? "Your ConveyQuote referrer portal is ready. From it you can submit client referrals, follow each case from quote to completion, and see the referral fees you have earned."
    : "We received a request to set a new password for your ConveyQuote referrer portal. If you did not ask for this, you can ignore this email and your password will not change.";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222;">
      <div style="background:#0f2747;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:18px;">${welcome ? "Welcome to ConveyQuote" : "Set a new password"}</h2>
      </div>
      <div style="padding:20px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;font-size:14px;line-height:1.6;">
        <p style="margin:0 0 12px;">Hi ${escapeHtml(referrerName || "there")},</p>
        <p style="margin:0 0 12px;">${intro}</p>
        <p style="margin:0 0 20px;">Choose your password using the button below. Your login email is <strong>${escapeHtml(to)}</strong>.</p>
        <p style="margin:0 0 20px;">
          <a href="${url}" style="background:#0f2747;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">Set your password</a>
        </p>
        <p style="margin:0 0 12px;font-size:13px;color:#6b7280;">This link works once and expires on ${escapeHtml(expiryText)}. If it has expired, use "Forgot password?" on the <a href="${LOGIN_URL}" style="color:#0f2747;">login page</a> to get a new one.</p>
        <p style="margin:0;font-size:13px;color:#6b7280;">Questions? Reply to this email or contact info@conveyquote.uk.</p>
      </div>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "ConveyQuote <noreply@conveyquote.uk>",
        to: [to],
        reply_to: "info@conveyquote.uk",
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { sent: false, error: `HTTP ${res.status} ${body}`.slice(0, 240) };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, error: String(err instanceof Error ? err.message : err).slice(0, 240) };
  }
}

// Creates a fresh link and emails it. Caller has already checked the
// referrer is active and has a portal email. Returns the send result plus
// how many days the link lasts.
export async function issueSetupLink(env, referrer, kind) {
  const days = LINK_DAYS[kind];
  const { url, expires } = await createSetupLink(env.DB, referrer.id, days);
  const result = await sendSetupEmail(env, {
    to: referrer.portal_email,
    referrerName: referrer.referrer_name,
    url,
    expires,
    kind,
  });
  return { ...result, days };
}
