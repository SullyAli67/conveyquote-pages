// functions/lib/referrer-demo-link.js
//
// "Email demo access" for demo accounts (referrer_demo_accounts, migration
// 0022). The prospect gets a link that opens the demo portal straight away,
// with no password:
//
//   https://conveyquote.uk/referrer-portal/#demo=<token>
//
// The token is stored in the existing sessions table with user_type
// 'referrer_demo_link' (no schema change). It can't be used as a login
// itself: referrer-demo-login.js swaps it for an ordinary 8-hour referrer
// session each time the link is opened, and only while the account is
// still a demo account with portal access on. The link works for 14 days
// and can be reused in that time. Making a new link cancels the old one;
// turning portal access off cancels it too.

import { generateToken } from "./auth.js";

export const DEMO_LINK_TOKEN_TYPE = "referrer_demo_link";
export const DEMO_LINK_DAYS = 14;
const PORTAL_URL = "https://conveyquote.uk/referrer-portal/";

const escapeHtml = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function createDemoLink(db, referrerId) {
  await db
    .prepare(`DELETE FROM sessions WHERE user_type = ? AND user_id = ?`)
    .bind(DEMO_LINK_TOKEN_TYPE, referrerId)
    .run();
  const token = generateToken();
  const expires = new Date(Date.now() + DEMO_LINK_DAYS * 24 * 60 * 60 * 1000);
  await db
    .prepare(`INSERT INTO sessions (token, user_type, user_id, expires_at) VALUES (?, ?, ?, ?)`)
    .bind(token, DEMO_LINK_TOKEN_TYPE, referrerId, expires.toISOString())
    .run();
  return { url: `${PORTAL_URL}#demo=${token}`, expires };
}

// Returns { sent: true } or { sent: false, error }.
export async function sendDemoLinkEmail(env, { to, referrerName, url, expires }) {
  if (!env.RESEND_API_KEY) return { sent: false, error: "Email is not configured." };
  const expiryText = expires.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London",
  });
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222;">
      <div style="background:#0f2747;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:18px;">Your ConveyQuote referrer portal demo</h2>
      </div>
      <div style="padding:20px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;font-size:14px;line-height:1.6;">
        <p style="margin:0 0 12px;">Hello,</p>
        <p style="margin:0 0 12px;">Here is a demo of the ConveyQuote referrer portal, set up as <strong>${escapeHtml(referrerName)}</strong>. A short guided tour shows you how to:</p>
        <ul style="margin:0 0 16px;padding-left:20px;">
          <li>get an instant conveyancing quote for a client</li>
          <li>see the quote email your client receives</li>
          <li>follow each case from instruction to completion</li>
          <li>see the referral fees you earn and when they are paid</li>
        </ul>
        <p style="margin:0 0 20px;">
          <a href="${url}" style="background:#0f2747;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">Open the demo portal</a>
        </p>
        <p style="margin:0 0 12px;font-size:13px;color:#6b7280;">No password is needed. The cases in the demo are samples, and nothing you do in it is sent to anyone, so feel free to try everything. The link works until ${escapeHtml(expiryText)}.</p>
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
        subject: "Your ConveyQuote referrer portal demo",
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
