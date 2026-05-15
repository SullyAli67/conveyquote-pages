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
         referrer_note,
         mortgage, lender, ownership_type, first_time_buyer, new_build,
         shared_ownership, help_to_buy, is_company, buy_to_let,
         gifted_deposit, additional_property, uk_resident_for_sdlt,
         lifetime_isa, right_to_buy,
         sale_mortgage, management_company, tenanted, number_of_sellers,
         additional_borrowing, remortgage_transfer, transfer_mortgage,
         owners_changing,
         parent_enquiry_id, allocated_at,
         quote_json, approved_quote_json, approved_quote_amount
       FROM enquiries
       WHERE referrer_id = ?
       ORDER BY created_at DESC`
    ).bind(referrerId).all();

    // Build a set of enquiry ids that have at least one child (i.e.
    // they were re-quoted). Used by the portal to render a "Superseded
    // by [ref]" indicator on the parent row and to disable Re-quote /
    // Request allocation actions on a row that already has a successor.
    const rows = enquiriesResult.results || [];
    const childByParent = new Map();
    for (const e of rows) {
      if (e.parent_enquiry_id != null) {
        childByParent.set(Number(e.parent_enquiry_id), {
          id: Number(e.id),
          reference: String(e.reference || ""),
        });
      }
    }

    // Prefer approved_quote_json (admin-reviewed, sent to client) over auto-generated quote_json
    const enquiries = rows.map((e) => {
      let quote = null;
      const rawJson = e.approved_quote_json || e.quote_json;
      if (rawJson) {
        try { quote = JSON.parse(rawJson); } catch {}
      }
      const { quote_json, approved_quote_json, ...rest } = e;
      const successor = childByParent.get(Number(e.id)) || null;
      return {
        ...rest,
        quote,
        has_approved_quote: Boolean(e.approved_quote_json),
        successor_reference: successor ? successor.reference : null,
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
