// functions/api/referrer-logo.js
//
// GET /api/referrer-logo?r=<referrer id>&v=<key>
// Public (no login): email programs load it to show the referrer's logo in
// their client's quote email. Only the key currently recorded for that
// referrer in referrer_branding is served — nothing else in the bucket.

import { jsonResponse } from "../lib/auth.js";
import { getReferrerLogo } from "../lib/referrer-branding.js";

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    if (!env.FIRM_LOGOS_BUCKET) return jsonResponse({ success: false, error: "Logo storage is not configured." }, 500);

    const referrerId = Number(new URL(request.url).searchParams.get("r"));
    if (!Number.isFinite(referrerId) || referrerId <= 0) return new Response("Not found", { status: 404 });

    const logo = await getReferrerLogo(env.DB, referrerId);
    if (!logo) return new Response("Not found", { status: 404 });

    const obj = await env.FIRM_LOGOS_BUCKET.get(logo.key);
    if (!obj) return new Response("Not found", { status: 404 });

    return new Response(obj.body, {
      status: 200,
      headers: {
        "Content-Type": obj.httpMetadata?.contentType || (logo.key.endsWith(".png") ? "image/png" : "image/jpeg"),
        // The URL carries the key, which changes on every upload.
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("referrer-logo error:", error);
    return new Response("Error", { status: 500 });
  }
}
