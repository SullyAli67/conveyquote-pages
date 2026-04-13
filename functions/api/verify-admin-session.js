// functions/api/verify-admin-session.js
import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
} from "../lib/auth.js";

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);

    const session = await validateSession(env.DB, token, "admin");

    if (!session) {
      return jsonResponse({ success: false, valid: false }, 401);
    }

    return jsonResponse({ success: true, valid: true });
  } catch (error) {
    return jsonResponse({ success: false, valid: false }, 500);
  }
}
