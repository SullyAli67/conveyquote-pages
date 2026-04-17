export async function onRequestGet(context) {
  const jsonResponse = (payload, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  try {
    const { env } = context;

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
