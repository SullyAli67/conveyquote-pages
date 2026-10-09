// functions/api/referrer-send-invite.js
//
// Admin "Send invite / reset link" button on the Edit Referrer form.
// Emails the referrer a fresh 7-day set-password link (cancelling any
// earlier unused one). Requires portal access to be ticked and saved, so
// the link the referrer receives actually lets them log in.

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";
import { issueSetupLink } from "../lib/referrer-setup-link.js";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const session = await validateSession(env.DB, getTokenFromRequest(request), "admin");
    if (!session) return unauthorised();

    const { id } = await request.json().catch(() => ({}));
    if (!id) return jsonResponse({ success: false, error: "Referrer id is required." }, 400);

    const referrer = await env.DB.prepare(
      `SELECT id, referrer_name, portal_email, portal_active, portal_password_hash
         FROM referrers WHERE id = ? LIMIT 1`
    ).bind(id).first();

    if (!referrer) return jsonResponse({ success: false, error: "Referrer not found." }, 404);
    if (!referrer.portal_email) {
      return jsonResponse({ success: false, error: "Add a portal login email and save first." }, 400);
    }
    if (!referrer.portal_active) {
      return jsonResponse({ success: false, error: "Tick \"Portal access active\" and save first." }, 400);
    }

    const result = await issueSetupLink(env, referrer, referrer.portal_password_hash ? "reset" : "welcome");
    if (!result.sent) {
      return jsonResponse({ success: false, error: `Email could not be sent: ${result.error}` }, 502);
    }
    return jsonResponse({ success: true, sent_to: referrer.portal_email });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
