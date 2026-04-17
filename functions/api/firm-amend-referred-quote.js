// functions/api/firm-amend-referred-quote.js
//
// Allows a firm to amend the quote on a matter that has been referred to them.
// Referrers cannot do this — pricing is handled centrally and firms may adjust
// for complexity once they have reviewed the full details.
//
// The amended quote is saved back to enquiries.quote_json.
// The original referrer-generated quote is preserved in quote_json_original
// (added on first amendment only, so there is always an audit trail).

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
      `SELECT id, assigned_firm_id, quote_json, quote_json_original
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

    // On first amendment: preserve the original quote for audit purposes
    const originalJson = enquiry.quote_json_original ?? enquiry.quote_json;

    await env.DB.prepare(
      `UPDATE enquiries
       SET quote_json          = ?,
           quote_json_original = ?,
           updated_at          = datetime('now')
       WHERE reference = ?`
    )
      .bind(
        JSON.stringify(updatedQuote),
        originalJson,
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
