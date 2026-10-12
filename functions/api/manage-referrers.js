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

// GET — list all referrers, with what the admin list needs to show their
// status: whether a password is set (yes/no only — never the hash), the
// expiry of any unused set-password link, the last login (logged to
// audit_log by referrer-login.js), demo flag, case counts, and which
// matter types have custom pricing.
export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "admin");
    if (!session) return unauthorised();

    const result = await env.DB.prepare(
      `SELECT r.id, r.referrer_name, r.contact_email, r.contact_phone,
              r.referral_fee, r.remortgage_referral_fee, r.marketing_fee, r.fee_markup,
              r.portal_email, r.portal_active, r.notes, r.created_at,
              CASE WHEN r.portal_password_hash IS NOT NULL AND r.portal_password_hash <> '' THEN 1 ELSE 0 END AS has_password,
              (SELECT MAX(s.expires_at) FROM sessions s
                WHERE s.user_type = 'referrer_setup' AND s.user_id = r.id
                  AND datetime(s.expires_at) > datetime('now')) AS invite_expires_at,
              (SELECT MAX(s.expires_at) FROM sessions s
                WHERE s.user_type = 'referrer_demo_link' AND s.user_id = r.id
                  AND datetime(s.expires_at) > datetime('now')) AS demo_link_expires_at,
              (SELECT MAX(a.created_at) FROM audit_log a
                WHERE a.action = 'referrer_login' AND a.actor = 'referrer:' || r.id) AS last_login_at,
              CASE WHEN EXISTS (SELECT 1 FROM referrer_demo_accounts d WHERE d.referrer_id = r.id) THEN 1 ELSE 0 END AS is_demo,
              (SELECT COUNT(*) FROM enquiries e WHERE e.referrer_id = r.id AND substr(e.reference, 1, 7) <> 'SAMPLE-') AS case_count,
              (SELECT COUNT(*) FROM enquiries e WHERE e.referrer_id = r.id AND substr(e.reference, 1, 7) <> 'SAMPLE-' AND e.case_status = 'completed') AS completed_count,
              (SELECT COUNT(*) FROM enquiries e WHERE e.referrer_id = r.id AND substr(e.reference, 1, 7) = 'SAMPLE-') AS sample_count,
              (SELECT GROUP_CONCAT(DISTINCT f.transaction_type) FROM referrer_fee_configs f WHERE f.referrer_id = r.id) AS custom_pricing_types
         FROM referrers r
        ORDER BY r.referrer_name COLLATE NOCASE ASC`
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

    // Login finds the referrer by portal email, so two accounts must
    // never share one.
    const loginEmail = portal_email ? String(portal_email).toLowerCase().trim() : "";
    if (loginEmail) {
      const clash = await env.DB.prepare(
        `SELECT id, referrer_name FROM referrers WHERE portal_email = ? AND id <> ? LIMIT 1`
      ).bind(loginEmail, Number(id) || 0).first();
      if (clash) {
        return jsonResponse(
          { success: false, error: `${clash.referrer_name} already uses ${loginEmail} as its login email.` },
          409
        );
      }
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
        "referral_fee = ?", "remortgage_referral_fee = ?", "marketing_fee = ?", "fee_markup = ?", "portal_email = ?",
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
        notes || "",
      ];

      // Portal access is switched on and off from the Portal access tab
      // (admin-referrer-access.js / Send invite); a details save that
      // doesn't send the flag leaves it as it is.
      if (portal_active !== undefined) {
        updateParts.push("portal_active = ?");
        binds.push(toFlag(portal_active));
      }

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
