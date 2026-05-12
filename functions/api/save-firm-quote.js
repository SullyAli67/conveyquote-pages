// functions/api/save-firm-quote.js
//
// Phase 2 of Type 2 firm-quoting product.
//
// Persists a firm-issued quote. Computes the quote via the shared core
// (same code path as POST /api/calculate-firm-quote) so a saved quote
// always matches the preview the firm just confirmed. Returns the new
// row id plus the calculated grand total / warnings.
//
// Phase 5 will add credit decrement here. For now: pure save.

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";
import { calculateFirmQuote } from "../lib/calculate-firm-quote-core.js";

// Conservative email regex — no deliverability guarantee, just rejects
// obvious typos. Empty string is valid (email is optional in Phase 2).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "firm");
    if (!session) return unauthorised();

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse(
        { success: false, error: "Invalid request body." },
        400
      );
    }

    // ── Field validation specific to saving ──────────────────────────
    const clientName = String(body.clientName || "").trim();
    if (!clientName) {
      return jsonResponse(
        { success: false, error: "Client name is required." },
        400
      );
    }

    const clientEmail = String(body.clientEmail || "").trim();
    if (clientEmail && !EMAIL_RE.test(clientEmail)) {
      return jsonResponse(
        { success: false, error: "Client email format is not valid." },
        400
      );
    }

    const notes = String(body.notes || "").trim();

    // ── Compute via the shared core ──────────────────────────────────
    const result = await calculateFirmQuote({
      db: env.DB,
      firmId: session.user_id,
      body,
    });

    if (!result.ok) {
      return jsonResponse(
        { success: false, error: result.error },
        result.status
      );
    }

    const calc = result.payload;

    // ── Persist ──────────────────────────────────────────────────────
    // Store the inputs the firm submitted (so we can re-render or audit)
    // alongside the calculated output. Strip auth + housekeeping fields
    // from inputs; everything else is part of the matter record.
    const inputsToStore = {
      transactionType: body.transactionType,
      price: body.price,
      salePrice: body.salePrice,
      tenure: body.tenure,
      postcode: body.postcode,
      buyerCount: body.buyerCount,
      mortgageOrCash: body.mortgageOrCash,
      lender: body.lender,
      supplements: body.supplements,
      sdltFlags: body.sdltFlags,
    };

    const insertResult = await env.DB.prepare(
      `INSERT INTO firm_issued_quotes
         (firm_id, client_name, client_email, transaction_type,
          quote_inputs, quote_output, grand_total, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        session.user_id,
        clientName,
        clientEmail,
        calc.transactionType,
        JSON.stringify(inputsToStore),
        JSON.stringify(calc),
        Number(calc.grandTotal) || 0,
        notes
      )
      .run();

    const quoteId =
      insertResult?.meta?.last_row_id ??
      insertResult?.lastRowId ??
      null;

    return jsonResponse({
      success: true,
      quoteId,
      grandTotal: calc.grandTotal,
      warnings: calc.warnings || [],
    });
  } catch (error) {
    console.error("save-firm-quote error:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}
