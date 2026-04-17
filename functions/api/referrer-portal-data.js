// functions/api/referrer-portal-data.js
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
    const session = await validateSession(env.DB, token, "referrer");
    if (!session) return unauthorised();

    const referrerId = session.user_id;

    const referrer = await env.DB.prepare(
      `SELECT id, referrer_name, contact_email, contact_phone, referral_fee, notes, created_at
       FROM referrers WHERE id = ? LIMIT 1`
    ).bind(referrerId).first();

    if (!referrer) return unauthorised();

    // Phase 1: include property_address, target_completion_date, fall_through_reason, negotiator_name
    const enquiriesResult = await env.DB.prepare(
      `SELECT
         id, reference, client_name, client_email, client_phone,
         transaction_type, tenure, price, postcode,
         property_address, negotiator_name,
         status, panel_status, case_status, eta_date,
         target_completion_date, fall_through_reason,
         assigned_firm_name, firm_response,
         referred_at, created_at, referral_fee_payable, referral_fee_amount,
         quote_json, approved_quote_json, approved_quote_amount
       FROM enquiries
       WHERE referrer_id = ?
       ORDER BY created_at DESC`
    ).bind(referrerId).all();

    // Prefer approved_quote_json (admin-reviewed, sent to client) over auto-generated quote_json
    const enquiries = (enquiriesResult.results || []).map((e) => {
      let quote = null;
      const rawJson = e.approved_quote_json || e.quote_json;
      if (rawJson) {
        try { quote = JSON.parse(rawJson); } catch {}
      }
      const { quote_json, approved_quote_json, ...rest } = e;
      return {
        ...rest,
        quote,
        has_approved_quote: Boolean(e.approved_quote_json),
      };
    });

    return jsonResponse({
      success: true,
      referrer,
      enquiries,
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
