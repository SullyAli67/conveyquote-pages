// functions/api/admin-referrer-access.js
//
// Admin actions on one referrer, used by the Referrers tab.
//
// GET  ?id=<referrer id>
//   The referrer's cases, exactly as their portal shows them (Cases tab).
//
// POST { action, id, ... }
//   set_password   { password }  Sets the portal password directly. It is
//                                never emailed: admin passes it on by phone.
//                                Cancels unused set-password links and logs
//                                the referrer out everywhere.
//   set_active     { active }    Portal access on / off. Off also logs the
//                                referrer out and cancels unused links.
//   set_demo       { demo }      Marks / unmarks a demo account (0022).
//   load_samples                 Adds the five sample cases.
//   remove_samples               Deletes this referrer's SAMPLE- cases.
//   create_demo    { referrer_name, portal_email }
//                                New demo referrer (£150 / £100, access off)
//                                with the five sample cases loaded. Admin
//                                then presses Send invite.
//   preview                      A 30-minute read-only token for "Preview
//                                their portal" (see referrer-portal-data.js).

import {
  getTokenFromRequest,
  validateSession,
  hashPassword,
  generateToken,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";
import { SETUP_TOKEN_TYPE } from "../lib/referrer-setup-link.js";
import {
  loadReferrerPortalData,
  PREVIEW_SESSION_TYPE,
  PREVIEW_MINUTES,
} from "../lib/referrer-portal-data.js";
import { countSampleCases, loadSampleCases, removeSampleCases } from "../lib/sample-cases.js";

const DEMO_FEES = { referral_fee: 150, remortgage_referral_fee: 100 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function loadReferrer(db, id) {
  return db
    .prepare(
      `SELECT id, referrer_name, portal_email, portal_active, referral_fee, remortgage_referral_fee
         FROM referrers WHERE id = ? LIMIT 1`
    )
    .bind(id)
    .first();
}

async function endSessions(db, referrerId, types) {
  for (const type of types) {
    await db
      .prepare(`DELETE FROM sessions WHERE user_type = ? AND user_id = ?`)
      .bind(type, referrerId)
      .run();
  }
}

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const session = await validateSession(env.DB, getTokenFromRequest(request), "admin");
    if (!session) return unauthorised();

    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isFinite(id) || id <= 0) {
      return jsonResponse({ success: false, error: "Referrer id is required." }, 400);
    }
    const data = await loadReferrerPortalData(env.DB, id);
    if (!data) return jsonResponse({ success: false, error: "Referrer not found." }, 404);
    return jsonResponse({ success: true, enquiries: data.enquiries });
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
    const action = String(body.action || "");
    const db = env.DB;

    if (action === "create_demo") {
      const name = String(body.referrer_name || "").trim() || "Demo Estate Agents";
      const email = String(body.portal_email || "").toLowerCase().trim();
      if (!EMAIL_RE.test(email)) {
        return jsonResponse({ success: false, error: "Enter the login email for the demo account." }, 400);
      }
      const clash = await db
        .prepare(`SELECT referrer_name FROM referrers WHERE portal_email = ? LIMIT 1`)
        .bind(email)
        .first();
      if (clash) {
        return jsonResponse(
          { success: false, error: `${clash.referrer_name} already uses ${email} as its login email.` },
          409
        );
      }
      const created = await db
        .prepare(
          `INSERT INTO referrers (referrer_name, contact_email, referral_fee, remortgage_referral_fee,
                                  marketing_fee, fee_markup, portal_email, portal_active, notes)
           VALUES (?, ?, ?, ?, 50, 0, ?, 0, 'Demo account')`
        )
        .bind(name, email, DEMO_FEES.referral_fee, DEMO_FEES.remortgage_referral_fee, email)
        .run();
      const newId = created.meta?.last_row_id;
      if (!newId) return jsonResponse({ success: false, error: "Could not create the demo account." }, 500);
      await db.prepare(`INSERT INTO referrer_demo_accounts (referrer_id) VALUES (?)`).bind(newId).run();
      await loadSampleCases(db, { id: newId, ...DEMO_FEES });
      return jsonResponse({ success: true, id: newId });
    }

    const id = Number(body.id);
    if (!Number.isFinite(id) || id <= 0) {
      return jsonResponse({ success: false, error: "Referrer id is required." }, 400);
    }
    const referrer = await loadReferrer(db, id);
    if (!referrer) return jsonResponse({ success: false, error: "Referrer not found." }, 404);

    if (action === "set_password") {
      const password = String(body.password || "");
      if (password.length < 8) {
        return jsonResponse({ success: false, error: "The password must be at least 8 characters." }, 400);
      }
      await db
        .prepare(`UPDATE referrers SET portal_password_hash = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(await hashPassword(password), id)
        .run();
      await endSessions(db, id, ["referrer", SETUP_TOKEN_TYPE]);
      return jsonResponse({ success: true });
    }

    if (action === "set_active") {
      const active = body.active ? 1 : 0;
      if (active && !referrer.portal_email) {
        return jsonResponse({ success: false, error: "Add a portal login email first." }, 400);
      }
      await db
        .prepare(`UPDATE referrers SET portal_active = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(active, id)
        .run();
      if (!active) await endSessions(db, id, ["referrer", SETUP_TOKEN_TYPE, PREVIEW_SESSION_TYPE]);
      return jsonResponse({ success: true, active: Boolean(active) });
    }

    if (action === "set_demo") {
      if (body.demo) {
        await db
          .prepare(`INSERT INTO referrer_demo_accounts (referrer_id) VALUES (?) ON CONFLICT (referrer_id) DO NOTHING`)
          .bind(id)
          .run();
      } else {
        await db.prepare(`DELETE FROM referrer_demo_accounts WHERE referrer_id = ?`).bind(id).run();
      }
      return jsonResponse({ success: true, demo: Boolean(body.demo) });
    }

    if (action === "load_samples") {
      if ((await countSampleCases(db, id)) > 0) {
        return jsonResponse(
          { success: false, error: "This referrer already has sample cases. Remove them first to reload." },
          409
        );
      }
      await loadSampleCases(db, referrer);
      return jsonResponse({ success: true, sample_count: await countSampleCases(db, id) });
    }

    if (action === "remove_samples") {
      const removed = await removeSampleCases(db, id);
      return jsonResponse({ success: true, removed });
    }

    if (action === "preview") {
      const token = generateToken();
      const expires = new Date(Date.now() + PREVIEW_MINUTES * 60 * 1000);
      await db
        .prepare(`INSERT INTO sessions (token, user_type, user_id, expires_at) VALUES (?, ?, ?, ?)`)
        .bind(token, PREVIEW_SESSION_TYPE, id, expires.toISOString())
        .run();
      return jsonResponse({
        success: true,
        token,
        referrer_id: id,
        referrer_name: referrer.referrer_name,
        expires_at: expires.toISOString(),
      });
    }

    return jsonResponse({ success: false, error: "Unknown action." }, 400);
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
