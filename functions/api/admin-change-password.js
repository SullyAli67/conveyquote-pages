// functions/api/admin-change-password.js
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
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "admin");
    if (!session) return unauthorised();

    const { new_password } = await request.json();

    if (!new_password || new_password.length < 8) {
      return jsonResponse({ success: false, error: "Password must be at least 8 characters." }, 400);
    }

    const hash = await hashPassword(new_password);

    await env.DB.prepare(
      `UPDATE admin_users SET password_hash = ? WHERE id = ?`
    ).bind(hash, session.user_id || 1).run();

    // Invalidate all admin sessions so they must log in again
    await env.DB.prepare(
      `DELETE FROM sessions WHERE user_type = 'admin'`
    ).run();

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
