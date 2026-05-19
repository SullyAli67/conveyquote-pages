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
         handles_company_buyers, notes, created_at,
         is_panel_firm, is_saas_firm
       FROM panel_firms
       WHERE id = ?
       LIMIT 1`
    )
      .bind(firmId)
      .first();

    if (!firm) return unauthorised();

    // Load enquiries assigned to this firm. invoice_ref now comes from
    // the latest non-voided row in the invoices table (Phase C).
    const enquiriesResult = await env.DB.prepare(
      `SELECT
         e.id, e.reference, e.client_name, e.client_email, e.client_phone,
         e.transaction_type, e.tenure, e.price, e.postcode, e.property_address,
         e.mortgage, e.lender, e.negotiator_name,
         e.status, e.panel_status, e.firm_response, e.firm_responded_at,
         e.firm_response_notes, e.referred_at, e.created_at,
         e.referral_fee_payable, e.referral_fee_amount,
         e.case_status, e.eta_date,
         live_inv.invoice_ref AS invoice_ref,
         e.quote_json, e.approved_quote_json, e.approved_quote_amount
       FROM enquiries e
       LEFT JOIN invoices live_inv ON live_inv.id = (
         SELECT MAX(id) FROM invoices i
         WHERE i.enquiry_id = e.id AND i.status != 'voided'
       )
       WHERE e.assigned_firm_id = ?
       ORDER BY e.referred_at DESC`
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

    // Parse quote data for each enquiry.
    // approved_quote_json is the admin-reviewed version actually sent to the client.
    // Fall back to quote_json (auto-generated) only if no approved version exists yet.
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
