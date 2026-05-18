// functions/api/assign-panel-firm.js
import {
  getTokenFromRequest,
  validateSession,
  unauthorised,
} from "../lib/auth.js";

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const toFlag = (value) => (value ? 1 : 0);

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const getTransactionLabel = (type) => {
  if (type === "purchase") return "Purchase";
  if (type === "sale") return "Sale";
  if (type === "sale_purchase") return "Sale and Purchase";
  if (type === "remortgage") return "Remortgage";
  if (type === "transfer") return "Transfer of Equity";
  if (type === "remortgage_transfer") return "Remortgage and Transfer of Equity";
  return "Conveyancing Matter";
};

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "admin");
    if (!session) return unauthorised();

    const body = await request.json();
    const { reference, firm_id, firm_name, referral_fee_payable, referral_fee_amount, admin_notes } = body;

    if (!reference || !firm_id || !firm_name) {
      return jsonResponse({ success: false, error: "Reference, firm id and firm name are required." }, 400);
    }

    // Pattern B: a referrer can re-quote on an unallocated matter,
    // creating a successor row pointing to this one via
    // referrer_workflow.parent_enquiry_id. The original is then
    // "superseded" and must not be allocated — admin should allocate
    // the latest active row.
    const supersededRow = await env.DB.prepare(
      `SELECT successor.reference AS successor_reference
         FROM enquiries e
         JOIN referrer_workflow w ON w.parent_enquiry_id = e.id
         JOIN enquiries successor ON successor.id = w.enquiry_id
        WHERE e.reference = ?
        LIMIT 1`
    ).bind(reference).first();
    if (supersededRow && supersededRow.successor_reference) {
      return jsonResponse(
        {
          success: false,
          error: `This referral was re-quoted and is superseded by ${supersededRow.successor_reference}. Allocate the newer row instead.`,
        },
        409
      );
    }

    const allocatedAt = new Date().toISOString();
    await env.DB.prepare(
      `UPDATE enquiries
       SET assigned_firm_id=?, assigned_firm_name=?, referral_fee_payable=?,
           referral_fee_amount=?, panel_status='panel_referred',
           referred_at=CURRENT_TIMESTAMP, admin_notes=COALESCE(?,admin_notes),
           updated_at=datetime('now')
       WHERE reference=?`
    ).bind(firm_id, firm_name, toFlag(referral_fee_payable), Number(referral_fee_amount||0), admin_notes||null, reference).run();

    // Stamp allocated_at into referrer_workflow when the enquiry has a
    // referrer — this is the Pattern B "approve allocation" step.
    // Non-referrer enquiries get no workflow row (allocated_at stays
    // effectively NULL via LEFT JOIN).
    const enquiryForWorkflow = await env.DB.prepare(
      `SELECT id, referrer_id FROM enquiries WHERE reference = ? LIMIT 1`
    ).bind(reference).first();
    if (enquiryForWorkflow?.referrer_id) {
      await env.DB.prepare(
        `INSERT INTO referrer_workflow (enquiry_id, allocated_at)
         VALUES (?, ?)
         ON CONFLICT (enquiry_id) DO UPDATE SET allocated_at = ?`
      ).bind(enquiryForWorkflow.id, allocatedAt, allocatedAt).run();
    }

    // Audit log
    try {
      await env.DB.prepare(
        `INSERT INTO audit_log (action, reference, firm_id, firm_name, actor, details)
         VALUES ('firm_assigned', ?, ?, ?, 'admin', ?)`
      ).bind(
        reference,
        Number(firm_id),
        firm_name,
        `Referral fee: £${Number(referral_fee_amount||0).toFixed(2)}, payable: ${referral_fee_payable ? 'yes' : 'no'}`
      ).run();
    } catch (e) { console.error("Audit log error:", e); }

    const [firmRow, enquiryRow] = await Promise.all([
      env.DB.prepare(`SELECT firm_name,contact_name,contact_email,portal_email,portal_active FROM panel_firms WHERE id=? LIMIT 1`).bind(firm_id).first(),
      env.DB.prepare(`SELECT client_name,client_email,property_address,transaction_type,price,tenure,postcode,referrer_id FROM enquiries WHERE reference=? LIMIT 1`).bind(reference).first(),
    ]);

    // Risk 1 — both notification emails (referrer + firm) used to be
    // fire-and-forget with bare .catch(console.error) and no
    // response.ok check, so a 4xx/5xx from Resend was swallowed in the
    // tail log with no record on the row. We now check response.ok on
    // each, collect a structured outcome per email, and record:
    //   - latest sent_at + that send's message_id (firm preferred, the
    //     primary notification) on success
    //   - a concatenated last_error string identifying which email
    //     failed on failure
    // The DB allocation has already been committed above — it is the
    // admin's action and stays committed regardless of email outcome.
    // The admin sees the partial failure in the response body so they
    // can retry the specific email out of band.

    const sendNotification = async ({ label, payload }) => {
      try {
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
          },
          body: JSON.stringify(payload),
        });
        if (resp.ok) {
          const okJson = await resp.json().catch(() => ({}));
          return { ok: true, label, messageId: okJson?.id || null };
        }
        const errBody = await resp.text().catch(() => "");
        const detail = `HTTP ${resp.status} ${errBody}`.slice(0, 240);
        console.error(
          `assign-panel-firm: ${label} email failed for ref=${reference}: ${detail}`
        );
        return { ok: false, label, error: detail };
      } catch (err) {
        const detail = String(err instanceof Error ? err.message : err).slice(0, 240);
        console.error(
          `assign-panel-firm: ${label} email threw for ref=${reference}:`,
          err
        );
        return { ok: false, label, error: detail };
      }
    };

    const emailResults = [];

    if (enquiryRow?.referrer_id && env.RESEND_API_KEY) {
      const referrerRow = await env.DB.prepare(
        `SELECT referrer_name, contact_email, portal_email FROM referrers WHERE id = ? LIMIT 1`
      ).bind(enquiryRow.referrer_id).first();
      const referrerEmail = referrerRow?.contact_email || referrerRow?.portal_email;
      if (referrerEmail) {
        const txLabel = getTransactionLabel(enquiryRow?.transaction_type);
        emailResults.push(await sendNotification({
          label: "referrer",
          payload: {
            from: "ConveyQuote <quotes@conveyquote.uk>",
            to: [referrerEmail],
            subject: `Allocated to ${firm_name} — ${reference}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
              <div style="background:#0f2747;padding:20px 24px;border-radius:8px 8px 0 0;">
                <h2 style="color:#fff;margin:0;font-size:18px;">Allocation approved</h2>
              </div>
              <div style="padding:20px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                <p style="margin:0 0 12px;font-size:14px;">Hi ${escapeHtml(referrerRow?.referrer_name || "")},</p>
                <p style="margin:0 0 12px;font-size:14px;">Your referral for <strong>${escapeHtml(enquiryRow?.client_name || enquiryRow?.client_email || "")}</strong> has been allocated to <strong>${escapeHtml(firm_name)}</strong>.</p>
                <table style="border-collapse:collapse;width:100%;">
                  <tr><td style="padding:7px 0;color:#6b7280;width:40%;">Reference</td><td style="padding:7px 0;font-weight:600;">${escapeHtml(reference)}</td></tr>
                  <tr><td style="padding:7px 0;color:#6b7280;">Property</td><td style="padding:7px 0;">${escapeHtml(enquiryRow?.property_address || "—")}</td></tr>
                  <tr><td style="padding:7px 0;color:#6b7280;">Transaction</td><td style="padding:7px 0;">${escapeHtml(txLabel)}</td></tr>
                </table>
              </div>
            </div>`,
          },
        }));
      }
    }

    const firmEmail = firmRow?.portal_email || firmRow?.contact_email;
    if (firmEmail && env.RESEND_API_KEY) {
      const portalUrl = "https://conveyquote.uk/firm-portal";
      const hasPortal = !!firmRow?.portal_active;
      const transactionLabel = getTransactionLabel(enquiryRow?.transaction_type);
      const price = enquiryRow?.price ? `£${Number(enquiryRow.price).toLocaleString("en-GB")}` : "Not provided";

      emailResults.push(await sendNotification({
        label: "firm",
        payload: {
          from: "ConveyQuote <quotes@conveyquote.uk>",
          to: [firmEmail],
          subject: `New Referral – ${transactionLabel} – ${reference}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#0f2747;padding:24px;"><h1 style="color:#fff;margin:0;font-size:20px;">New Referral from ConveyQuote</h1></div>
            <div style="padding:24px;">
              <p>Dear ${escapeHtml(firmRow?.contact_name || firm_name)},</p>
              <p>A new matter has been referred to <strong>${escapeHtml(firm_name)}</strong>.</p>
              <table style="border-collapse:collapse;width:100%;margin:16px 0;">
                <tr><td style="padding:8px 12px;border:1px solid #ddd;background:#f7f7f7;font-weight:bold;">Reference</td><td style="padding:8px 12px;border:1px solid #ddd;">${escapeHtml(reference)}</td></tr>
                <tr><td style="padding:8px 12px;border:1px solid #ddd;background:#f7f7f7;font-weight:bold;">Type</td><td style="padding:8px 12px;border:1px solid #ddd;">${escapeHtml(transactionLabel)}</td></tr>
                <tr><td style="padding:8px 12px;border:1px solid #ddd;background:#f7f7f7;font-weight:bold;">Value</td><td style="padding:8px 12px;border:1px solid #ddd;">${escapeHtml(price)}</td></tr>
                <tr><td style="padding:8px 12px;border:1px solid #ddd;background:#f7f7f7;font-weight:bold;">Postcode</td><td style="padding:8px 12px;border:1px solid #ddd;">${escapeHtml(enquiryRow?.postcode||"Not provided")}</td></tr>
                ${referral_fee_payable ? `<tr><td style="padding:8px 12px;border:1px solid #ddd;background:#f7f7f7;font-weight:bold;">Referral fee</td><td style="padding:8px 12px;border:1px solid #ddd;">£${Number(referral_fee_amount||0).toFixed(2)}</td></tr>` : ""}
              </table>
              ${admin_notes ? `<p style="background:#fffbeb;border:1px solid #f59e0b;padding:12px;border-radius:4px;"><strong>Note:</strong> ${escapeHtml(admin_notes)}</p>` : ""}
              ${hasPortal
                ? `<div style="text-align:center;margin:24px 0;"><a href="${portalUrl}" style="background:#0f2747;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Log in to Firm Portal →</a></div>`
                : `<p>Please contact <a href="mailto:info@conveyquote.uk">info@conveyquote.uk</a> to respond to this referral.</p>`}
            </div></div>`,
        },
      }));
    }

    // Roll results up onto the enquiry. Firm message id wins over
    // referrer's for client_email_message_id since the firm email is
    // the primary notification on this endpoint.
    const failures = emailResults.filter((r) => !r.ok);
    const successes = emailResults.filter((r) => r.ok);
    const firmSuccess = successes.find((r) => r.label === "firm");
    const anySuccess = successes[0];
    const successMessageId = firmSuccess?.messageId || anySuccess?.messageId || null;
    const lastErrorString = failures.length
      ? failures.map((r) => `${r.label}: ${r.error}`).join("; ").slice(0, 240)
      : null;

    if (emailResults.length > 0) {
      try {
        await env.DB.prepare(
          `UPDATE enquiries
              SET client_email_sent_at    = COALESCE(?, client_email_sent_at),
                  client_email_message_id = COALESCE(?, client_email_message_id),
                  client_email_last_error = ?
            WHERE reference = ?`
        )
          .bind(
            successes.length > 0 ? new Date().toISOString() : null,
            successMessageId,
            lastErrorString,
            reference
          )
          .run();
      } catch (writeErr) {
        console.error(
          `assign-panel-firm: failed to record email outcome on enquiry ref=${reference}:`,
          writeErr
        );
      }
    }

    return jsonResponse({
      success: true,
      reference,
      emails: emailResults.map((r) => ({
        label: r.label,
        ok: r.ok,
        error: r.error || null,
      })),
      email_error: lastErrorString,
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
}
