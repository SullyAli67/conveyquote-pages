// functions/api/referrer-portal-data.js
//
// The referrer portal's data. Two kinds of session may read it:
//   * "referrer"         — the referrer, logged in.
//   * "referrer_preview" — admin's read-only "Preview their portal" view
//                          (30 minutes, issued by admin-referrer-access.js).
//                          Every endpoint that changes anything accepts
//                          only "referrer", so a preview cannot act.
import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";
import { loadReferrerPortalData, PREVIEW_SESSION_TYPE } from "../lib/referrer-portal-data.js";
import { isDemoReferrer } from "../lib/sample-cases.js";

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    let preview = false;
    let session = await validateSession(env.DB, token, "referrer");
    if (!session) {
      session = await validateSession(env.DB, token, PREVIEW_SESSION_TYPE);
      preview = Boolean(session);
    }
    if (!session) return unauthorised();

    const data = await loadReferrerPortalData(env.DB, session.user_id);
    if (!data) return unauthorised();

    return jsonResponse({
      success: true,
      referrer: data.referrer,
      enquiries: data.enquiries,
      is_demo: await isDemoReferrer(env.DB, session.user_id),
      preview,
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
