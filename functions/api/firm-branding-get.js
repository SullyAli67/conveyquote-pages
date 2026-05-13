// functions/api/firm-branding-get.js
//
// Phase 4 of Type 2 firm-quoting product.
//
// Returns the current firm's branding state (display name, address,
// phone, email, logo key). Used by the firm Profile → Branding screen
// to populate the form on first render.
//
// Route: GET /api/firm-branding-get
// Auth:  firm session (Bearer token), is_saas_firm = 1 required.

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "firm");
    if (!session) return unauthorised();

    const firmId = session.user_id;

    const firm = await env.DB.prepare(
      `SELECT id, is_saas_firm,
              brand_display_name, brand_address,
              brand_phone, brand_email, brand_logo_key
         FROM panel_firms
        WHERE id = ?
        LIMIT 1`
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

    return jsonResponse({
      success: true,
      branding: {
        displayName: firm.brand_display_name || "",
        address: firm.brand_address || "",
        phone: firm.brand_phone || "",
        email: firm.brand_email || "",
        logoKey: firm.brand_logo_key || "",
      },
    });
  } catch (error) {
    console.error("firm-branding-get error:", error);
    return jsonResponse(
      { success: false, error: "Could not load branding." },
      500
    );
  }
}
