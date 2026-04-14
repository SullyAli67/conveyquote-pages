// functions/api/mark-invoice-paid.js
// Admin marks an invoice as paid (or reverts to issued).
// Updates enquiries.invoice_status and writes an audit log entry.

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";

async function writeAudit(db, { action, reference, firm_name, details }) {
  try {
    await db.prepare(
      `INSERT INTO audit_log (action, reference, firm_name, actor, details)
       VALUES (?, ?, ?, 'admin', ?)`
    ).bind(action, reference || null, firm_name || null, details || null).run();
  } catch (e) {
    console.error("Audit log error:", e);
  }
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "admin");
    if (!session) return unauthorised();

    const { reference, mark_as_paid } = await request.json();

    if (!reference) {
      return jsonResponse({ success: false, error: "Reference is required." }, 400);
    }

    const enquiry = await env.DB.prepare(
      `SELECT invoice_ref, invoice_status, assigned_firm_name
       FROM enquiries WHERE reference = ? LIMIT 1`
    ).bind(reference).first();

    if (!enquiry) {
      return jsonResponse({ success: false, error: "Enquiry not found." }, 404);
    }

    if (!enquiry.invoice_ref) {
      return jsonResponse({ success: false, error: "No invoice exists for this enquiry." }, 400);
    }

    const newStatus = mark_as_paid ? "paid" : "issued";

    await env.DB.prepare(
      `UPDATE enquiries SET invoice_status = ?, updated_at = datetime('now')
       WHERE reference = ?`
    ).bind(newStatus, reference).run();

    await writeAudit(env.DB, {
      action: mark_as_paid ? "invoice_marked_paid" : "invoice_marked_unpaid",
      reference,
      firm_name: enquiry.assigned_firm_name || null,
      details: `Invoice ${enquiry.invoice_ref} marked as ${newStatus}`,
    });

    return jsonResponse({ success: true, reference, invoice_status: newStatus });
  } catch (error) {
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
}
