// functions/api/referrer-fee-config.js
//
// Admin GET/POST for the per-referrer fee config used by the Pattern B
// engine. Mirrors functions/api/firm-fee-config.js exactly — same
// validation, same wholesale-replace POST semantics, same canonical
// supplement key set — but reads/writes referrer_fee_configs keyed on
// referrer_id and is admin-only (referrer self-service pricing is a
// future decision; for now only admin can edit referrer pricing).

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";
import { VALID_SUPPLEMENT_KEYS } from "../lib/calculate-referrer-quote-core.js";

const VALID_SUPPLEMENT_KEY_SET = new Set(VALID_SUPPLEMENT_KEYS);

// GET — load a referrer's saved fee config for a transaction type.
// referrer_id is required; transaction type is optional (omit to dump
// everything for that referrer, same as the firm endpoint).
export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "admin");
    if (!session) return unauthorised();

    const url = new URL(request.url);
    const referrerId = Number(url.searchParams.get("referrer_id"));
    const transactionType = url.searchParams.get("type") || "";

    if (!Number.isFinite(referrerId) || referrerId <= 0) {
      return jsonResponse(
        { success: false, error: "referrer_id query param is required." },
        400
      );
    }

    let sql = `SELECT * FROM referrer_fee_configs WHERE referrer_id = ?`;
    const binds = [referrerId];

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

// POST — save fee config (wholesale replace for referrer +
// transaction_type). referrer_id can come from query param or body.
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "admin");
    if (!session) return unauthorised();

    const url = new URL(request.url);
    const body = await request.json();
    const { transaction_type, fees } = body;
    const referrerId = Number(body.referrer_id ?? url.searchParams.get("referrer_id"));

    if (!Number.isFinite(referrerId) || referrerId <= 0) {
      return jsonResponse(
        { success: false, error: "referrer_id is required." },
        400
      );
    }
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

    // Delete existing for this referrer + transaction type
    await env.DB.prepare(
      `DELETE FROM referrer_fee_configs WHERE referrer_id = ? AND transaction_type = ?`
    ).bind(referrerId, transaction_type).run();

    // Insert new rows
    for (let i = 0; i < fees.length; i++) {
      const fee = fees[i];
      if (!fee.label || fee.label.trim() === "") continue;
      const supplementKey =
        fee.supplement_key && VALID_SUPPLEMENT_KEY_SET.has(fee.supplement_key)
          ? fee.supplement_key
          : null;
      await env.DB.prepare(
        `INSERT INTO referrer_fee_configs
           (referrer_id, transaction_type, label, amount, includes_vat, is_disbursement, sort_order, supplement_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        referrerId,
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
