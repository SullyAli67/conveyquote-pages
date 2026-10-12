// functions/api/referrer-upload-logo.js
//
// POST multipart/form-data — upload or remove a referrer's logo
// (migration 0023). Shown on the quote email their referred clients
// receive, with "Powered by ConveyQuote".
//
// Who can call it:
//   * the referrer, logged in (their own logo), or
//   * admin, with a referrer_id field.
// The read-only admin preview session cannot.
//
// Fields: file (PNG or JPEG, up to 500KB and 800×800 pixels), or
// remove=1 to take the logo off.

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";
import { readImageDimensions } from "../lib/image-dimensions.js";
import { LOGO_PREFIX, logoPathFor } from "../lib/referrer-branding.js";

const MAX_BYTES = 500 * 1024;
const MAX_PIXELS = 800;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg"]);

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    if (!env.FIRM_LOGOS_BUCKET) {
      console.error("referrer-upload-logo: FIRM_LOGOS_BUCKET binding missing.");
      return jsonResponse({ success: false, error: "Logo storage is not configured." }, 500);
    }

    const token = getTokenFromRequest(request);
    const referrerSession = await validateSession(env.DB, token, "referrer");
    const adminSession = referrerSession ? null : await validateSession(env.DB, token, "admin");
    if (!referrerSession && !adminSession) return unauthorised();

    let formData;
    try {
      formData = await request.formData();
    } catch {
      return jsonResponse({ success: false, error: "Expected multipart/form-data." }, 400);
    }

    const referrerId = referrerSession ? Number(referrerSession.user_id) : Number(formData.get("referrer_id"));
    if (!Number.isFinite(referrerId) || referrerId <= 0) {
      return jsonResponse({ success: false, error: "Referrer id is required." }, 400);
    }
    const referrer = await env.DB.prepare(`SELECT id FROM referrers WHERE id = ? LIMIT 1`).bind(referrerId).first();
    if (!referrer) return jsonResponse({ success: false, error: "Referrer not found." }, 404);

    const existing = await env.DB.prepare(
      `SELECT logo_key FROM referrer_branding WHERE referrer_id = ? LIMIT 1`
    ).bind(referrerId).first();
    const previousKey = existing?.logo_key || null;

    const deleteOld = async () => {
      if (!previousKey) return;
      try {
        await env.FIRM_LOGOS_BUCKET.delete(previousKey);
      } catch (err) {
        console.error(`referrer-upload-logo: failed to delete ${previousKey}:`, err);
      }
    };

    if (String(formData.get("remove") || "") === "1") {
      await env.DB.prepare(`DELETE FROM referrer_branding WHERE referrer_id = ?`).bind(referrerId).run();
      await deleteOld();
      return jsonResponse({ success: true, logo_url: null });
    }

    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return jsonResponse({ success: false, error: "No file uploaded." }, 400);
    }
    const mimeType = String(file.type || "").toLowerCase();
    if (!ALLOWED_TYPES.has(mimeType)) {
      return jsonResponse({ success: false, error: "Your logo must be a PNG or JPG image." }, 400);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length === 0) return jsonResponse({ success: false, error: "The file is empty." }, 400);
    if (bytes.length > MAX_BYTES) {
      return jsonResponse({ success: false, error: "Your logo must be 500KB or smaller." }, 400);
    }
    const dimensions = readImageDimensions(bytes, mimeType);
    if (!dimensions) {
      return jsonResponse({ success: false, error: "That file doesn't look like a PNG or JPG image." }, 400);
    }
    if (dimensions.width > MAX_PIXELS || dimensions.height > MAX_PIXELS) {
      return jsonResponse(
        { success: false, error: `Your logo must be ${MAX_PIXELS}×${MAX_PIXELS} pixels or smaller.` },
        400
      );
    }

    const key = `${LOGO_PREFIX}${referrerId}/${Date.now()}-logo.${mimeType === "image/png" ? "png" : "jpg"}`;
    try {
      await env.FIRM_LOGOS_BUCKET.put(key, bytes, { httpMetadata: { contentType: mimeType === "image/png" ? "image/png" : "image/jpeg" } });
    } catch (err) {
      console.error("referrer-upload-logo: R2 put failed:", err);
      return jsonResponse({ success: false, error: "Logo upload failed — please try again." }, 500);
    }

    await env.DB.prepare(
      `INSERT INTO referrer_branding (referrer_id, logo_key, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT (referrer_id) DO UPDATE SET logo_key = excluded.logo_key, updated_at = excluded.updated_at`
    ).bind(referrerId, key).run();
    if (previousKey !== key) await deleteOld();

    return jsonResponse({ success: true, logo_url: logoPathFor(referrerId, key) });
  } catch (error) {
    console.error("referrer-upload-logo error:", error);
    return jsonResponse({ success: false, error: "Logo upload failed — please try again." }, 500);
  }
}
