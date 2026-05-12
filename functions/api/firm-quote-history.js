// functions/api/firm-quote-history.js
//
// Phase 2 of Type 2 firm-quoting product.
//
// Lists firm-issued quotes for the logged-in firm, most recent first.
// Optional query params:
//   ?limit=N  (default 50, max 200)
//   ?offset=M (default 0)
//   ?q=text   (case-insensitive LIKE %text% on client_name OR client_email)
//
// Firm-role session, is_saas_firm = 1 required.

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
    const session = await validateSession(env.DB, token, "firm");
    if (!session) return unauthorised();

    const firmId = session.user_id;

    const firm = await env.DB.prepare(
      `SELECT id, is_saas_firm FROM panel_firms WHERE id = ? LIMIT 1`
    )
      .bind(firmId)
      .first();

    if (!firm) {
      return jsonResponse({ success: false, error: "Firm not found." }, 404);
    }
    if (Number(firm.is_saas_firm) !== 1) {
      return jsonResponse(
        {
          success: false,
          error: "This firm is not enabled for the quoting product.",
        },
        403
      );
    }

    const url = new URL(request.url);
    const rawLimit = Number(url.searchParams.get("limit"));
    const rawOffset = Number(url.searchParams.get("offset"));
    const limit = Math.max(1, Math.min(200, Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 50));
    const offset = Math.max(0, Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.floor(rawOffset) : 0);
    const q = (url.searchParams.get("q") || "").trim();

    let sql = `
      SELECT id, client_name, client_email, transaction_type,
             grand_total, issued_at
        FROM firm_issued_quotes
       WHERE firm_id = ?
    `;
    const binds = [firmId];

    if (q) {
      sql += ` AND (LOWER(client_name) LIKE ? OR LOWER(client_email) LIKE ?)`;
      const like = `%${q.toLowerCase()}%`;
      binds.push(like, like);
    }

    sql += ` ORDER BY issued_at DESC, id DESC LIMIT ? OFFSET ?`;
    binds.push(limit, offset);

    const rowsResult = await env.DB.prepare(sql).bind(...binds).all();
    const rows = rowsResult.results || [];

    const quotes = rows.map((r) => ({
      id: Number(r.id),
      clientName: String(r.client_name || ""),
      clientEmail: String(r.client_email || ""),
      transactionType: String(r.transaction_type || ""),
      grandTotal: Number(r.grand_total || 0),
      issuedAt: String(r.issued_at || ""),
    }));

    return jsonResponse({
      success: true,
      quotes,
      limit,
      offset,
      count: quotes.length,
    });
  } catch (error) {
    console.error("firm-quote-history error:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}
