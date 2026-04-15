// functions/api/firm-quotes.js
import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
  generateToken,
} from "../lib/auth.js";

const escapeHtml = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const formatMoney = (v) =>
  `£${Number(v || 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getTransactionLabel = (type) => {
  if (type === "purchase") return "Purchase";
  if (type === "sale") return "Sale";
  if (type === "remortgage") return "Remortgage";
  if (type === "transfer") return "Transfer of Equity";
  return "Conveyancing Matter";
};

function generateInternalRef() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `FQ-${date}-${rand}`;
}

// GET — list all quotes for this firm
export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "firm");
    if (!session) return unauthorised();

    const result = await env.DB.prepare(
      `SELECT id, firm_reference, internal_reference, client_name, client_email,
              transaction_type, price, status, sent_at, accepted_at, created_at
       FROM firm_quotes
       WHERE firm_id = ?
       ORDER BY created_at DESC`
    ).bind(session.user_id).all();

    return jsonResponse({ success: true, quotes: result.results || [] });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

// POST — create a new quote
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "firm");
    if (!session) return unauthorised();

    const firmId = session.user_id;
    const body = await request.json();

    const {
      firm_reference,
      client_name,
      client_email,
      client_phone,
      transaction_type,
      tenure,
      price,
      postcode,
      quote_json,
      email_signature,
    } = body;

    if (!client_email || !transaction_type) {
      return jsonResponse(
        { success: false, error: "client_email and transaction_type are required." },
        400
      );
    }

    const internal_reference = generateInternalRef();

    await env.DB.prepare(
      `INSERT INTO firm_quotes
         (firm_id, firm_reference, internal_reference, client_name, client_email,
          client_phone, transaction_type, tenure, price, postcode,
          status, quote_json, email_signature)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`
    ).bind(
      firmId,
      firm_reference || null,
      internal_reference,
      client_name || null,
      client_email,
      client_phone || null,
      transaction_type,
      tenure || null,
      Number(price) || null,
      postcode || null,
      typeof quote_json === "string" ? quote_json : JSON.stringify(quote_json || {}),
      email_signature || null
    ).run();

    const row = await env.DB.prepare(
      `SELECT id FROM firm_quotes WHERE internal_reference = ? LIMIT 1`
    ).bind(internal_reference).first();

    return jsonResponse({ success: true, internal_reference, id: row?.id });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
