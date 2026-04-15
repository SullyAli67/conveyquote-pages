// functions/api/admin-logout.js
import { getTokenFromRequest, deleteSession, jsonResponse } from "../lib/auth.js";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);

    if (token) {
      await deleteSession(env.DB, token);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ success: true }); // Always succeed on logout
  }
}
