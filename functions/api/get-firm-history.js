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

    // Per-enquiry list: LEFT JOIN to the latest non-voided invoice plus
    // the latest voided invoice. Each subquery returns at most one id
    // per enquiry, so the join cannot multiply enquiry rows.
    const enquiries = await env.DB.prepare(
      `SELECT e.reference, e.client_name, e.client_email,
              e.transaction_type, e.price,
              e.postcode, e.case_status, e.panel_status, e.eta_date,
              e.referral_fee_payable, e.referral_fee_amount,
              live_inv.invoice_ref  AS invoice_ref,
              live_inv.invoice_json AS invoice_json,
              live_inv.status       AS invoice_status,
              void_inv.invoice_ref  AS voided_invoice_ref,
              e.referred_at, e.updated_at, e.created_at
       FROM enquiries e
       LEFT JOIN invoices live_inv ON live_inv.id = (
         SELECT MAX(id) FROM invoices i
         WHERE i.enquiry_id = e.id AND i.status != 'voided'
       )
       LEFT JOIN invoices void_inv ON void_inv.id = (
         SELECT MAX(id) FROM invoices i
         WHERE i.enquiry_id = e.id AND i.status = 'voided'
       )
       WHERE e.assigned_firm_id = ?
       ORDER BY e.referred_at DESC NULLS LAST, e.created_at DESC`
    ).bind(Number(firmId)).all();

    // Totals — totalInvoiced and totalPaid come from a direct query
    // against invoices to ensure status='paid' is summed correctly even
    // if (hypothetically) a future enquiry has more than one non-voided
    // invoice. Filtering to status != 'voided' matches the pre-Phase-C
    // behaviour where voided invoices stopped contributing to totals.
    let totalReferrals = (enquiries.results || []).length;
    let totalInvoiced  = 0;
    let totalPaid      = 0;

    const invoiceTotals = await env.DB.prepare(
      `SELECT i.invoice_json, i.status
       FROM invoices i
       INNER JOIN enquiries e ON e.id = i.enquiry_id
       WHERE e.assigned_firm_id = ? AND i.status != 'voided'`
    ).bind(Number(firmId)).all();

    (invoiceTotals.results || []).forEach((row) => {
      if (!row.invoice_json) return;
      try {
        const inv = JSON.parse(row.invoice_json);
        const gross = Number(inv.total_gross || 0);
        totalInvoiced += gross;
        if (row.status === "paid") totalPaid += gross;
      } catch {}
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
