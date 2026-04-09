const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function onRequestGet(context) {
  try {
    const { env } = context;

    const result = await env.DB.prepare(`
      SELECT
        f.id,
        f.firm_name,
        f.contact_name,
        f.contact_email,
        f.contact_phone,
        f.active,
        f.accepting_new_matters,
        COUNT(flp.lender_id) AS lender_count
      FROM firms f
      LEFT JOIN firm_lender_panels flp
        ON flp.firm_id = f.id
       AND flp.panel_status = 'active'
      GROUP BY
        f.id,
        f.firm_name,
        f.contact_name,
        f.contact_email,
        f.contact_phone,
        f.active,
        f.accepting_new_matters
      ORDER BY f.id DESC
    `).all();

    return jsonResponse({
      success: true,
      firms: result.results || [],
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