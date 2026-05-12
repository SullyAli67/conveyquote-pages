// Admin-only toggle for pausing/resuming the follow-up nudge sequence on a
// specific enquiry. POST { reference, disabled: 0 | 1 }.

import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "admin");
    if (!session) return unauthorised();

    const { reference, disabled } = await request.json();

    if (!reference) {
      return jsonResponse(
        { success: false, error: "Reference is required." },
        400
      );
    }

    const disabledFlag = disabled === 1 || disabled === true ? 1 : 0;

    const result = await env.DB.prepare(
      `UPDATE enquiries SET followups_disabled = ? WHERE reference = ?`
    )
      .bind(disabledFlag, reference)
      .run();

    if (!result.meta || result.meta.changes === 0) {
      return jsonResponse(
        { success: false, error: "Enquiry not found." },
        404
      );
    }

    return jsonResponse({
      success: true,
      reference,
      followups_disabled: disabledFlag,
    });
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
