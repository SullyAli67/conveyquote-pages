// functions/api/referrer-forgot-password.js
//
// Public "Forgot password?" endpoint for referrers. Always returns the same
// message, whether or not the email belongs to an account, so it can't be
// used to find out which addresses are registered. If it does match an
// active referrer, a fresh set-password link is emailed — at most one
// every 5 minutes per referrer, so the form can't be used to flood an inbox.

import { cleanExpiredSessions, jsonResponse } from "../lib/auth.js";
import { SETUP_TOKEN_TYPE, issueSetupLink } from "../lib/referrer-setup-link.js";

const GENERIC_MESSAGE =
  "If that email address belongs to an active referrer account, we've sent it a link to set a new password. The link lasts 7 days.";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { email } = await request.json().catch(() => ({}));
    const normalised = String(email || "").toLowerCase().trim();

    if (!normalised) {
      return jsonResponse({ success: false, error: "Please enter your email address." }, 400);
    }

    await cleanExpiredSessions(env.DB);

    const referrer = await env.DB.prepare(
      `SELECT id, referrer_name, portal_email
         FROM referrers
        WHERE portal_email = ? AND portal_active = 1
        LIMIT 1`
    ).bind(normalised).first();

    if (referrer) {
      const recent = await env.DB.prepare(
        `SELECT 1 AS recent FROM sessions
          WHERE user_type = ? AND user_id = ?
            AND datetime(created_at) > datetime('now', '-5 minutes')
          LIMIT 1`
      ).bind(SETUP_TOKEN_TYPE, referrer.id).first();

      if (!recent) {
        const result = await issueSetupLink(env, referrer, "reset");
        if (!result.sent) {
          console.error(`referrer-forgot-password: email failed for referrer ${referrer.id}: ${result.error}`);
        }
      }
    }

    return jsonResponse({ success: true, message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("referrer-forgot-password:", error);
    return jsonResponse({ success: true, message: GENERIC_MESSAGE });
  }
}
