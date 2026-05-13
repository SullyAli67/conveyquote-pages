// functions/api/admin-next-pending-quote.js
//
// Returns the oldest enquiry still awaiting admin action, or
// { reference: null } when the queue is empty. Used by the Quote
// Review screen to auto-advance to the next pending matter after a
// terminal action (Send Approved Quote, status update to a terminal
// state, hard Delete).
//
// "Pending" mirrors the dashboard badge logic from Batch 2: anything
// whose status is NOT in the terminal set is considered pending.
// Archived rows are terminal, so they're excluded.

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";

const TERMINAL_STATUSES = [
  "quote_sent",
  "accepted",
  "rejected",
  "instructed",
  "archived",
  "on_hold",
];

export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "admin");
    if (!session) return unauthorised();

    const url = new URL(request.url);
    const excludeRef = (url.searchParams.get("exclude") || "").trim();

    // Build placeholders for the NOT IN clause.
    const placeholders = TERMINAL_STATUSES.map(() => "?").join(", ");
    const binds = [...TERMINAL_STATUSES];

    let sql = `
      SELECT reference, created_at, status
        FROM enquiries
       WHERE COALESCE(status, 'new') NOT IN (${placeholders})
    `;

    if (excludeRef) {
      sql += ` AND reference != ?`;
      binds.push(excludeRef);
    }

    sql += ` ORDER BY created_at ASC, id ASC LIMIT 1`;

    const row = await env.DB.prepare(sql).bind(...binds).first();

    if (!row || !row.reference) {
      return jsonResponse({ success: true, reference: null });
    }

    return jsonResponse({
      success: true,
      reference: String(row.reference),
      status: String(row.status || ""),
      createdAt: String(row.created_at || ""),
    });
  } catch (error) {
    console.error("admin-next-pending-quote error:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}
