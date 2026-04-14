// functions/api/void-invoice.js
// Voids an invoice by clearing invoice_ref and invoice_json on the enquiry.
// The enquiry itself is kept intact. A voided invoice no longer appears in
// the invoices tab or counts toward totals.

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

    // Fetch the enquiry so we can log what we're voiding
    const enquiry = await env.DB.prepare(
      `SELECT invoice_ref, invoice_json FROM enquiries WHERE reference = ? LIMIT 1`
    ).bind(reference).first();

    if (!enquiry) {
      return jsonResponse({ success: false, error: "Enquiry not found." }, 404);
    }

    if (!enquiry.invoice_ref) {
      return jsonResponse({ success: false, error: "No invoice exists for this enquiry." }, 400);
    }

    // Store the voided invoice data in a separate column so it is not lost,
    // then clear the live invoice fields so it no longer appears in lists.
    await env.DB.prepare(
      `UPDATE enquiries
       SET voided_invoice_ref  = invoice_ref,
           voided_invoice_json = invoice_json,
           invoice_ref         = NULL,
           invoice_json        = NULL,
           invoice_status      = NULL,
           updated_at          = datetime('now')
       WHERE reference = ?`
    ).bind(reference).run();

    // Audit log
    try {
      await env.DB.prepare(
        `INSERT INTO audit_log (action, reference, firm_name, actor, details)
         VALUES ('invoice_voided', ?, ?, 'admin', ?)`
      ).bind(reference, null, `Voided invoice ${enquiry.invoice_ref}`).run();
    } catch (e) { console.error("Audit log error:", e); }

    return jsonResponse({
      success: true,
      reference,
      voided_invoice_ref: enquiry.invoice_ref,
    });
  } catch (error) {
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
}
