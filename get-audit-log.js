// functions/api/admin-settings.js
import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";

// GET — load one or all settings
export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "admin");
    if (!session) return unauthorised();

    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    if (key) {
      const row = await env.DB.prepare(
        `SELECT setting_key, setting_value FROM admin_settings WHERE setting_key = ? LIMIT 1`
      ).bind(key).first();
      return jsonResponse({ success: true, setting: row || null });
    }

    const result = await env.DB.prepare(
      `SELECT setting_key, setting_value FROM admin_settings ORDER BY setting_key`
    ).all();

    return jsonResponse({ success: true, settings: result.results || [] });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

// POST — upsert a setting
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "admin");
    if (!session) return unauthorised();

    const { key, value } = await request.json();

    if (!key) {
      return jsonResponse({ success: false, error: "key is required." }, 400);
    }

    await env.DB.prepare(
      `INSERT INTO admin_settings (setting_key, setting_value, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(setting_key) DO UPDATE SET
         setting_value = excluded.setting_value,
         updated_at = datetime('now')`
    ).bind(key, value || "").run();

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
