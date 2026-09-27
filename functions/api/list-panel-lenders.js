import {
  getTokenFromRequest,
  validateSession,
  unauthorised,
} from "../lib/auth.js";

export async function onRequestGet(context) {
  const jsonResponse = (payload, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  try {
    const { request, env } = context;

    // Admin-only. The public quote form takes its dropdown from
    // /api/lenders, which returns the same active lenders without the
    // internal notes and inactive rows this endpoint exposes.
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "admin");
    if (!session) return unauthorised();

    const results = await env.DB.prepare(
      `
      SELECT
        id,
        lender_name,
        active,
        notes,
        created_at,
        updated_at
      FROM panel_lenders
      ORDER BY lender_name COLLATE NOCASE ASC
      `
    ).all();

    return jsonResponse({
      success: true,
      lenders: results.results || [],
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
