// functions/api/firm-quote-manage.js
// PATCH — update quote details and fee JSON (only allowed if not yet accepted)
// DELETE — delete a quote (only allowed if not yet sent or accepted)

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";

export async function onRequestPatch(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "firm");
    if (!session) return unauthorised();

    const firmId = session.user_id;
    const body = await request.json();
    const { internal_reference, firm_reference, client_name, client_email,
            client_phone, transaction_type, tenure, price, postcode,
            email_signature, quote_json } = body;

    if (!internal_reference) {
      return jsonResponse({ success: false, error: "internal_reference required." }, 400);
    }

    const quote = await env.DB.prepare(
      `SELECT id, status FROM firm_quotes WHERE internal_reference = ? AND firm_id = ? LIMIT 1`
    ).bind(internal_reference, firmId).first();

    if (!quote) return jsonResponse({ success: false, error: "Quote not found." }, 404);

    if (quote.status === "accepted") {
      return jsonResponse({
        success: false,
        error: "This quote has been accepted by the client and cannot be edited. Contact the client directly if changes are needed.",
      }, 400);
    }

    await env.DB.prepare(
      `UPDATE firm_quotes
       SET firm_reference   = COALESCE(?, firm_reference),
           client_name      = COALESCE(?, client_name),
           client_email     = COALESCE(?, client_email),
           client_phone     = COALESCE(?, client_phone),
           transaction_type = COALESCE(?, transaction_type),
           tenure           = COALESCE(?, tenure),
           price            = COALESCE(?, price),
           postcode         = COALESCE(?, postcode),
           email_signature  = COALESCE(?, email_signature),
           quote_json       = COALESCE(?, quote_json),
           status           = 'draft',
           updated_at       = datetime('now')
       WHERE internal_reference = ? AND firm_id = ?`
    ).bind(
      firm_reference || null,
      client_name || null,
      client_email || null,
      client_phone || null,
      transaction_type || null,
      tenure || null,
      price ? Number(price) : null,
      postcode || null,
      email_signature || null,
      quote_json ? (typeof quote_json === "string" ? quote_json : JSON.stringify(quote_json)) : null,
      internal_reference,
      firmId
    ).run();

    return jsonResponse({ success: true, internal_reference });
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
}

export async function onRequestDelete(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "firm");
    if (!session) return unauthorised();

    const firmId = session.user_id;
    const url = new URL(request.url);
    const internal_reference = url.searchParams.get("ref");

    if (!internal_reference) {
      return jsonResponse({ success: false, error: "ref query parameter required." }, 400);
    }

    const quote = await env.DB.prepare(
      `SELECT id, status FROM firm_quotes WHERE internal_reference = ? AND firm_id = ? LIMIT 1`
    ).bind(internal_reference, firmId).first();

    if (!quote) return jsonResponse({ success: false, error: "Quote not found." }, 404);

    if (quote.status === "accepted") {
      return jsonResponse({
        success: false,
        error: "Accepted quotes cannot be deleted. This quote has already been agreed by the client.",
      }, 400);
    }

    // Delete tokens first, then the quote
    await env.DB.prepare(`DELETE FROM firm_quote_tokens WHERE firm_quote_id = ?`).bind(quote.id).run();
    await env.DB.prepare(`DELETE FROM firm_quotes WHERE id = ?`).bind(quote.id).run();

    return jsonResponse({ success: true, internal_reference });
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
}
