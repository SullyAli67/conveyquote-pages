// functions/api/get-firm-history.js
// Returns all enquiries assigned to a panel firm plus their invoice data.
// Used by the admin Firms tab "History" view.

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
    const session = await validateSession(env.DB, token, "admin");
    if (!session) return unauthorised();

    const url    = new URL(request.url);
    const firmId = url.searchParams.get("firm_id");

    if (!firmId) {
      return jsonResponse({ success: false, error: "firm_id is required." }, 400);
    }

    const firm = await env.DB.prepare(
      `SELECT id, firm_name, contact_email, default_referral_fee, suspended
       FROM panel_firms WHERE id = ? LIMIT 1`
    ).bind(Number(firmId)).first();

    if (!firm) {
      return jsonResponse({ success: false, error: "Firm not found." }, 404);
    }

    const enquiries = await env.DB.prepare(
      `SELECT reference, client_name, client_email, transaction_type, price,
              postcode, case_status, panel_status, eta_date,
              referral_fee_payable, referral_fee_amount,
              invoice_ref, invoice_json, invoice_status,
              voided_invoice_ref,
              referred_at, updated_at, created_at
       FROM enquiries
       WHERE assigned_firm_id = ?
       ORDER BY referred_at DESC NULLS LAST, created_at DESC`
    ).bind(Number(firmId)).all();

    // Totals
    let totalReferrals  = 0;
    let totalInvoiced   = 0;
    let totalPaid       = 0;

    (enquiries.results || []).forEach((e) => {
      totalReferrals++;
      if (e.invoice_ref && e.invoice_json) {
        try {
          const inv = JSON.parse(e.invoice_json);
          const gross = Number(inv.total_gross || 0);
          totalInvoiced += gross;
          if (e.invoice_status === "paid") totalPaid += gross;
        } catch {}
      }
    });

    return jsonResponse({
      success: true,
      firm,
      enquiries: enquiries.results || [],
      summary: { totalReferrals, totalInvoiced, totalPaid },
    });
  } catch (error) {
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
}
