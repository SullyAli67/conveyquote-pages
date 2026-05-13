// functions/api/delete-quote.js
// Permanently deletes a quote (enquiry row) from the database.
// Admin only. Refuses to delete if the enquiry already has an active invoice
// (void the invoice first). This protects against accidental financial data loss.
//
// Behaviour preserved — same response shape, same error strings, same
// audit log entry. The underlying logic now lives in
// functions/lib/delete-enquiry-core.js so the bulk endpoint
// (admin-delete-enquiries-bulk) can reuse it row-by-row without
// duplication.

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";
import {
  deleteEnquiryCore,
  deleteReasonLong,
  deleteReasonStatus,
} from "../lib/delete-enquiry-core.js";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "admin");
    if (!session) return unauthorised();

    const { reference } = await request.json();

    const result = await deleteEnquiryCore(env.DB, reference);

    if (!result.ok) {
      return jsonResponse(
        { success: false, error: deleteReasonLong(result.code) },
        deleteReasonStatus(result.code)
      );
    }

    return jsonResponse({ success: true, reference });
  } catch (error) {
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
}
