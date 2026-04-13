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

    // Load all enquiries submitted by this referrer
    const enquiriesResult = await env.DB.prepare(
      `SELECT
         id, reference, client_name, client_email, client_phone,
         transaction_type, tenure, price, postcode,
         status, panel_status, case_status, eta_date,
         assigned_firm_name, firm_response,
         referred_at, created_at, referral_fee_payable, referral_fee_amount
       FROM enquiries
       WHERE referrer_id = ?
       ORDER BY created_at DESC`
    ).bind(referrerId).all();

    return jsonResponse({
      success: true,
      referrer,
      enquiries: enquiriesResult.results || [],
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
