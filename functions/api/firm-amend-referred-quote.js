// functions/api/firm-amend-referred-quote.js
//
// Allows a firm to amend the quote on a matter that has been referred to them.
// Referrers cannot do this — pricing is handled centrally and firms may adjust
// for complexity once they have reviewed the full details.
//
// The amended quote is saved back to enquiries.quote_json.
//
// The original (pre-amendment) quote is preserved inside the SAME quote_json
// column under a top-level `_original` key, captured on first amendment and
// left untouched by subsequent amendments so the audit trail is stable. This
// replaces an earlier attempt that used a `quote_json_original` column — that
// column was never created on production (enquiries hit the SQLite/D1
// 100-column cap before it could be added) and every call to this endpoint
// 500'd on "no such column: quote_json_original".
//
// All existing readers of quote_json (get-enquiry.js, firm-portal-data.js,
// check-pending-enquiries.js, src/App.tsx) access only well-known top-level
// keys (legalFees, disbursements, grandTotal, totalIncludingSdlt, …) so the
// extra `_original` key is invisible to them.

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";

const VAT_RATE = 0.2;

function sumItems(items) {
  return items.reduce((t, i) => t + Number(i.amount || 0), 0);
}

function buildUpdatedQuote(legalFees, disbursements, sdltAmount, sdltNote) {
  const legalFeesExVat   = Number(sumItems(legalFees).toFixed(2));
  const vat              = Number((legalFeesExVat * VAT_RATE).toFixed(2));
  const legalTotalInclVat = Number((legalFeesExVat + vat).toFixed(2));
  const disbursementTotal = Number(sumItems(disbursements).toFixed(2));
  const grandTotal        = Number((legalTotalInclVat + disbursementTotal).toFixed(2));
  const totalIncludingSdlt =
    typeof sdltAmount === "number"
      ? Number((grandTotal + sdltAmount).toFixed(2))
      : undefined;

  return {
    legalFees,
    disbursements,
    legalFeesExVat,
    vat,
    legalTotalInclVat,
    disbursementTotal,
    grandTotal,
    sdltAmount: typeof sdltAmount === "number" ? sdltAmount : undefined,
    sdltNote:   sdltNote || undefined,
    totalIncludingSdlt,
  };
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // Only firm sessions may call this endpoint
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "firm");
    if (!session) return unauthorised();
    const firmId = session.user_id;

    const body = await request.json();
    const { reference, legalFees, disbursements, sdltAmount, sdltNote } = body;

    if (!reference) {
      return jsonResponse({ success: false, error: "Reference is required." }, 400);
    }

    // Validate that this enquiry actually belongs to this firm
    const enquiry = await env.DB.prepare(
      `SELECT id, assigned_firm_id, quote_json
       FROM enquiries WHERE reference = ? LIMIT 1`
    ).bind(reference).first();

    if (!enquiry) {
      return jsonResponse({ success: false, error: "Enquiry not found." }, 404);
    }

    if (Number(enquiry.assigned_firm_id) !== Number(firmId)) {
      return jsonResponse(
        { success: false, error: "This matter is not assigned to your firm." },
        403
      );
    }

    // Validate items
    if (!Array.isArray(legalFees) || !Array.isArray(disbursements)) {
      return jsonResponse(
        { success: false, error: "legalFees and disbursements must be arrays." },
        400
      );
    }

    // Build the recalculated quote from the firm's amended line items
    const updatedQuote = buildUpdatedQuote(
      legalFees.map((f) => ({
        label:  String(f.label  || "").trim(),
        amount: Number(f.amount || 0),
        ...(f.note ? { note: String(f.note) } : {}),
      })),
      disbursements.map((d) => ({
        label:  String(d.label  || "").trim(),
        amount: Number(d.amount || 0),
        ...(d.note ? { note: String(d.note) } : {}),
      })),
      typeof sdltAmount === "number" ? sdltAmount : undefined,
      sdltNote || ""
    );

    // Preserve the pre-amendment quote inside quote_json under `_original`.
    // First amendment: snapshot the current quote_json as `_original`.
    // Subsequent amendments: keep the existing `_original` untouched so the
    // first-amendment snapshot remains the authoritative audit baseline.
    let priorQuote = null;
    if (enquiry.quote_json) {
      try {
        priorQuote = JSON.parse(enquiry.quote_json);
      } catch {
        priorQuote = null;
      }
    }
    const preservedOriginal =
      priorQuote && typeof priorQuote === "object" && priorQuote._original
        ? priorQuote._original
        : priorQuote;

    const nextQuoteJson = preservedOriginal
      ? { ...updatedQuote, _original: preservedOriginal }
      : updatedQuote;

    await env.DB.prepare(
      `UPDATE enquiries
       SET quote_json = ?,
           updated_at = datetime('now')
       WHERE reference = ?`
    )
      .bind(
        JSON.stringify(nextQuoteJson),
        reference
      )
      .run();

    return jsonResponse({ success: true, quote: updatedQuote });
  } catch (error) {
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      500
    );
  }
}
