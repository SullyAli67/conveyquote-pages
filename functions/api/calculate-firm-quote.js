// functions/api/calculate-firm-quote.js
//
// Phase 1 / Phase 2 of Type 2 firm-quoting product.
//
// Thin wrapper over the shared calculation core. Generates a quote for
// a firm-issued matter without persisting it. Used by the Issue Quote
// preview flow — POST /api/save-firm-quote saves the same calculation
// to the firm_issued_quotes table.
//
// All calculation logic, pricing-isolation guarantees, and disbursement
// sourcing live in functions/lib/calculate-firm-quote-core.js — see the
// header there for the rules.

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";
import { calculateFirmQuote } from "../lib/calculate-firm-quote-core.js";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "firm");
    if (!session) return unauthorised();

    const body = await request.json().catch(() => null);
    const result = await calculateFirmQuote({
      db: env.DB,
      firmId: session.user_id,
      body,
    });

    if (!result.ok) {
      return jsonResponse({ success: false, error: result.error }, result.status);
    }
    return jsonResponse(result.payload, result.status);
  } catch (error) {
    console.error("calculate-firm-quote error:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}
