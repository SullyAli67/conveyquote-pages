// functions/api/admin-login.js
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

    // Clean up old sessions opportunistically
    await cleanExpiredSessions(env.DB);

    if (await loginLocked(env.DB, request, "admin", email)) {
      return jsonResponse({ success: false, error: TOO_MANY_ATTEMPTS }, 429);
    }

    // Look up the admin user
    const admin = await env.DB.prepare(
      `SELECT id, email, password_hash FROM admin_users WHERE email = ? LIMIT 1`
    )
      .bind(String(email).toLowerCase().trim())
      .first();

    if (!admin || !(await verifyPassword(password, admin.password_hash))) {
      await recordFailedLogin(env.DB, request, "admin", email);
      return jsonResponse(
        { success: false, error: "Invalid email or password." },
        401
      );
    }

    if (passwordNeedsUpgrade(admin.password_hash)) {
      await env.DB.prepare(`UPDATE admin_users SET password_hash = ? WHERE id = ?`)
        .bind(await hashPassword(password), admin.id).run();
    }

    // Create session
    const token = await createSession(env.DB, "admin", null);

    return jsonResponse({ success: true, token });
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
