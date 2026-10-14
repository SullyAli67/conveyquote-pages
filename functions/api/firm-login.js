// functions/api/firm-login.js
import {
  hashPassword,
  verifyPassword,
  passwordNeedsUpgrade,
  loginLocked,
  recordFailedLogin,
  TOO_MANY_ATTEMPTS,
  createSession,
  cleanExpiredSessions,
  jsonResponse,
} from "../lib/auth.js";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { email, password } = await request.json();

    if (!email || !password) {
      return jsonResponse(
        { success: false, error: "Email and password are required." },
        400
      );
    }

    await cleanExpiredSessions(env.DB);

    if (await loginLocked(env.DB, request, "firm", email)) {
      return jsonResponse({ success: false, error: TOO_MANY_ATTEMPTS }, 429);
    }

    // Look up firm by portal email
    const firm = await env.DB.prepare(
      `SELECT id, firm_name, portal_email, portal_password_hash, portal_active
       FROM panel_firms
       WHERE portal_email = ?
       LIMIT 1`
    )
      .bind(String(email).toLowerCase().trim())
      .first();

    // The password is checked before anything else is said about the
    // account, so a wrong password never reveals whether access is on.
    if (!firm || !firm.portal_password_hash || !(await verifyPassword(password, firm.portal_password_hash))) {
      await recordFailedLogin(env.DB, request, "firm", email);
      return jsonResponse(
        { success: false, error: "Invalid email or password." },
        401
      );
    }

    if (!firm.portal_active) {
      return jsonResponse(
        { success: false, error: "Portal access is not enabled for this account. Please contact ConveyQuote." },
        403
      );
    }

    if (passwordNeedsUpgrade(firm.portal_password_hash)) {
      await env.DB.prepare(`UPDATE panel_firms SET portal_password_hash = ? WHERE id = ?`)
        .bind(await hashPassword(password), firm.id).run();
    }

    // Create session tied to this firm
    const token = await createSession(env.DB, "firm", firm.id);

    return jsonResponse({
      success: true,
      token,
      firm_id: firm.id,
      firm_name: firm.firm_name,
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}
