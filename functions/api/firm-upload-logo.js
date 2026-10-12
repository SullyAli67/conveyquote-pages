// functions/api/firm-upload-logo.js
//
// Phase 4 of Type 2 firm-quoting product.
//
// Accepts a multipart/form-data POST with a single "file" field
// containing a PNG or JPEG firm logo, validates size and pixel
// dimensions, writes the bytes to R2 under
// firm-logos/<firm_id>/<timestamp>-<sanitised-name>, and updates
// panel_firms.brand_logo_key to the new key. The previous logo (if any)
// is deleted from R2 to avoid orphaned objects.
//
// Route: POST /api/firm-upload-logo
// Auth:  firm session (Bearer token), is_saas_firm = 1 required.
// R2:    env.FIRM_LOGOS_BUCKET binding (configured in Pages dashboard).

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";
import { readImageDimensions } from "../lib/image-dimensions.js";

const MAX_BYTES = 500 * 1024; // 500KB
const MAX_PIXELS = 800;       // 800x800 max in each dimension
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg"]);

const sanitiseFilename = (name) =>
  String(name || "")
    .replace(/[^a-zA-Z0-9.\-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "logo";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.FIRM_LOGOS_BUCKET) {
      console.error(
        "firm-upload-logo: FIRM_LOGOS_BUCKET binding missing — " +
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

    const firmId = session.user_id;

    const firm = await env.DB.prepare(
      `SELECT id, is_saas_firm, brand_logo_key
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

    let formData;
    try {
      formData = await request.formData();
    } catch {
      return jsonResponse(
        { success: false, error: "Expected multipart/form-data." },
        400
      );
    }

    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return jsonResponse(
        { success: false, error: "No file uploaded." },
        400
      );
    }

    const mimeType = String(file.type || "").toLowerCase();
    if (!ALLOWED_TYPES.has(mimeType)) {
      return jsonResponse(
        { success: false, error: "Logo must be a PNG or JPG image." },
        400
      );
    }

    if (typeof file.size === "number" && file.size > MAX_BYTES) {
      return jsonResponse(
        { success: false, error: "Logo must be 500KB or smaller." },
        400
      );
    }

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes.length > MAX_BYTES) {
      return jsonResponse(
        { success: false, error: "Logo must be 500KB or smaller." },
        400
      );
    }
    if (bytes.length === 0) {
      return jsonResponse(
        { success: false, error: "Uploaded file is empty." },
        400
      );
    }

    const dimensions = readImageDimensions(bytes, mimeType);
    if (dimensions) {
      if (dimensions.width > MAX_PIXELS || dimensions.height > MAX_PIXELS) {
        return jsonResponse(
          {
            success: false,
            error: `Logo must be ${MAX_PIXELS}x${MAX_PIXELS} pixels or smaller.`,
          },
          400
        );
      }
    }
    // If dimensions couldn't be parsed (corrupt header etc.) we still
    // accept the file — the size cap above prevents abuse, and the PDF
    // renderer tolerates whatever pdf-lib can decode.

    const storedExt = mimeType === "image/png" ? "png" : "jpg";
    const originalName = sanitiseFilename(file.name);
    const stamp = Date.now();
    const baseName = originalName.includes(".")
      ? originalName.slice(0, originalName.lastIndexOf("."))
      : originalName;
    const key = `firm-logos/${firmId}/${stamp}-${baseName || "logo"}.${storedExt}`;

    try {
      await env.FIRM_LOGOS_BUCKET.put(key, bytes, {
        httpMetadata: { contentType: mimeType },
      });
    } catch (err) {
      console.error("firm-upload-logo: R2 put failed:", err);
      return jsonResponse(
        { success: false, error: "Logo upload failed — please try again." },
        500
      );
    }

    const previousKey =
      typeof firm.brand_logo_key === "string" && firm.brand_logo_key
        ? firm.brand_logo_key
        : null;

    await env.DB.prepare(
      `UPDATE panel_firms SET brand_logo_key = ? WHERE id = ?`
    )
      .bind(key, firmId)
      .run();

    // Best-effort cleanup of the old object. Failure here doesn't roll
    // back the upload — orphaned R2 objects are cheap and recoverable
    // via a janitor job later if it ever matters.
    if (previousKey && previousKey !== key) {
      try {
        await env.FIRM_LOGOS_BUCKET.delete(previousKey);
      } catch (err) {
        console.error(
          `firm-upload-logo: failed to delete old key ${previousKey}:`,
          err
        );
      }
    }

    return jsonResponse({ success: true, key });
  } catch (error) {
    console.error("firm-upload-logo error:", error);
    return jsonResponse(
      { success: false, error: "Logo upload failed — please try again." },
      500
    );
  }
}
