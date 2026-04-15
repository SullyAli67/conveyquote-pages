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
        m.id,
        m.firm_id,
        m.lender_id,
        m.active,
        m.notes,
        m.last_checked_at,
        m.created_at,
        m.updated_at,
        f.firm_name,
        l.lender_name
      FROM panel_firm_lender_memberships m
      INNER JOIN panel_firms f ON f.id = m.firm_id
      INNER JOIN panel_lenders l ON l.id = m.lender_id
      ORDER BY f.firm_name COLLATE NOCASE ASC, l.lender_name COLLATE NOCASE ASC
      `
    ).all();

    return jsonResponse({
      success: true,
      memberships: results.results || [],
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
