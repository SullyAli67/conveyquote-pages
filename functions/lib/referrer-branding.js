// functions/lib/referrer-branding.js
//
// Referrer logos (migration 0023). The image lives in the logo bucket
// (env.FIRM_LOGOS_BUCKET, shared with firm logos) under
// referrer-logos/<referrer id>/; referrer_branding records its key.
//
// The image is served publicly by /api/referrer-logo so email programs can
// show it in a client's quote email. The key (with its upload timestamp)
// goes in the URL, so a new upload gets a new URL and old copies cached by
// email programs are never shown in its place.

export const LOGO_PREFIX = "referrer-logos/";
export const SITE_URL = "https://conveyquote.uk";

export const logoPathFor = (referrerId, key) =>
  `/api/referrer-logo?r=${encodeURIComponent(referrerId)}&v=${encodeURIComponent(key)}`;

// { key, path } or null. Missing table (migration not applied) → null.
export async function getReferrerLogo(db, referrerId) {
  if (!referrerId) return null;
  try {
    const row = await db
      .prepare(`SELECT logo_key FROM referrer_branding WHERE referrer_id = ? LIMIT 1`)
      .bind(referrerId)
      .first();
    if (!row?.logo_key) return null;
    return { key: row.logo_key, path: logoPathFor(referrerId, row.logo_key) };
  } catch {
    return null;
  }
}
