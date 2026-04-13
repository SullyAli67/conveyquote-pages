// functions/api/firm-quote-detail.js
import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";

// GET /api/firm-quote-detail?ref=FQ-xxx
export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "firm");
    if (!session) return unauthorised();

    const url = new URL(request.url);
    const ref = url.searchParams.get("ref");
    if (!ref) return jsonResponse({ success: false, error: "ref required" }, 400);

    const quote = await env.DB.prepare(
      `SELECT * FROM firm_quotes WHERE internal_reference = ? AND firm_id = ? LIMIT 1`
    ).bind(ref, session.user_id).first();

    if (!quote) return jsonResponse({ success: false, error: "Not found." }, 404);

    let parsedQuote = null;
    if (quote.quote_json) {
      try { parsedQuote = JSON.parse(quote.quote_json); } catch {}
    }

    return jsonResponse({ success: true, quote: { ...quote, quote_json: undefined, quote_data: parsedQuote } });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

// POST — update a quote (only if not yet accepted)
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "firm");
    if (!session) return unauthorised();

    const body = await request.json();
    const { internal_reference, firm_reference, client_name, client_email,
            client_phone, transaction_type, tenure, price, postcode,
            quote_json, email_signature } = body;

    if (!internal_reference) {
      return jsonResponse({ success: false, error: "internal_reference required." }, 400);
    }

    const existing = await env.DB.prepare(
      `SELECT id, status FROM firm_quotes WHERE internal_reference = ? AND firm_id = ? LIMIT 1`
    ).bind(internal_reference, session.user_id).first();

    if (!existing) return jsonResponse({ success: false, error: "Not found." }, 404);
    if (existing.status === "accepted") {
      return jsonResponse({ success: false, error: "Cannot edit an accepted quote." }, 409);
    }

    await env.DB.prepare(
      `UPDATE firm_quotes
       SET firm_reference = ?, client_name = ?, client_email = ?,
           client_phone = ?, transaction_type = ?, tenure = ?,
           price = ?, postcode = ?, quote_json = ?,
           email_signature = ?, updated_at = datetime('now')
       WHERE internal_reference = ? AND firm_id = ?`
    ).bind(
      firm_reference || null,
      client_name || null,
      client_email || null,
      client_phone || null,
      transaction_type || null,
      tenure || null,
      Number(price) || null,
      postcode || null,
      typeof quote_json === "string" ? quote_json : JSON.stringify(quote_json || {}),
      email_signature || null,
      internal_reference,
      session.user_id
    ).run();

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
