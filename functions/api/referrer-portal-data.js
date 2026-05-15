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
    // Workflow fields (referrer_note, parent_enquiry_id, allocated_at)
    // live in the referrer_workflow side-table — see migration 0013.
    const enquiriesResult = await env.DB.prepare(
      `SELECT
         e.id, e.reference, e.client_name, e.client_email, e.client_phone,
         e.transaction_type, e.tenure, e.price, e.postcode,
         e.property_address, e.negotiator_name,
         e.status, e.panel_status, e.case_status, e.eta_date,
         e.target_completion_date, e.fall_through_reason,
         e.assigned_firm_name, e.firm_response,
         e.referred_at, e.created_at, e.referral_fee_payable, e.referral_fee_amount,
         w.referrer_note,
         e.mortgage, e.lender, e.ownership_type, e.first_time_buyer, e.new_build,
         e.shared_ownership, e.help_to_buy, e.is_company, e.buy_to_let,
         e.gifted_deposit, e.additional_property, e.uk_resident_for_sdlt,
         e.lifetime_isa, e.right_to_buy,
         e.sale_mortgage, e.management_company, e.tenanted, e.number_of_sellers,
         e.additional_borrowing, e.remortgage_transfer, e.transfer_mortgage,
         e.owners_changing,
         w.parent_enquiry_id, w.allocated_at,
         e.quote_json, e.approved_quote_json, e.approved_quote_amount
       FROM enquiries e
       LEFT JOIN referrer_workflow w ON w.enquiry_id = e.id
       WHERE e.referrer_id = ?
       ORDER BY e.created_at DESC`
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
