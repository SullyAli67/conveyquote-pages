export async function onRequestPost(context) {
  const jsonResponse = (payload, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  try {
    const { request, env } = context;
    const body = await request.json();

    const {
      firm_name,
      contact_name,
      contact_email,
      contact_phone,
      active,
      accepting_new_matters,
    } = body;

    if (!firm_name || !firm_name.trim()) {
      return jsonResponse(
        { success: false, error: "Firm name is required" },
        400
      );
    }

    await env.DB.prepare(
      `
      INSERT INTO firms (
        firm_name,
        contact_name,
        contact_email,
        contact_phone,
        active,
        accepting_new_matters,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `
    )
      .bind(
        firm_name.trim(),
        contact_name || null,
        contact_email || null,
        contact_phone || null,
        active || "yes",
        accepting_new_matters || "yes"
      )
      .run();

    return jsonResponse({ success: true });
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