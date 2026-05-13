// functions/api/firm-logo-fetch.js
//
// Phase 4 of Type 2 firm-quoting product.
//
// Streams a firm-branding logo from R2 to the caller. Used by:
//   - the firm Profile → Branding UI to preview the current logo
//   - (indirectly) firm-quote-pdf.js, which calls env.FIRM_LOGOS_BUCKET
//     directly rather than going via HTTP — this endpoint is the
//     UI-facing path only
//
// Route: GET /api/firm-logo-fetch?key=<key>
// Auth:  firm session (Bearer token).
//
// Tenant isolation: only keys prefixed with firm-logos/<requesting_firm_id>/
// are allowed. Any other key returns 403 so one firm can't probe another
// firm's bucket prefix.

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";

export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    if (!env.FIRM_LOGOS_BUCKET) {
      console.error(
        "firm-logo-fetch: FIRM_LOGOS_BUCKET binding missing — " +
          "configure in Cloudflare Pages dashboard."
      );
      return jsonResponse(
        { success: false, error: "Logo storage is not configured." },
        500
      );
    }

    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "firm");
    if (!session) return unauthorised();

    const firmId = Number(session.user_id);

    const url = new URL(request.url);
    const key = url.searchParams.get("key") || "";
    if (!key) {
      return jsonResponse(
        { success: false, error: "Missing key parameter." },
        400
      );
    }

    const allowedPrefix = `firm-logos/${firmId}/`;
    if (!key.startsWith(allowedPrefix)) {
      return jsonResponse(
        { success: false, error: "Forbidden." },
        403
      );
    }

    const obj = await env.FIRM_LOGOS_BUCKET.get(key);
    if (!obj) {
      return jsonResponse(
        { success: false, error: "Logo not found." },
        404
      );
    }

    const contentType =
      obj.httpMetadata?.contentType ||
      (key.endsWith(".png") ? "image/png" : "image/jpeg");

    return new Response(obj.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Logo can change at any time when the firm re-uploads; we use a
        // short cache and rely on the URL changing (timestamp in key) for
        // hard invalidation on update.
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("firm-logo-fetch error:", error);
    return jsonResponse(
      { success: false, error: "Could not fetch logo." },
      500
    );
  }
}
