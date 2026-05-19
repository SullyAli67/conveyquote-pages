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

    // Invoice columns are now sourced from the invoices table via two
    // single-row LEFT JOINs: the latest non-voided invoice ("current")
    // populates invoice_ref / invoice_json / invoice_status, and the
    // latest voided invoice populates voided_invoice_ref /
    // voided_invoice_json. Response shape stays identical to before
    // Phase C so existing readers keep working.
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
        live_inv.invoice_ref            AS invoice_ref,
        live_inv.invoice_json           AS invoice_json,
        live_inv.status                 AS invoice_status,
        void_inv.invoice_ref            AS voided_invoice_ref,
        void_inv.invoice_json           AS voided_invoice_json,
        e.referrer_id,
        e.referral_fee_payable,
        e.referral_fee_amount,
        e.price,
        e.tenure,
        e.postcode,
        e.property_address,
        e.negotiator_name,
        e.target_completion_date,
        e.fall_through_reason,
        e.decline_reason,
        w.referrer_note,
        w.parent_enquiry_id,
        w.allocation_requested_at,
        w.allocated_at,
        e.created_at,
        e.referred_at,
        r.referrer_name,
        successor.reference AS successor_reference
      FROM enquiries e
      LEFT JOIN referrers r ON r.id = e.referrer_id
      LEFT JOIN referrer_workflow w ON w.enquiry_id = e.id
      LEFT JOIN referrer_workflow w2 ON w2.parent_enquiry_id = e.id
      LEFT JOIN enquiries successor ON successor.id = w2.enquiry_id
      LEFT JOIN invoices live_inv ON live_inv.id = (
        SELECT MAX(id) FROM invoices i
        WHERE i.enquiry_id = e.id AND i.status != 'voided'
      )
      LEFT JOIN invoices void_inv ON void_inv.id = (
        SELECT MAX(id) FROM invoices i
        WHERE i.enquiry_id = e.id AND i.status = 'voided'
      )
      WHERE 1 = 1
    `;

    const binds = [];

    if (q) {
      sql += ` AND (e.reference LIKE ? OR e.client_name LIKE ? OR e.client_email LIKE ? OR e.property_address LIKE ?)`;
      binds.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (assigned) {
      sql += ` AND e.assigned_firm_id IS NOT NULL`;
    }

    if (invoiced) {
      sql += ` AND (live_inv.id IS NOT NULL OR void_inv.id IS NOT NULL)`;
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
