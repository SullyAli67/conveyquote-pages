// functions/api/firm-fee-config.js
import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";

// GET — load firm's saved fee config for a transaction type
export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "firm");
    if (!session) return unauthorised();

    const url = new URL(request.url);
    const transactionType = url.searchParams.get("type") || "";

    let sql = `SELECT * FROM firm_fee_configs WHERE firm_id = ?`;
    const binds = [session.user_id];

    if (transactionType) {
      sql += ` AND transaction_type = ?`;
      binds.push(transactionType);
    }

    sql += ` ORDER BY transaction_type, sort_order, id`;

    const result = await env.DB.prepare(sql).bind(...binds).all();

    return jsonResponse({ success: true, fees: result.results || [] });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

// POST — save fee config (replace all for a transaction type)
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "firm");
    if (!session) return unauthorised();

    const firmId = session.user_id;
    const { transaction_type, fees } = await request.json();

    if (!transaction_type || !Array.isArray(fees)) {
      return jsonResponse(
        { success: false, error: "transaction_type and fees array required." },
        400
      );
    }

    // Delete existing for this firm + transaction type
    await env.DB.prepare(
      `DELETE FROM firm_fee_configs WHERE firm_id = ? AND transaction_type = ?`
    ).bind(firmId, transaction_type).run();

    // Insert new rows
    for (let i = 0; i < fees.length; i++) {
      const fee = fees[i];
      if (!fee.label || fee.label.trim() === "") continue;
      await env.DB.prepare(
        `INSERT INTO firm_fee_configs
           (firm_id, transaction_type, label, amount, includes_vat, is_disbursement, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        firmId,
        transaction_type,
        String(fee.label).trim(),
        Number(fee.amount) || 0,
        fee.includes_vat ? 1 : 0,
        fee.is_disbursement ? 1 : 0,
        i
      ).run();
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
