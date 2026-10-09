// functions/api/manage-referrers.js
import {
  getTokenFromRequest,
  validateSession,
  hashPassword,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";
import { issueSetupLink } from "../lib/referrer-setup-link.js";

const toFlag = (v) => (v ? 1 : 0);

// GET — list all referrers
export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "admin");
    if (!session) return unauthorised();

    const result = await env.DB.prepare(
      `SELECT id, referrer_name, contact_email, contact_phone,
              referral_fee, remortgage_referral_fee, marketing_fee, fee_markup, portal_email, portal_active, notes, created_at
       FROM referrers ORDER BY referrer_name COLLATE NOCASE ASC`
    ).all();

    return jsonResponse({ success: true, referrers: result.results || [] });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

// POST — create or update referrer (and optionally set password)
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "admin");
    if (!session) return unauthorised();

    const body = await request.json();
    const {
      id, referrer_name, contact_email, contact_phone,
      referral_fee, remortgage_referral_fee, marketing_fee, fee_markup, portal_email, portal_active, notes, password,
    } = body;

    if (!referrer_name || !String(referrer_name).trim()) {
      return jsonResponse({ success: false, error: "Referrer name is required." }, 400);
    }

    let passwordHash = undefined;
    if (password) {
      if (password.length < 8) {
        return jsonResponse({ success: false, error: "Password must be at least 8 characters." }, 400);
      }
      passwordHash = await hashPassword(password);
    }

    if (id) {
      // Update
      const updateParts = [
        "referrer_name = ?", "contact_email = ?", "contact_phone = ?",
        "referral_fee = ?", "remortgage_referral_fee = ?", "marketing_fee = ?", "fee_markup = ?", "portal_email = ?", "portal_active = ?",
        "notes = ?", "updated_at = datetime('now')",
      ];
      const binds = [
        String(referrer_name).trim(),
        contact_email || null, contact_phone || null,
        Number(referral_fee) || 0,
        Number(remortgage_referral_fee) || 0,
        Number(marketing_fee) || 50,
        Number(fee_markup) || 0,
        portal_email ? String(portal_email).toLowerCase().trim() : null,
        toFlag(portal_active),
        notes || "",
      ];

      if (passwordHash) {
        updateParts.push("portal_password_hash = ?");
        binds.push(passwordHash);
      }

      binds.push(id);
      await env.DB.prepare(
        `UPDATE referrers SET ${updateParts.join(", ")} WHERE id = ?`
      ).bind(...binds).run();

      return jsonResponse({ success: true, id, mode: "updated" });
    } else {
      // Create
      const cols = ["referrer_name", "contact_email", "contact_phone", "referral_fee", "remortgage_referral_fee", "marketing_fee", "fee_markup", "portal_email", "portal_active", "notes"];
      const vals = [
        String(referrer_name).trim(),
        contact_email || null, contact_phone || null,
        Number(referral_fee) || 0,
        Number(remortgage_referral_fee) || 0,
        Number(marketing_fee) || 50,
        Number(fee_markup) || 0,
        portal_email ? String(portal_email).toLowerCase().trim() : null,
        toFlag(portal_active),
        notes || "",
      ];

      if (passwordHash) {
        cols.push("portal_password_hash");
        vals.push(passwordHash);
      }

      const placeholders = vals.map(() => "?").join(", ");
      const result = await env.DB.prepare(
        `INSERT INTO referrers (${cols.join(", ")}) VALUES (${placeholders})`
      ).bind(...vals).run();

      const newId = result.meta?.last_row_id;

      // Welcome email with a set-password link — only when portal access
      // is ticked and there is a login email. Created with access unticked,
      // nothing is sent; use "Send invite / reset link" later instead.
      let invite = null;
      const loginEmail = portal_email ? String(portal_email).toLowerCase().trim() : "";
      if (toFlag(portal_active) && loginEmail && newId) {
        invite = await issueSetupLink(
          env,
          { id: newId, referrer_name: String(referrer_name).trim(), portal_email: loginEmail },
          "welcome"
        );
      }

      return jsonResponse({
        success: true,
        id: newId,
        mode: "created",
        invite_sent: Boolean(invite?.sent),
        invite_error: invite && !invite.sent ? invite.error : undefined,
      });
    }
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
