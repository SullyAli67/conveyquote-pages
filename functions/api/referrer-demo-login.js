// functions/api/referrer-demo-login.js
//
// Opens a demo account from its emailed link (see
// functions/lib/referrer-demo-link.js). POST { token } → the same reply as
// referrer-login.js, with an ordinary 8-hour referrer session. Refused when
// the link has expired or been replaced, the account is no longer a demo
// account, or its portal access is off.

import { validateSession, createSession, jsonResponse } from "../lib/auth.js";
import { DEMO_LINK_TOKEN_TYPE } from "../lib/referrer-demo-link.js";
import { isDemoReferrer } from "../lib/sample-cases.js";

const EXPIRED = "This demo link has expired or has been replaced. Please ask ConveyQuote for a new one.";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { token } = await request.json().catch(() => ({}));
    if (!/^[0-9a-f]{64}$/.test(String(token || ""))) {
      return jsonResponse({ success: false, error: EXPIRED }, 401);
    }

    const link = await validateSession(env.DB, token, DEMO_LINK_TOKEN_TYPE);
    if (!link) return jsonResponse({ success: false, error: EXPIRED }, 401);

    const referrer = await env.DB.prepare(
      `SELECT id, referrer_name, portal_active FROM referrers WHERE id = ? LIMIT 1`
    ).bind(link.user_id).first();
    if (!referrer || !referrer.portal_active || !(await isDemoReferrer(env.DB, referrer.id))) {
      return jsonResponse({ success: false, error: EXPIRED }, 401);
    }

    const sessionToken = await createSession(env.DB, "referrer", referrer.id);
    try {
      await env.DB.prepare(
        `INSERT INTO audit_log (action, reference, actor, details) VALUES ('referrer_login', NULL, ?, 'demo link')`
      ).bind(`referrer:${referrer.id}`).run();
    } catch (e) {
      console.error("Audit log error:", e);
    }

    return jsonResponse({
      success: true,
      token: sessionToken,
      referrer_id: referrer.id,
      referrer_name: referrer.referrer_name,
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
