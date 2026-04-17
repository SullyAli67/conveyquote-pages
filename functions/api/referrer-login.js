// functions/api/referrer-login.js
import {
  hashPassword,
  createSession,
  cleanExpiredSessions,
  jsonResponse,
} from "../lib/auth.js";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { email, password } = await request.json();

    if (!email || !password) {
      return jsonResponse({ success: false, error: "Email and password are required." }, 400);
    }

    await cleanExpiredSessions(env.DB);

    const referrer = await env.DB.prepare(
      `SELECT id, referrer_name, portal_email, portal_password_hash, portal_active
       FROM referrers WHERE portal_email = ? LIMIT 1`
    ).bind(String(email).toLowerCase().trim()).first();

    if (!referrer || !referrer.portal_password_hash) {
      return jsonResponse({ success: false, error: "Invalid email or password." }, 401);
    }

    if (!referrer.portal_active) {
      return jsonResponse({ success: false, error: "Portal access is not enabled for this account. Please contact ConveyQuote." }, 403);
    }

    const hash = await hashPassword(password);
    if (hash !== referrer.portal_password_hash) {
      return jsonResponse({ success: false, error: "Invalid email or password." }, 401);
    }

    const token = await createSession(env.DB, "referrer", referrer.id);

    return jsonResponse({
      success: true,
      token,
      referrer_id: referrer.id,
      referrer_name: referrer.referrer_name,
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
