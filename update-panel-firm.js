// functions/api/admin-login.js
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
      return jsonResponse(
        { success: false, error: "Email and password are required." },
        400
      );
    }

    // Clean up old sessions opportunistically
    await cleanExpiredSessions(env.DB);

    // Look up the admin user
    const admin = await env.DB.prepare(
      `SELECT * FROM admin_users WHERE email = ? LIMIT 1`
    )
      .bind(String(email).toLowerCase().trim())
      .first();

    if (!admin) {
      return jsonResponse(
        { success: false, error: "Invalid email or password." },
        401
      );
    }

    // Verify password
    const hash = await hashPassword(password);
    if (hash !== admin.password_hash) {
      return jsonResponse(
        { success: false, error: "Invalid email or password." },
        401
      );
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
