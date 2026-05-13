// functions/lib/delete-enquiry-core.js
//
// Shared hard-delete logic for an enquiry row. Used by both
//   POST /api/delete-quote                  (single delete, admin)
//   POST /api/admin-delete-enquiries-bulk   (bulk delete, admin)
//
// The auth check, request parsing, and HTTP response shape stay in
// the calling endpoints. This module is responsible for: looking up
// the row, enforcing the invoice guardrail, deleting, writing the
// audit log entry, and returning a structured result the caller can
// format for either flow.
//
// Behaviour is identical to the original inline logic in
// functions/api/delete-quote.js — extracted here verbatim so the
// existing single endpoint's external behaviour is unchanged.

const REASON_LONG = {
  missing_reference: "Reference is required.",
  not_found: "Enquiry not found.",
  invoice_exists:
    "This enquiry has an active invoice. Please void the invoice first before deleting.",
};

const REASON_SHORT = {
  missing_reference: "No reference",
  not_found: "Not found",
  invoice_exists: "Invoice exists — void first",
};

const REASON_STATUS = {
  missing_reference: 400,
  not_found: 404,
  invoice_exists: 400,
};

export function deleteReasonLong(code) {
  return REASON_LONG[code] || "Unknown error";
}

export function deleteReasonShort(code) {
  return REASON_SHORT[code] || "Unknown error";
}

export function deleteReasonStatus(code) {
  return REASON_STATUS[code] || 500;
}

export async function deleteEnquiryCore(db, reference) {
  if (!reference) {
    return { ok: false, code: "missing_reference" };
  }

  const enquiry = await db
    .prepare(`SELECT invoice_ref FROM enquiries WHERE reference = ? LIMIT 1`)
    .bind(reference)
    .first();

  if (!enquiry) {
    return { ok: false, code: "not_found" };
  }

  if (enquiry.invoice_ref) {
    return { ok: false, code: "invoice_exists" };
  }

  await db
    .prepare(`DELETE FROM enquiries WHERE reference = ?`)
    .bind(reference)
    .run();

  // Audit log — non-fatal.
  try {
    await db
      .prepare(
        `INSERT INTO audit_log (action, reference, actor, details)
         VALUES ('quote_deleted', ?, 'admin', 'Enquiry permanently deleted')`
      )
      .bind(reference)
      .run();
  } catch (e) {
    console.error("Audit log error:", e);
  }

  return { ok: true };
}
