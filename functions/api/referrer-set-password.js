// functions/api/referrer-set-password.js
//
// Public endpoint behind the "Set your password" link (see
// functions/lib/referrer-setup-link.js). Validates the one-time token,
// stores the new password hash, then deletes the token and logs the
// referrer out of any existing sessions.

import { validateSession, hashPassword, jsonResponse } from "../lib/auth.js";
import { SETUP_TOKEN_TYPE } from "../lib/referrer-setup-link.js";

const MIN_LENGTH = 8;
const MAX_LENGTH = 200;
const LINK_INVALID =
  "This link has expired or has already been used. Use \"Forgot password?\" on the login page to get a new one.";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { token, password } = await request.json().catch(() => ({}));

    if (!token) return jsonResponse({ success: false, error: LINK_INVALID }, 400);

    const pw = String(password || "");
    if (pw.length < MIN_LENGTH || pw.length > MAX_LENGTH) {
      return jsonResponse(
        { success: false, error: `Password must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters.` },
        400
      );
    }

    const session = await validateSession(env.DB, String(token), SETUP_TOKEN_TYPE);
    if (!session) return jsonResponse({ success: false, error: LINK_INVALID }, 400);

    const referrer = await env.DB.prepare(
      `SELECT id, portal_email, portal_active FROM referrers WHERE id = ? LIMIT 1`
    ).bind(session.user_id).first();

    if (!referrer || !referrer.portal_email) {
      return jsonResponse({ success: false, error: LINK_INVALID }, 400);
    }
    if (!referrer.portal_active) {
      return jsonResponse(
        { success: false, error: "Portal access is not enabled for this account. Please contact ConveyQuote." },
        403
      );
    }

    const passwordHash = await hashPassword(pw);
    await env.DB.prepare(
      `UPDATE referrers SET portal_password_hash = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(passwordHash, referrer.id).run();

    // One-time link: remove it (and any other setup link), and end any
    // existing logins so an old password can't keep a session alive.
    await env.DB.prepare(
      `DELETE FROM sessions WHERE user_id = ? AND user_type IN (?, 'referrer')`
    ).bind(referrer.id, SETUP_TOKEN_TYPE).run();

    return jsonResponse({ success: true, email: referrer.portal_email });
  } catch (error) {
    return jsonResponse({ success: false, error: "Something went wrong. Please try again." }, 500);
  }
}
