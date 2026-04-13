// functions/api/set-firm-password.js
import {
  getTokenFromRequest,
  validateSession,
  hashPassword,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // Require admin session
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "admin");
    if (!session) return unauthorised();

    const { firm_id, portal_email, password, portal_active } =
      await request.json();

    if (!firm_id || !portal_email || !password) {
      return jsonResponse(
        { success: false, error: "firm_id, portal_email and password are required." },
        400
      );
    }

    if (password.length < 8) {
      return jsonResponse(
        { success: false, error: "Password must be at least 8 characters." },
        400
      );
    }

    const passwordHash = await hashPassword(password);

    await env.DB.prepare(
      `UPDATE panel_firms
       SET portal_email = ?,
           portal_password_hash = ?,
           portal_active = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(
        String(portal_email).toLowerCase().trim(),
        passwordHash,
        portal_active !== false ? 1 : 0,
        firm_id
      )
      .run();

    return jsonResponse({ success: true });
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
