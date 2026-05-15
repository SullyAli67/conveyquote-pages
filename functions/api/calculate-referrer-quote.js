// functions/api/calculate-referrer-quote.js
//
// Pattern B per-referrer quote calculation. Thin wrapper over
// functions/lib/calculate-referrer-quote-core.js — the engine reads the
// referrer's saved fee config (referrer_fee_configs) and combines it
// with central disbursement and SDLT calculators.
//
// All pricing logic lives in the core module — see the header there for
// the rules. This endpoint only handles auth and request/response
// plumbing.

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";
import { calculateReferrerQuote } from "../lib/calculate-referrer-quote-core.js";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "referrer");
    if (!session) return unauthorised();

    const body = await request.json().catch(() => null);
    const result = await calculateReferrerQuote({
      db: env.DB,
      referrerId: session.user_id,
      body,
    });

    if (!result.ok) {
      return jsonResponse({ success: false, error: result.error }, result.status);
    }
    return jsonResponse(result.payload, result.status);
  } catch (error) {
    console.error("calculate-referrer-quote error:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}
