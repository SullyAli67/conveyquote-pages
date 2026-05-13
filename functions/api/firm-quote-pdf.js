// functions/api/firm-quote-pdf.js
//
// Phase 3 + Phase 4 of Type 2 firm-quoting product.
//
// Generates a PDF of a saved firm-issued quote. PDFs are not stored —
// every request renders fresh from the firm_issued_quotes row.
//
// Phase 5 (email-to-client) extracted the PDF-building functions into
// functions/lib/firm-quote-pdf-core.js so the firm-issued-quote-send
// endpoint can attach the same branded PDF without re-fetching via
// HTTP. This file is now a thin HTTP wrapper around that core.
//
// Route: GET /api/firm-quote-pdf?id=<id>
// Auth: firm session (Bearer token), is_saas_firm = 1 required, firm
// must own the quote (cross-firm requests get 404 — same posture as
// firm-quote-saved.js to avoid leaking quote-id existence).

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";
import {
  buildQuotePdf,
  buildFilename,
  loadFirmBranding,
} from "../lib/firm-quote-pdf-core.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  let quoteId = null;

  try {
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "firm");
    if (!session) return unauthorised();

    const firmId = session.user_id;

    const firm = await env.DB.prepare(
      `SELECT id, is_saas_firm FROM panel_firms WHERE id = ? LIMIT 1`
    )
      .bind(firmId)
      .first();

    if (!firm) {
      return jsonResponse({ success: false, error: "Firm not found." }, 404);
    }
    if (Number(firm.is_saas_firm) !== 1) {
      return jsonResponse(
        {
          success: false,
          error: "This firm is not enabled for the quoting product.",
        },
        403
      );
    }

    const url = new URL(request.url);
    const rawIdParam = url.searchParams.get("id");
    const rawId = Number(rawIdParam);
    if (
      rawIdParam === null ||
      rawIdParam === "" ||
      !Number.isFinite(rawId) ||
      !Number.isInteger(rawId) ||
      rawId <= 0
    ) {
      return jsonResponse({ success: false, error: "Invalid quote id" }, 400);
    }
    quoteId = rawId;

    const row = await env.DB.prepare(
      `SELECT id, firm_id, client_name, client_email, transaction_type,
              quote_inputs, quote_output, grand_total, issued_at, notes
         FROM firm_issued_quotes
        WHERE id = ?
        LIMIT 1`
    )
      .bind(quoteId)
      .first();

    // Same posture as firm-quote-saved.js: surface other-firm rows as 404
    // so the endpoint doesn't leak the id space.
    if (!row || Number(row.firm_id) !== Number(firmId)) {
      return jsonResponse({ success: false, error: "Quote not found." }, 404);
    }

    let inputs = null;
    let output = null;
    try {
      inputs = JSON.parse(row.quote_inputs);
    } catch {
      inputs = null;
    }
    try {
      output = JSON.parse(row.quote_output);
    } catch {
      output = null;
    }

    if (!output || typeof output !== "object") {
      console.error(
        `firm-quote-pdf: quote ${quoteId} has unparseable quote_output`
      );
      return jsonResponse(
        { success: false, error: "PDF generation failed - contact support." },
        500
      );
    }

    const clientName = String(row.client_name || "");
    const clientEmail = String(row.client_email || "");
    const issuedAt = String(row.issued_at || "");
    const transactionType = String(row.transaction_type || "");

    const branding = await loadFirmBranding(env, firmId);

    const pdfBytes = await buildQuotePdf({
      id: Number(row.id),
      clientName,
      clientEmail,
      issuedAt,
      transactionType,
      inputs,
      output,
      branding,
    });

    const filename = buildFilename(Number(row.id), clientName, issuedAt);

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error(
      `firm-quote-pdf error (quoteId=${quoteId}):`,
      error
    );
    return jsonResponse(
      { success: false, error: "PDF generation failed - contact support." },
      500
    );
  }
}
