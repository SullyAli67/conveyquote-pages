// functions/api/referrer-email-preview.js
//
// GET — the real client quote email (functions/lib/client-quote-email.js,
// the same code send-approved-quote.js sends with), filled with sample
// figures and the referrer's logo, for the portal's "Your branding" tab.
// Nothing is sent.
//
// Who can call it: the referrer, admin's read-only portal preview, or
// admin with ?referrer_id=.
//
// The figures come from the referrer's most recent priced referral, or a
// sample £285,000 purchase if they have none. The reference always starts
// SAMPLE-, so the email's Accept / decline links can't act on a real case.

import { getTokenFromRequest, validateSession, jsonResponse, unauthorised } from "../lib/auth.js";
import { buildClientQuoteEmail } from "../lib/client-quote-email.js";
import { buildQuoteData } from "../lib/calculate-quote.js";
import { getReferrerLogo } from "../lib/referrer-branding.js";
import { PREVIEW_SESSION_TYPE } from "../lib/referrer-portal-data.js";

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const url = new URL(request.url);

    let referrerId = null;
    const own =
      (await validateSession(env.DB, token, "referrer")) ||
      (await validateSession(env.DB, token, PREVIEW_SESSION_TYPE));
    if (own) {
      referrerId = Number(own.user_id);
    } else if (await validateSession(env.DB, token, "admin")) {
      referrerId = Number(url.searchParams.get("referrer_id"));
    } else {
      return unauthorised();
    }
    if (!Number.isFinite(referrerId) || referrerId <= 0) {
      return jsonResponse({ success: false, error: "Referrer id is required." }, 400);
    }

    const referrer = await env.DB.prepare(
      `SELECT id, referrer_name FROM referrers WHERE id = ? LIMIT 1`
    ).bind(referrerId).first();
    if (!referrer) return jsonResponse({ success: false, error: "Referrer not found." }, 404);

    // Their latest priced referral, if any.
    const latest = await env.DB.prepare(
      `SELECT client_name, transaction_type, tenure, price, quote_json
         FROM enquiries
        WHERE referrer_id = ? AND quote_json IS NOT NULL
        ORDER BY id DESC
        LIMIT 1`
    ).bind(referrerId).first();

    let quote = null;
    try { quote = latest?.quote_json ? JSON.parse(latest.quote_json) : null; } catch { quote = null; }
    const usable = quote && Array.isArray(quote.legalFees) && Number(quote.grandTotal) > 0;
    const type = usable ? String(latest.transaction_type || "purchase") : "purchase";
    const price = usable ? String(latest.price || "") : "285000";
    if (!usable) {
      quote = buildQuoteData({
        type: "purchase", price: "285000", tenure: "freehold", mortgage: "mortgage",
        firstTimeBuyer: "no", additionalProperty: "no", ukResidentForSdlt: "yes",
      });
    }
    const clientName = usable && latest.client_name ? String(latest.client_name) : "Sample Buyer";
    const total = typeof quote.totalIncludingSdlt === "number" ? quote.totalIncludingSdlt : quote.grandTotal;

    const logo = await getReferrerLogo(env.DB, referrerId);
    const { clientHtml, emailSubject } = buildClientQuoteEmail(
      {
        name: clientName,
        email: "client@example.com",
        type,
        tenure: usable ? latest.tenure || "freehold" : "freehold",
        price,
        quoteAmount: String(Number(total || 0).toFixed(2)),
        quoteReference: "SAMPLE-CQ-PREVIEW",
        feeBreakdown: "",
        nextSteps: "",
        additionalNotes: "",
        quoteData: quote,
      },
      {
        unsubUrl: "#",
        // A path, not a full address, so the preview also works on test copies of the site.
        brand: logo ? { name: String(referrer.referrer_name || ""), logoUrl: logo.path } : null,
      }
    );

    return jsonResponse({ success: true, html: clientHtml, subject: emailSubject, has_logo: Boolean(logo) });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
