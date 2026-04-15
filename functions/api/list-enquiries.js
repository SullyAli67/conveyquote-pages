import {
  getTokenFromRequest,
  validateSession,
} from "../lib/auth.js";

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();
    const assigned = url.searchParams.get("assigned") === "1";
    const invoiced = url.searchParams.get("invoiced") === "1";
    const statusFilter = url.searchParams.get("status") || "";
    const firmFilter = url.searchParams.get("firm_id") || "";
    const referrerFilter = url.searchParams.get("referrer_id") || "";

    let sql = `
      SELECT
        e.id,
        e.reference,
        e.client_name,
        e.client_email,
        e.client_phone,
        e.transaction_type,
        e.status,
        e.panel_status,
        e.case_status,
        e.eta_date,
        e.assigned_firm_name,
        e.assigned_firm_id,
        e.firm_response,
        e.invoice_ref,
        e.invoice_json,
        e.invoice_status,
        e.voided_invoice_ref,
        e.voided_invoice_json,
        e.referrer_id,
        e.referral_fee_payable,
        e.referral_fee_amount,
        e.price,
        e.tenure,
        e.postcode,
        e.created_at,
        e.referred_at,
        r.referrer_name
      FROM enquiries e
      LEFT JOIN referrers r ON r.id = e.referrer_id
      WHERE 1 = 1
    `;

    const binds = [];

    if (q) {
      sql += ` AND (e.reference LIKE ? OR e.client_name LIKE ? OR e.client_email LIKE ?)`;
      binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (assigned) {
      sql += ` AND e.assigned_firm_id IS NOT NULL`;
    }

    if (invoiced) {
      sql += ` AND (e.invoice_ref IS NOT NULL OR e.voided_invoice_ref IS NOT NULL)`;
    }

    if (statusFilter) {
      sql += ` AND e.case_status = ?`;
      binds.push(statusFilter);
    }

    if (firmFilter) {
      sql += ` AND e.assigned_firm_id = ?`;
      binds.push(firmFilter);
    }

    if (referrerFilter) {
      sql += ` AND e.referrer_id = ?`;
      binds.push(referrerFilter);
    }

    sql += ` ORDER BY e.id DESC`;

    const results = await env.DB.prepare(sql).bind(...binds).all();

    return jsonResponse({
      success: true,
      enquiries: results.results || [],
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
