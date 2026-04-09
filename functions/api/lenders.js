export async function onRequestGet(context) {
  const jsonResponse = (payload, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });

  try {
    const { env } = context;

    if (!env.DB) {
      return jsonResponse(
        { success: false, error: "Database binding DB is missing." },
        500
      );
    }

    const result = await env.DB.prepare(
      `
      SELECT DISTINCT
        l.id,
        l.lender_name
      FROM lenders l
      INNER JOIN firm_lender_panels flp
        ON flp.lender_id = l.id
      INNER JOIN firms f
        ON f.id = flp.firm_id
      WHERE l.active = 'yes'
        AND flp.panel_status = 'active'
        AND f.active = 'yes'
        AND f.accepting_new_matters = 'yes'
      ORDER BY l.lender_name ASC
      `
    ).all();

    const lenders = (result.results || []).map((row) => ({
      id: row.id,
      name: row.lender_name,
    }));

    return jsonResponse({
      success: true,
      lenders,
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: "Failed to load lenders.",
        details: String(error),
      },
      500
    );
  }
}
