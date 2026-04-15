// functions/api/firm-portal-data.js
import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";

export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    // Validate firm session
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "firm");
    if (!session) return unauthorised();

    const firmId = session.user_id;

    // Load firm profile
    const firm = await env.DB.prepare(
      `SELECT
         id, firm_name, contact_name, contact_email, contact_phone,
         active, panel_terms_accepted, panel_terms_accepted_at,
         handles_purchase, handles_sale, handles_remortgage,
         handles_transfer, handles_leasehold, handles_new_build,
         handles_company_buyers, notes, created_at
       FROM panel_firms
       WHERE id = ?
       LIMIT 1`
    )
      .bind(firmId)
      .first();

    if (!firm) return unauthorised();

    // Load enquiries assigned to this firm
    const enquiriesResult = await env.DB.prepare(
      `SELECT
         id, reference, client_name, client_email, client_phone,
         transaction_type, tenure, price, postcode,
         status, panel_status, firm_response, firm_responded_at,
         firm_response_notes, referred_at, created_at,
         referral_fee_payable, referral_fee_amount,
         case_status, eta_date, invoice_ref,
         quote_json
       FROM enquiries
       WHERE assigned_firm_id = ?
       ORDER BY referred_at DESC`
    )
      .bind(firmId)
      .all();

    // Load lender memberships for this firm
    const membershipsResult = await env.DB.prepare(
      `SELECT
         m.id, m.active, m.notes, m.last_checked_at,
         l.lender_name
       FROM panel_firm_lender_memberships m
       INNER JOIN panel_lenders l ON l.id = m.lender_id
       WHERE m.firm_id = ?
       ORDER BY l.lender_name COLLATE NOCASE ASC`
    )
      .bind(firmId)
      .all();

    // Parse quote_json for each enquiry (strip raw JSON from response)
    const enquiries = (enquiriesResult.results || []).map((e) => {
      let quote = null;
      if (e.quote_json) {
        try {
          quote = JSON.parse(e.quote_json);
        } catch {}
      }
      const { quote_json, ...rest } = e;
      return { ...rest, quote };
    });

    return jsonResponse({
      success: true,
      firm,
      enquiries,
      memberships: membershipsResult.results || [],
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}
