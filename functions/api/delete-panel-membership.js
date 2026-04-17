export async function onRequestPost(context) {
  const jsonResponse = (payload, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  try {
    const { request, env } = context;
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return jsonResponse(
        { success: false, error: "Membership id is required" },
        400
      );
    }

    await env.DB.prepare(
      `DELETE FROM panel_firm_lender_memberships WHERE id = ?`
    )
      .bind(id)
      .run();

    return jsonResponse({ success: true, id });
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
