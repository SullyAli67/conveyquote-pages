// functions/api/firm-update-branding.js
//
// Phase 4 of Type 2 firm-quoting product.
//
// Updates the brand_* text columns on panel_firms for the requesting
// firm. Each field is optional in the body: only fields present are
// touched. Empty-string clears a field (stored as NULL).
//
// Route: POST /api/firm-update-branding
// Body:  { displayName?, address?, phone?, email? }
// Auth:  firm session (Bearer token), is_saas_firm = 1 required.

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";

const MAX_DISPLAY_NAME = 100;
const MAX_ADDRESS = 300;
const MAX_PHONE = 30;
const MAX_EMAIL = 100;

// Mirrors the lightweight email check used elsewhere in the app — a
// strict RFC validator would reject too many real addresses.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normaliseString = (v) => {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string") return undefined;
  return v.trim();
};

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
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

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        { success: false, error: "Invalid request body." },
        400
      );
    }
    if (!body || typeof body !== "object") {
      return jsonResponse(
        { success: false, error: "Invalid request body." },
        400
      );
    }

    const displayName = normaliseString(body.displayName);
    const address = normaliseString(body.address);
    const phone = normaliseString(body.phone);
    const email = normaliseString(body.email);

    if (displayName !== undefined && displayName.length > MAX_DISPLAY_NAME) {
      return jsonResponse(
        {
          success: false,
          error: `Display name must be ${MAX_DISPLAY_NAME} characters or fewer.`,
        },
        400
      );
    }
    if (address !== undefined && address.length > MAX_ADDRESS) {
      return jsonResponse(
        {
          success: false,
          error: `Address must be ${MAX_ADDRESS} characters or fewer.`,
        },
        400
      );
    }
    if (phone !== undefined && phone.length > MAX_PHONE) {
      return jsonResponse(
        {
          success: false,
          error: `Phone must be ${MAX_PHONE} characters or fewer.`,
        },
        400
      );
    }
    if (email !== undefined) {
      if (email.length > MAX_EMAIL) {
        return jsonResponse(
          {
            success: false,
            error: `Email must be ${MAX_EMAIL} characters or fewer.`,
          },
          400
        );
      }
      // Empty-string clears the field, so only run format check on non-empty.
      if (email && !EMAIL_PATTERN.test(email)) {
        return jsonResponse(
          { success: false, error: "Email format looks invalid." },
          400
        );
      }
    }

    // Build a dynamic UPDATE that only touches fields the caller sent.
    const updates = [];
    const binds = [];
    const valueOrNull = (v) => (v === "" ? null : v);

    if (displayName !== undefined) {
      updates.push("brand_display_name = ?");
      binds.push(valueOrNull(displayName));
    }
    if (address !== undefined) {
      updates.push("brand_address = ?");
      binds.push(valueOrNull(address));
    }
    if (phone !== undefined) {
      updates.push("brand_phone = ?");
      binds.push(valueOrNull(phone));
    }
    if (email !== undefined) {
      updates.push("brand_email = ?");
      binds.push(valueOrNull(email));
    }

    if (updates.length > 0) {
      binds.push(firmId);
      await env.DB.prepare(
        `UPDATE panel_firms SET ${updates.join(", ")} WHERE id = ?`
      )
        .bind(...binds)
        .run();
    }

    const after = await env.DB.prepare(
      `SELECT brand_display_name, brand_address,
              brand_phone, brand_email, brand_logo_key
         FROM panel_firms
        WHERE id = ?
        LIMIT 1`
    )
      .bind(firmId)
      .first();

    return jsonResponse({
      success: true,
      branding: {
        displayName: after?.brand_display_name || "",
        address: after?.brand_address || "",
        phone: after?.brand_phone || "",
        email: after?.brand_email || "",
        logoKey: after?.brand_logo_key || "",
      },
    });
  } catch (error) {
    console.error("firm-update-branding error:", error);
    return jsonResponse(
      { success: false, error: "Could not save branding." },
      500
    );
  }
}
