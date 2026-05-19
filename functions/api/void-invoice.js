// functions/api/void-invoice.js
// Voids the active invoice for an enquiry by updating its row in the
// invoices table — status='voided' and voided_at set. The previous
// column-shuffling model is gone; voided invoices stay in the table
// as their own rows, so any number of voids per enquiry are preserved.

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "admin");
    if (!session) return unauthorised();

    const { reference } = await request.json();

    if (!reference) {
      return jsonResponse({ success: false, error: "Reference is required." }, 400);
    }

    const enquiry = await env.DB.prepare(
      `SELECT id FROM enquiries WHERE reference = ? LIMIT 1`
    ).bind(reference).first();

    if (!enquiry) {
      return jsonResponse({ success: false, error: "Enquiry not found." }, 404);
    }

    const invoice = await env.DB.prepare(
      `SELECT id, invoice_ref FROM invoices
       WHERE enquiry_id = ? AND status != 'voided'
       ORDER BY id DESC LIMIT 1`
    ).bind(enquiry.id).first();

    if (!invoice) {
      return jsonResponse({ success: false, error: "No invoice exists for this enquiry." }, 400);
    }

    await env.DB.prepare(
      `UPDATE invoices SET status = 'voided', voided_at = datetime('now') WHERE id = ?`
    ).bind(invoice.id).run();

    await env.DB.prepare(
      `UPDATE enquiries SET updated_at = datetime('now') WHERE reference = ?`
    ).bind(reference).run();

    // Audit log
    try {
      await env.DB.prepare(
        `INSERT INTO audit_log (action, reference, firm_name, actor, details)
         VALUES ('invoice_voided', ?, ?, 'admin', ?)`
      ).bind(reference, null, `Voided invoice ${invoice.invoice_ref}`).run();
    } catch (e) { console.error("Audit log error:", e); }

    return jsonResponse({
      success: true,
      reference,
      voided_invoice_ref: invoice.invoice_ref,
    });
  } catch (error) {
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
}
