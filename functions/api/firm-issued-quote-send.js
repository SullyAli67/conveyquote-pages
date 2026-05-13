// functions/api/firm-issued-quote-send.js
//
// Phase 5 of Type 2 firm-quoting product — email-to-client.
//
// Sends a saved firm-issued quote (firm_issued_quotes row) to the
// client by email, with the branded PDF as an attachment. Replaces the
// firm-quote-send.js flow that lived on the retired My Quotes rail.
//
// Route: POST /api/firm-issued-quote-send
// Auth: firm session (Bearer token), is_saas_firm = 1 required, firm
// must own the quote.
//
// Request body:
//   { id: <firm_issued_quotes id>,
//     confirmResend?: boolean }     // bypasses the 10-min send-once guard
//
// Responses:
//   200 { success: true,  sentAt, messageId }
//   400 { success: false, error: 'invalid_id' | 'no_client_email' | ... }
//   403 { success: false, error: 'not_saas_firm' }
//   404 { success: false, error: 'not_found' }
//   409 { success: false, error: 'recent_send', sentAt }       // 10-min lockout
//   500 { success: false, error: 'send_failed', detail }
//
// Email shape (locked in by the product spec for this batch):
//   - Subject: "Your conveyancing quote from <firm display name>"
//   - From:    "<firm display name> <quotes@conveyquote.uk>"
//     (uses conveyquote.uk's verified Resend domain — we do NOT ask
//      firms to set up DKIM, so we never forge from a firm's own domain)
//   - Reply-To: firm branding email if set, else panel_firms.contact_email
//   - Logo: inline base64 data: URI (never a remote URL, so the firm's
//     mark renders even in clients that block remote images by default)
//   - PDF attachment: the exact same branded PDF the firm can download
//     from /api/firm-quote-pdf?id=<id>, generated in-process via the
//     shared firm-quote-pdf-core module.

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";
import {
  buildQuotePdf,
  buildFilename,
  loadFirmBranding,
} from "../lib/firm-quote-pdf-core.js";

const RESEND_FROM_ADDRESS = "quotes@conveyquote.uk";
const RESEND_FROM_FALLBACK_NAME = "ConveyQuote";
const RECENT_SEND_WINDOW_MS = 10 * 60 * 1000;

const TRANSACTION_DESCRIPTION = {
  purchase: "purchase",
  sale: "sale",
  remortgage: "remortgage",
  transfer: "transfer of equity",
  sale_purchase: "sale and purchase",
  remortgage_transfer: "remortgage and transfer of equity",
};

const escapeHtml = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatPriceForCopy = (n) => {
  const v = Math.round(Number(n) || 0);
  if (!v) return "";
  return `£${v.toLocaleString("en-GB")}`;
};

const firstNameFromClientName = (clientName) => {
  const trimmed = String(clientName || "").trim();
  if (!trimmed) return "";
  const idx = trimmed.indexOf(" ");
  return idx === -1 ? trimmed : trimmed.slice(0, idx);
};

// Strip CR/LF and stray angle-brackets from anything that goes into a
// mailbox display name — Resend rejects malformed From: headers.
const sanitiseDisplayName = (s) =>
  String(s || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/[<>]/g, "")
    .trim();

// Workers don't have Buffer; do base64 by hand from a Uint8Array. Chunk
// to keep btoa inputs under ~32k chars so it doesn't blow up on big PDFs.
const uint8ToBase64 = (bytes) => {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunk)
    );
  }
  return btoa(binary);
};

const isoIfRecent = (iso) => {
  if (!iso) return null;
  const normalised = String(iso).includes("T")
    ? String(iso)
    : String(iso).replace(" ", "T") + "Z";
  const t = Date.parse(normalised);
  if (Number.isNaN(t)) return null;
  if (Date.now() - t > RECENT_SEND_WINDOW_MS) return null;
  return new Date(t).toISOString();
};

const buildEmailHtml = ({
  firmDisplayName,
  clientName,
  transactionLabel,
  priceCopy,
  branding,
  logoDataUri,
}) => {
  const firstName = firstNameFromClientName(clientName);
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hello,";

  const logoBlock = logoDataUri
    ? `<div style="margin-bottom:18px;">
         <img src="${logoDataUri}" alt="${escapeHtml(firmDisplayName)}" style="max-width:200px;height:auto;display:block;" />
       </div>`
    : "";

  const sentenceTail = priceCopy
    ? ` at ${escapeHtml(priceCopy)}`
    : "";

  const contactLines = [];
  if (branding?.address) {
    branding.address
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((l) => contactLines.push(escapeHtml(l)));
  }
  if (branding?.phone) contactLines.push(`Tel: ${escapeHtml(branding.phone)}`);
  if (branding?.email) contactLines.push(`Email: ${escapeHtml(branding.email)}`);

  const contactBlock = contactLines.length
    ? `<div style="color:#6b7280;font-size:12px;line-height:1.5;margin-top:14px;">
         ${contactLines.join("<br />")}
       </div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;color:#1a1a1a;font-size:14px;line-height:1.55;">
  <div style="max-width:620px;margin:24px auto;background:#fff;border-radius:18px;padding:28px 32px;">
    ${logoBlock}
    <p style="margin:0 0 14px;">${greeting}</p>
    <p style="margin:0 0 14px;">Please find attached your conveyancing quote for <strong>${escapeHtml(transactionLabel)}</strong>${sentenceTail}. The attached PDF contains a full breakdown of fees and disbursements.</p>
    <p style="margin:0 0 14px;">If you'd like to proceed or have any questions, please reply to this email.</p>
    <p style="margin:18px 0 4px;">Kind regards,</p>
    <p style="margin:0;color:#062a63;font-weight:bold;">${escapeHtml(firmDisplayName)}</p>
    ${contactBlock}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:22px 0 12px;" />
    <p style="color:#9ca3af;font-size:11px;margin:0;text-align:center;">Powered by ConveyQuote — conveyquote.uk</p>
  </div>
</body>
</html>`;
};

export async function onRequestPost(context) {
  const { request, env } = context;
  let quoteId = null;

  try {
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "firm");
    if (!session) return unauthorised();

    const firmId = session.user_id;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse(
        { success: false, error: "invalid_body" },
        400
      );
    }

    const rawId = Number(body.id);
    if (
      !Number.isFinite(rawId) ||
      !Number.isInteger(rawId) ||
      rawId <= 0
    ) {
      return jsonResponse({ success: false, error: "invalid_id" }, 400);
    }
    quoteId = rawId;
    const confirmResend = body.confirmResend === true;

    // ── Auth + ownership ─────────────────────────────────────────────
    const firm = await env.DB.prepare(
      `SELECT id, is_saas_firm, firm_name, contact_email, portal_email
         FROM panel_firms
        WHERE id = ?
        LIMIT 1`
    )
      .bind(firmId)
      .first();

    if (!firm) {
      return jsonResponse({ success: false, error: "not_found" }, 404);
    }
    if (Number(firm.is_saas_firm) !== 1) {
      return jsonResponse(
        { success: false, error: "not_saas_firm" },
        403
      );
    }

    const row = await env.DB.prepare(
      `SELECT id, firm_id, client_name, client_email, transaction_type,
              quote_inputs, quote_output, issued_at,
              client_email_sent_at
         FROM firm_issued_quotes
        WHERE id = ?
        LIMIT 1`
    )
      .bind(quoteId)
      .first();

    // Surface cross-firm rows as 404 (same posture as firm-quote-pdf).
    if (!row || Number(row.firm_id) !== Number(firmId)) {
      return jsonResponse({ success: false, error: "not_found" }, 404);
    }

    const clientEmail = String(row.client_email || "").trim();
    if (!clientEmail) {
      return jsonResponse(
        { success: false, error: "no_client_email" },
        400
      );
    }

    // ── Send-once protection ─────────────────────────────────────────
    if (!confirmResend) {
      const recentSentAt = isoIfRecent(row.client_email_sent_at);
      if (recentSentAt) {
        return jsonResponse(
          { success: false, error: "recent_send", sentAt: recentSentAt },
          409
        );
      }
    }

    // ── Load branding + parse the row ────────────────────────────────
    const branding = await loadFirmBranding(env, firmId);
    const firmDisplayName = sanitiseDisplayName(
      branding.displayName || firm.firm_name || RESEND_FROM_FALLBACK_NAME
    );
    const replyTo =
      branding.email ||
      firm.contact_email ||
      firm.portal_email ||
      "";

    let inputs = null;
    let output = null;
    try {
      inputs = JSON.parse(row.quote_inputs);
    } catch {
      inputs = null;
    }
    try {
      output = JSON.parse(row.quote_output);
    } catch {
      output = null;
    }

    if (!output || typeof output !== "object") {
      console.error(
        `firm-issued-quote-send: quote ${quoteId} has unparseable quote_output`
      );
      return jsonResponse(
        { success: false, error: "send_failed", detail: "PDF data invalid." },
        500
      );
    }

    // ── Build PDF in-process via the shared core ─────────────────────
    const clientName = String(row.client_name || "");
    const issuedAt = String(row.issued_at || "");
    const transactionType = String(row.transaction_type || "");

    const pdfBytes = await buildQuotePdf({
      id: Number(row.id),
      clientName,
      clientEmail,
      issuedAt,
      transactionType,
      inputs,
      output,
      branding,
    });

    // ── Build email body ─────────────────────────────────────────────
    const transactionLabel =
      TRANSACTION_DESCRIPTION[transactionType] || "conveyancing matter";
    const priceCopy = formatPriceForCopy(inputs?.price);

    let logoDataUri = "";
    if (branding.logoBytes && branding.logoMimeType) {
      try {
        logoDataUri = `data:${branding.logoMimeType};base64,${uint8ToBase64(
          branding.logoBytes
        )}`;
      } catch (err) {
        // Graceful degradation — log and send without logo.
        console.error(
          `firm-issued-quote-send: logo base64 encode failed:`,
          err
        );
        logoDataUri = "";
      }
    }

    const html = buildEmailHtml({
      firmDisplayName,
      clientName,
      transactionLabel,
      priceCopy,
      branding,
      logoDataUri,
    });

    const subject = `Your conveyancing quote from ${firmDisplayName}`;
    const fromHeader = `${firmDisplayName} <${RESEND_FROM_ADDRESS}>`;

    const filename = buildFilename(Number(row.id), clientName, issuedAt);
    const pdfBase64 = uint8ToBase64(pdfBytes);

    // ── Send via Resend ──────────────────────────────────────────────
    const resendPayload = {
      from: fromHeader,
      to: [clientEmail],
      subject,
      html,
      attachments: [
        {
          filename,
          content: pdfBase64,
        },
      ],
    };
    if (replyTo) resendPayload.reply_to = replyTo;

    const sendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify(resendPayload),
    });

    if (!sendResponse.ok) {
      let detail = "";
      try {
        const errJson = await sendResponse.json();
        detail =
          (errJson && (errJson.message || errJson.error)) ||
          JSON.stringify(errJson);
      } catch {
        detail = `HTTP ${sendResponse.status}`;
      }
      const short = String(detail).slice(0, 240);
      await env.DB.prepare(
        `UPDATE firm_issued_quotes
            SET client_email_last_error = ?
          WHERE id = ? AND firm_id = ?`
      )
        .bind(short, quoteId, firmId)
        .run();
      return jsonResponse(
        { success: false, error: "send_failed", detail: short },
        500
      );
    }

    const okJson = await sendResponse.json().catch(() => ({}));
    const messageId = okJson?.id || null;
    const sentAt = new Date().toISOString();

    await env.DB.prepare(
      `UPDATE firm_issued_quotes
          SET client_email_sent_at = ?,
              client_email_message_id = ?,
              client_email_last_error = NULL
        WHERE id = ? AND firm_id = ?`
    )
      .bind(sentAt, messageId, quoteId, firmId)
      .run();

    return jsonResponse({
      success: true,
      sentAt,
      messageId,
    });
  } catch (error) {
    console.error(
      `firm-issued-quote-send error (quoteId=${quoteId}):`,
      error
    );
    // Record the error on the row if we have an id, but don't blow up
    // the response if that secondary write also fails.
    if (quoteId) {
      try {
        const short = String(
          error instanceof Error ? error.message : error
        ).slice(0, 240);
        await env.DB.prepare(
          `UPDATE firm_issued_quotes
              SET client_email_last_error = ?
            WHERE id = ?`
        )
          .bind(short, quoteId)
          .run();
      } catch (writeErr) {
        console.error(
          `firm-issued-quote-send: failed to record error on row:`,
          writeErr
        );
      }
    }
    return jsonResponse(
      {
        success: false,
        error: "send_failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}
