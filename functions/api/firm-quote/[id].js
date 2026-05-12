// functions/api/firm-quote/[id].js
//
// Phase 2 of Type 2 firm-quoting product.
//
// Returns a single saved firm-issued quote by id, with full inputs +
// outputs JSON parsed and ready for re-rendering. Cross-firm access
// returns 404 (not 403) to avoid leaking the existence of other firms'
// quote ids.
//
// Cloudflare Pages dynamic route: /api/firm-quote/<id>
// `context.params.id` comes from the [id] segment.
//
// Firm-role session, is_saas_firm = 1 required.

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../../lib/auth.js";

export async function onRequestGet(context) {
  try {
    const { request, env, params } = context;

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

    const rawId = Number(params?.id);
    if (!Number.isFinite(rawId) || rawId <= 0) {
      return jsonResponse({ success: false, error: "Quote not found." }, 404);
    }
    const quoteId = Math.floor(rawId);

    const row = await env.DB.prepare(
      `SELECT id, firm_id, client_name, client_email, transaction_type,
              quote_inputs, quote_output, grand_total, issued_at, notes
         FROM firm_issued_quotes
        WHERE id = ?
        LIMIT 1`
    )
      .bind(quoteId)
      .first();

    // Not found OR belongs to a different firm — both surface as 404.
    if (!row || Number(row.firm_id) !== Number(firmId)) {
      return jsonResponse({ success: false, error: "Quote not found." }, 404);
    }

    let inputs = null;
    let output = null;
    try {
      inputs = JSON.parse(row.quote_inputs);
    } catch {
      inputs = null;
    }
    try {
      output = JSON.parse(row.quote_output);
    } catch {
      output = null;
    }

    return jsonResponse({
      success: true,
      quote: {
        id: Number(row.id),
        clientName: String(row.client_name || ""),
        clientEmail: String(row.client_email || ""),
        transactionType: String(row.transaction_type || ""),
        grandTotal: Number(row.grand_total || 0),
        issuedAt: String(row.issued_at || ""),
        notes: String(row.notes || ""),
        inputs,
        output,
      },
    });
  } catch (error) {
    console.error("firm-quote/[id] error:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}
