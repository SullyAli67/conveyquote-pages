// functions/api/archive-enquiry.js
// Referrer-accessible soft-delete. Sets status = 'archived' so the case is
// hidden from the referrer portal but the record is never destroyed.
// Blocked if the enquiry has an active invoice or has been assigned to a firm.

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
    const session = await validateSession(env.DB, token, "referrer");
    if (!session) return unauthorised();

    const referrerId = session.user_id;
    const { reference } = await request.json();

    if (!reference) {
      return jsonResponse({ success: false, error: "Reference is required." }, 400);
    }

    // Fetch the enquiry — must belong to this referrer
    const enquiry = await env.DB.prepare(
      `SELECT reference, status, assigned_firm_id, invoice_ref
       FROM enquiries
       WHERE reference = ? AND referrer_id = ?
       LIMIT 1`
    ).bind(reference, referrerId).first();

    if (!enquiry) {
      return jsonResponse({ success: false, error: "Enquiry not found." }, 404);
    }

    // Block if already assigned to a firm
    if (enquiry.assigned_firm_id) {
      return jsonResponse({
        success: false,
        error: "This matter has been assigned to a firm and cannot be archived. Contact us if you need to remove it.",
      }, 400);
    }

    // Block if there is an active invoice
    if (enquiry.invoice_ref) {
      return jsonResponse({
        success: false,
        error: "This matter has an invoice attached and cannot be archived.",
      }, 400);
    }

    // Block if already archived
    if (enquiry.status === "archived") {
      return jsonResponse({ success: false, error: "Already archived." }, 400);
    }

    // Soft-delete: set status to archived
    await env.DB.prepare(
      `UPDATE enquiries SET status = 'archived' WHERE reference = ?`
    ).bind(reference).run();

    // Audit log (non-fatal)
    try {
      await env.DB.prepare(
        `INSERT INTO audit_log (action, reference, actor, details)
         VALUES ('enquiry_archived', ?, 'referrer', 'Archived by referrer via portal')`
      ).bind(reference).run();
    } catch (e) {
      console.error("Audit log error:", e);
    }

    return jsonResponse({ success: true, reference });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
