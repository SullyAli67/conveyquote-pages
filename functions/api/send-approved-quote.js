import { getReferrerLogo, SITE_URL } from "../lib/referrer-branding.js";
import { buildUnsubUrl } from "../lib/unsub.js";
import { getTokenFromRequest, validateSession, unauthorised } from "../lib/auth.js";
import { isSampleReference } from "../lib/sample-cases.js";
import { buildClientQuoteEmail } from "../lib/client-quote-email.js";
import { quoteLinkToken } from "../lib/quote-link.js";

export async function onRequestPost(context) {
  const jsonResponse = (payload, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  try {
    const { request, env } = context;

    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "admin");
    if (!session) return unauthorised();

    const body = await request.json();

    const {
      name,
      email,
      type,
      tenure,
      price,
      quoteAmount,
      quoteReference,
      feeBreakdown,
      nextSteps,
      additionalNotes,
      quoteData,
    } = body;

    if (!email) {
      return jsonResponse(
        { success: false, error: "Client email is missing." },
        400
      );
    }

    if (!quoteReference) {
      return jsonResponse(
        { success: false, error: "Quote reference is missing." },
        400
      );
    }

    if (isSampleReference(quoteReference)) {
      return jsonResponse(
        { success: false, error: "This is a sample case. Sample quotes are never emailed." },
        409
      );
    }

    const safe = (value) =>
      value === null || value === undefined ? "" : String(value);

    // Referrer branding (migration 0023): looked up from the enquiry, never
    // the request body; skipped if the reference matches more than one
    // enquiry.
    const { results: brandMatches = [] } = await env.DB.prepare(
      `SELECT e.referrer_id, r.referrer_name
         FROM enquiries e
         LEFT JOIN referrers r ON r.id = e.referrer_id
        WHERE e.reference = ?
        LIMIT 2`
    ).bind(quoteReference).all();
    const brandRow = brandMatches.length === 1 ? brandMatches[0] : null;
    const referrerLogo = brandRow?.referrer_id ? await getReferrerLogo(env.DB, brandRow.referrer_id) : null;
    const brand = referrerLogo
      ? { name: safe(brandRow.referrer_name), logoUrl: `${SITE_URL}${referrerLogo.path}` }
      : null;

    const unsubUrl = await buildUnsubUrl(quoteReference, env);
    const { clientHtml, emailSubject, approvedQuoteRecord, finalQuoteAmountValue } =
      buildClientQuoteEmail(body, { unsubUrl, brand, linkToken: await quoteLinkToken(quoteReference, env) });

    // ── Step 1: Send the email FIRST ───────────────────────────────────────
    // Risk 1 — send-failure ordering. Previously we wrote
    // status='quote_sent' + approved_quote_json to D1 BEFORE the Resend
    // call, then returned 500 on failure with no rollback, leaving rows
    // permanently stamped "quote_sent" for emails the customer never
    // actually received. We now send first; the D1 write only happens
    // when Resend confirms acceptance.
    //
    // Referred enquiries copy in the referrer, looked up server-side from
    // the enquiry so the address can't be supplied by the request body.
    //
    // References are CQ-<date>-<4 random digits> with no uniqueness check,
    // so two enquiries can share one. Copy the referrer in only when exactly
    // one enquiry matches; otherwise we can't be sure whose referrer it is,
    // so the quote goes out with info@ only. LIMIT 2 is enough to tell.
    const ccAddresses = ["info@conveyquote.uk"];
    const { results: matches = [] } = await env.DB.prepare(
      `SELECT r.contact_email, r.portal_email
         FROM enquiries e
         LEFT JOIN referrers r ON r.id = e.referrer_id
        WHERE e.reference = ?
        LIMIT 2`
    ).bind(quoteReference).all();
    if (matches.length > 1) {
      console.warn(
        `send-approved-quote: reference ${quoteReference} matches more than one enquiry; referrer not copied in`
      );
    }
    const referrerRow = matches.length === 1 ? matches[0] : null;
    const referrerEmail = safe(referrerRow?.contact_email || referrerRow?.portal_email).trim();
    if (referrerEmail && referrerEmail.toLowerCase() !== safe(email).trim().toLowerCase()) {
      ccAddresses.push(referrerEmail);
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ConveyQuote <quotes@conveyquote.uk>",
        to: [email],
        cc: ccAddresses,
        reply_to: "info@conveyquote.uk",
        subject: emailSubject,
        html: clientHtml,
        // RFC 8058 one-click unsubscribe — Gmail / Yahoo / Outlook surface
        // a native button. Same URL as the in-body link.
        headers: {
          "List-Unsubscribe": `<${unsubUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });

    const data = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      // Send failed — record the error on the enquiry row so admin sees
      // an actionable "Last send failed" hint, but do NOT advance status
      // to 'quote_sent' and do NOT persist approved_quote_json. The
      // admin's form state still holds the values they typed, so a
      // retry sends the same quote.
      const detail =
        (data && (data.message || data.error)) ||
        `HTTP ${resendResponse.status}`;
      const short = String(detail).slice(0, 240);
      try {
        await env.DB.prepare(
          `UPDATE enquiries
              SET notification_email_last_error = ?
            WHERE reference = ?`
        )
          .bind(short, quoteReference)
          .run();
      } catch (writeErr) {
        console.error(
          "send-approved-quote: failed to record email error on enquiry:",
          writeErr
        );
      }
      return jsonResponse({ success: false, data, detail: short }, 500);
    }

    // ── Step 2: Persist the approved quote and advance status ────────────
    const messageId = data?.id || null;
    const sentAt = new Date().toISOString();

    await env.DB.prepare(
      `UPDATE enquiries
       SET approved_quote_json = ?,
           approved_quote_amount = ?,
           status = 'quote_sent',
           notification_email_sent_at = ?,
           notification_email_message_id = ?,
           notification_email_last_error = NULL
       WHERE reference = ?`
    )
      .bind(
        JSON.stringify(approvedQuoteRecord),
        finalQuoteAmountValue,
        sentAt,
        messageId,
        quoteReference
      )
      .run();

    // Start (or reset) the 14-day follow-up clock now that the email is out.
    // Lives in followup_state because enquiries is at D1's column ceiling.
    // ON CONFLICT preserves followups_disabled — so if the customer
    // unsubscribed earlier (creating a stub row), a quote re-send doesn't
    // silently reactivate reminders. Wrapped so a DB failure here doesn't
    // undo a successful customer send.
    try {
      await env.DB.prepare(
        `INSERT INTO followup_state
           (enquiry_reference, quote_sent_at, followup_stage,
            last_followup_at, followups_disabled)
         VALUES (?, datetime('now'), 0, NULL, 0)
         ON CONFLICT(enquiry_reference) DO UPDATE SET
           quote_sent_at = excluded.quote_sent_at,
           followup_stage = excluded.followup_stage,
           last_followup_at = excluded.last_followup_at`
      )
        .bind(quoteReference)
        .run();
    } catch (followupErr) {
      console.error("followup_state insert failed", followupErr);
    }

    return jsonResponse({ success: true, data });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}
