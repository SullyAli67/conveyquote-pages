// functions/api/admin-delete-enquiries-bulk.js
//
// Bulk hard-delete for enquiries. Each row is processed independently
// against the same underlying logic the single endpoint uses — see
// functions/lib/delete-enquiry-core.js. Rows with active invoices are
// skipped (not deleted) and surfaced in the `skipped` array; the batch
// never fails because of one bad row.

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";
import {
  deleteEnquiryCore,
  deleteReasonShort,
} from "../lib/delete-enquiry-core.js";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "admin");
    if (!session) return unauthorised();

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse(
        { success: false, error: "Invalid request body." },
        400
      );
    }

    const refs = Array.isArray(body.references)
      ? body.references
          .map((r) => (typeof r === "string" ? r.trim() : ""))
          .filter((r) => r.length > 0)
      : [];

    if (refs.length === 0) {
      return jsonResponse(
        { success: false, error: "references array is required." },
        400
      );
    }

    const results = [];
    const skipped = [];
    let deleted = 0;

    for (const reference of refs) {
      try {
        const outcome = await deleteEnquiryCore(env.DB, reference);
        if (outcome.ok) {
          deleted += 1;
          results.push({ reference, ok: true });
        } else {
          const reason = deleteReasonShort(outcome.code);
          results.push({ reference, ok: false, reason });
          skipped.push({ reference, reason });
        }
      } catch (rowError) {
        console.error(
          `admin-delete-enquiries-bulk row error (${reference}):`,
          rowError
        );
        const reason =
          rowError instanceof Error ? rowError.message : "Unknown error";
        results.push({ reference, ok: false, reason });
        skipped.push({ reference, reason });
      }
    }

    return jsonResponse({
      success: true,
      processed: results.length,
      deleted,
      skipped,
      results,
    });
  } catch (error) {
    console.error("admin-delete-enquiries-bulk error:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}
