// functions/api/get-audit-log.js
// Returns audit log entries for the admin dashboard.
// Supports optional filtering by reference or firm_id, newest first.

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "admin");
    if (!session) return unauthorised();

    const url = new URL(request.url);
    const reference = url.searchParams.get("reference") || "";
    const firm_id   = url.searchParams.get("firm_id")   || "";
    const limit     = Math.min(Number(url.searchParams.get("limit") || 100), 500);

    let query = `SELECT id, action, reference, firm_id, firm_name, actor, details, created_at
                 FROM audit_log`;
    const conditions = [];
    const bindings   = [];

    if (reference) {
      conditions.push("reference = ?");
      bindings.push(reference);
    }
    if (firm_id) {
      conditions.push("firm_id = ?");
      bindings.push(Number(firm_id));
    }

    if (conditions.length) query += " WHERE " + conditions.join(" AND ");
    query += " ORDER BY created_at DESC LIMIT ?";
    bindings.push(limit);

    const result = await env.DB.prepare(query).bind(...bindings).all();

    return jsonResponse({ success: true, entries: result.results || [] });
  } catch (error) {
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
}
