// functions/api/delete-quote.js
// Permanently deletes a quote (enquiry row) from the database.
// Admin only. Refuses to delete if the enquiry already has an active invoice
// (void the invoice first). This protects against accidental financial data loss.

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

    // Safety check — block deletion if a live invoice exists
    const enquiry = await env.DB.prepare(
      `SELECT invoice_ref FROM enquiries WHERE reference = ? LIMIT 1`
    ).bind(reference).first();

    if (!enquiry) {
      return jsonResponse({ success: false, error: "Enquiry not found." }, 404);
    }

    if (enquiry.invoice_ref) {
      return jsonResponse({
        success: false,
        error: "This enquiry has an active invoice. Please void the invoice first before deleting.",
      }, 400);
    }

    await env.DB.prepare(
      `DELETE FROM enquiries WHERE reference = ?`
    ).bind(reference).run();

    // Audit log
    try {
      await env.DB.prepare(
        `INSERT INTO audit_log (action, reference, actor, details)
         VALUES ('quote_deleted', ?, 'admin', 'Enquiry permanently deleted')`
      ).bind(reference).run();
    } catch (e) { console.error("Audit log error:", e); }

    return jsonResponse({ success: true, reference });
  } catch (error) {
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
}
