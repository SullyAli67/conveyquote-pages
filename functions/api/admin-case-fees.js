// functions/api/admin-case-fees.js
//
// The two fees on a case, for the admin case view:
//
//   firm fee     — what the panel firm pays ConveyQuote. Stored on
//                  enquiries.referral_fee_payable / referral_fee_amount.
//                  Billed on the firm invoice. Set at allocation.
//   referrer fee — what ConveyQuote pays the referrer out of it. Stored in
//                  referrer_case_fees (migration 0021). Shown only in the
//                  referrer portal. Set from the referrer's rate when the
//                  referral is submitted; adjustable at allocation.
//
// Referred cases also carry the fixed £50 ConveyQuote marketing fee on the
// firm invoice. "ConveyQuote keeps" = firm fee + marketing fee − referrer fee.
//
//   GET  ?ref=CQ-…   → both fees, the referrer's rates, the rate for this
//                      matter type, what ConveyQuote keeps, and any payment.
//   POST { reference, action: "save_fees", firm_fee, referrer_fee }
//        { reference, action: "mark_paid", amount, paid_at, note, notify }
//        { reference, action: "undo" }
//
// Paying the referrer requires the case to be completed. Sample (SAMPLE-)
// cases are managed by script and are refused for every change.

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";
import { referrerFeeFor, firmDefaultFeeFor } from "../lib/referrer-fee.js";
import { isSampleReference } from "../lib/sample-cases.js";

const ADMIN_EMAIL = "info@conveyquote.uk";
const NOTE_MAX_LENGTH = 200;
const MARKETING_FEE = 50;

const escapeHtml = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function loadCase(db, reference) {
  return db.prepare(
    `SELECT e.id, e.reference, e.referrer_id, e.transaction_type, e.case_status, e.property_address,
            e.assigned_firm_id, e.assigned_firm_name,
            e.referral_fee_payable, e.referral_fee_amount,
            c.amount AS referrer_case_fee,
            f.default_referral_fee, f.remortgage_referral_fee AS firm_remortgage_fee,
            r.referrer_name, r.referral_fee, r.remortgage_referral_fee, r.contact_email, r.portal_email,
            p.amount AS paid_amount, p.paid_at, p.payment_note
       FROM enquiries e
       LEFT JOIN referrers r ON r.id = e.referrer_id
       LEFT JOIN referrer_case_fees c ON c.enquiry_id = e.id
       LEFT JOIN panel_firms f ON f.id = e.assigned_firm_id
       LEFT JOIN referrer_fee_payments p ON p.enquiry_id = e.id
      WHERE e.reference = ?
      LIMIT 1`
  ).bind(reference).first();
}

function describe(row) {
  const referred = Boolean(row.referrer_id);
  const firmFee = Number(row.referral_fee_payable) === 1 && Number(row.referral_fee_amount) > 0
    ? Number(row.referral_fee_amount)
    : null;
  const referrerFee = referred && row.referrer_case_fee !== null && row.referrer_case_fee !== undefined
    ? Number(row.referrer_case_fee)
    : null;
  const marketingFee = referred ? MARKETING_FEE : 0;
  return {
    reference: row.reference,
    referred,
    referrer_name: row.referrer_name || "",
    transaction_type: row.transaction_type || "",
    case_status: row.case_status || "",
    allocated: Boolean(row.assigned_firm_id),
    firm_name: row.assigned_firm_name || "",
    firm_default_fee: firmDefaultFeeFor(
      { default_referral_fee: row.default_referral_fee, remortgage_referral_fee: row.firm_remortgage_fee },
      row.transaction_type
    ),
    firm_fee: firmFee,
    referrer_fee: referrerFee,
    marketing_fee: marketingFee,
    conveyquote_keeps: firmFee === null ? null : firmFee + marketingFee - (referrerFee || 0),
    rates: {
      main: Number(row.referral_fee) || 0,
      remortgage: Number(row.remortgage_referral_fee) || 0,
    },
    rate_for_this_matter: referred ? referrerFeeFor(row, row.transaction_type) : 0,
    payment: row.paid_at
      ? { amount: Number(row.paid_amount) || 0, paid_at: row.paid_at, note: row.payment_note || "" }
      : null,
  };
}

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const session = await validateSession(env.DB, getTokenFromRequest(request), "admin");
    if (!session) return unauthorised();

    const reference = new URL(request.url).searchParams.get("ref") || "";
    if (!reference) return jsonResponse({ success: false, error: "ref is required." }, 400);

    const row = await loadCase(env.DB, reference);
    if (!row) return jsonResponse({ success: false, error: "Case not found." }, 404);

    return jsonResponse({ success: true, ...describe(row) });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const session = await validateSession(env.DB, getTokenFromRequest(request), "admin");
    if (!session) return unauthorised();

    const body = await request.json().catch(() => ({}));
    const reference = String(body.reference || "");
    const action = String(body.action || "");
    if (!reference) return jsonResponse({ success: false, error: "reference is required." }, 400);

    if (isSampleReference(reference)) {
      return jsonResponse(
        { success: false, error: "Sample cases are managed by the demo scripts, not here." },
        409
      );
    }

    const row = await loadCase(env.DB, reference);
    if (!row) return jsonResponse({ success: false, error: "Case not found." }, 404);
    const fresh = async () => describe(await loadCase(env.DB, reference));

    if (action === "save_fees") {
      if (!row.assigned_firm_id) {
        return jsonResponse({ success: false, error: "Set the fees on the allocation form when you allocate the case." }, 400);
      }
      const firmFee = Number(body.firm_fee);
      if (!Number.isFinite(firmFee) || firmFee <= 0) {
        return jsonResponse({ success: false, error: "Enter the firm fee." }, 400);
      }
      const referrerFee = Number(body.referrer_fee);
      if (row.referrer_id && (body.referrer_fee === "" || body.referrer_fee === undefined || body.referrer_fee === null || !Number.isFinite(referrerFee) || referrerFee < 0)) {
        return jsonResponse({ success: false, error: "Enter the referrer fee (0 if none is due)." }, 400);
      }
      await env.DB.prepare(
        `UPDATE enquiries SET referral_fee_payable = 1, referral_fee_amount = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(firmFee, row.id).run();
      if (row.referrer_id) {
        await env.DB.prepare(
          `INSERT INTO referrer_case_fees (enquiry_id, amount, updated_at) VALUES (?, ?, datetime('now'))
           ON CONFLICT (enquiry_id) DO UPDATE SET amount = excluded.amount, updated_at = excluded.updated_at`
        ).bind(row.id, referrerFee).run();
      }
      return jsonResponse({ success: true, ...(await fresh()) });
    }

    if (!row.referrer_id) {
      return jsonResponse({ success: false, error: "This case did not come from a referrer." }, 400);
    }

    if (action === "undo") {
      await env.DB.prepare(`DELETE FROM referrer_fee_payments WHERE enquiry_id = ?`).bind(row.id).run();
      return jsonResponse({ success: true, ...(await fresh()) });
    }

    if (action !== "mark_paid") {
      return jsonResponse({ success: false, error: "Unknown action." }, 400);
    }

    if (row.case_status !== "completed") {
      return jsonResponse(
        { success: false, error: "The fee can only be marked paid once the case is completed." },
        400
      );
    }

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return jsonResponse({ success: false, error: "Enter the amount paid." }, 400);
    }
    const paidAt = String(body.paid_at || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt) || Number.isNaN(Date.parse(paidAt))) {
      return jsonResponse({ success: false, error: "Enter the date paid." }, 400);
    }
    if (Date.parse(paidAt) > Date.now()) {
      return jsonResponse({ success: false, error: "The payment date can't be in the future." }, 400);
    }
    const note = String(body.note || "").trim().slice(0, NOTE_MAX_LENGTH);

    await env.DB.prepare(
      `INSERT INTO referrer_fee_payments (enquiry_id, amount, paid_at, payment_note)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (enquiry_id) DO UPDATE SET
         amount = excluded.amount,
         paid_at = excluded.paid_at,
         payment_note = excluded.payment_note`
    ).bind(row.id, amount, paidAt, note || null).run();

    // Optional confirmation email to the referrer. It names only the
    // referrer's own fee — never the firm fee.
    let emailed = false;
    let emailError;
    const to = String(row.contact_email || row.portal_email || "").trim();
    if (body.notify) {
      if (!to) {
        emailError = "The referrer has no email address on file.";
      } else if (!env.RESEND_API_KEY) {
        emailError = "Email is not configured.";
      } else {
        const paidOn = new Date(paidAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
        const money = `£${amount.toFixed(2)}`;
        const property = row.property_address || reference;
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.RESEND_API_KEY}` },
          body: JSON.stringify({
            from: "ConveyQuote <noreply@conveyquote.uk>",
            to: [to],
            cc: [ADMIN_EMAIL],
            reply_to: ADMIN_EMAIL,
            subject: `Referral fee paid — ${property}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222;">
                <div style="background:#0f2747;padding:20px 24px;border-radius:8px 8px 0 0;">
                  <h2 style="color:#fff;margin:0;font-size:18px;">Your referral fee has been paid</h2>
                </div>
                <div style="padding:20px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;font-size:14px;line-height:1.6;">
                  <p style="margin:0 0 12px;">Hi ${escapeHtml(row.referrer_name || "there")},</p>
                  <p style="margin:0 0 12px;">We have paid your referral fee of <strong>${escapeHtml(money)}</strong> for <strong>${escapeHtml(property)}</strong> (ref ${escapeHtml(reference)}) on ${escapeHtml(paidOn)}.</p>
                  ${note ? `<p style="margin:0 0 12px;">Note: ${escapeHtml(note)}</p>` : ""}
                  <p style="margin:0 0 12px;">You can see all your fees on the Payments tab of your <a href="https://conveyquote.uk/referrer-portal/" style="color:#0f2747;">referrer portal</a>.</p>
                  <p style="margin:0;font-size:13px;color:#6b7280;">Thank you for the referral. Questions? Reply to this email.</p>
                </div>
              </div>`,
          }),
        }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));
        if (resp.ok) {
          emailed = true;
        } else {
          emailError = `Email failed (HTTP ${resp.status}).`;
          console.error(`admin-case-fees: confirmation email failed for ${reference}: ${await resp.text().catch(() => "")}`);
        }
      }
    }

    return jsonResponse({ success: true, emailed, email_error: emailError, ...(await fresh()) });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
