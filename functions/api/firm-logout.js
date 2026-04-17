// functions/api/firm-logout.js
import { getTokenFromRequest, deleteSession, jsonResponse } from "../lib/auth.js";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    if (token) await deleteSession(env.DB, token);
    return jsonResponse({ success: true });
  } catch {
    return jsonResponse({ success: true });
  }
}
