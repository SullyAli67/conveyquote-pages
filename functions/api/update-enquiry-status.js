import { getTokenFromRequest, validateSession } from "../lib/auth.js";

export async function onRequestPost(context) {
  const jsonResponse = (payload, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  try {
    const { request, env } = context;

    // This endpoint mutates enquiry status, panel status and admin notes
    // by reference, and previously performed NO authentication at all.
    // The admin UI already sends "Authorization: Bearer <token>" (see
    // adminFetch in src/App.tsx) — the header was simply never read, so
    // anyone who knew or guessed a reference could alter a live matter.
    // Adding the check therefore closes the hole without changing how
    // the UI calls it.
    const session = await validateSession(
      env.DB,
      getTokenFromRequest(request),
      "admin"
    );
    if (!session) {
      return jsonResponse({ success: false, error: "Unauthorised" }, 401);
    }

    const body = await request.json();
    const { reference, status, panel_status, admin_notes } = body;

    if (!reference) {
      return jsonResponse(
        { success: false, error: "Reference is required" },
        400
      );
    }

    await env.DB.prepare(
      `
      UPDATE enquiries
      SET
        status = COALESCE(?, status),
        panel_status = COALESCE(?, panel_status),
        admin_notes = COALESCE(?, admin_notes)
      WHERE reference = ?
      `
    )
      .bind(status || null, panel_status || null, admin_notes || null, reference)
      .run();

    return jsonResponse({ success: true, reference });
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
