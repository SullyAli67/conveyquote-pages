// functions/api/firm-fee-config.js
import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";
import { VALID_SUPPLEMENT_KEYS } from "../lib/calculate-firm-quote-core.js";

const VALID_SUPPLEMENT_KEY_SET = new Set(VALID_SUPPLEMENT_KEYS);

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

    // Validate supplement_keys: must be canonical and unique per
    // transaction_type. Caught here rather than at INSERT time so the
    // wholesale delete-then-insert doesn't run on an invalid payload.
    const seenKeys = new Set();
    for (const fee of fees) {
      const key = fee.supplement_key;
      if (key === null || key === undefined || key === "") continue;
      if (!VALID_SUPPLEMENT_KEY_SET.has(key)) {
        return jsonResponse(
          { success: false, error: `Unknown supplement_key '${key}'.` },
          400
        );
      }
      if (seenKeys.has(key)) {
        return jsonResponse(
          {
            success: false,
            error: `Duplicate supplement_key '${key}' for ${transaction_type}.`,
          },
          400
        );
      }
      seenKeys.add(key);
    }

    // Delete existing for this firm + transaction type
    await env.DB.prepare(
      `DELETE FROM firm_fee_configs WHERE firm_id = ? AND transaction_type = ?`
    ).bind(firmId, transaction_type).run();

    // Insert new rows
    for (let i = 0; i < fees.length; i++) {
      const fee = fees[i];
      if (!fee.label || fee.label.trim() === "") continue;
      const supplementKey =
        fee.supplement_key && VALID_SUPPLEMENT_KEY_SET.has(fee.supplement_key)
          ? fee.supplement_key
          : null;
      await env.DB.prepare(
        `INSERT INTO firm_fee_configs
           (firm_id, transaction_type, label, amount, includes_vat, is_disbursement, sort_order, supplement_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        firmId,
        transaction_type,
        String(fee.label).trim(),
        Number(fee.amount) || 0,
        fee.includes_vat ? 1 : 0,
        fee.is_disbursement ? 1 : 0,
        i,
        supplementKey
      ).run();
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
