const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();

    const {
      id,
      firm_name,
      contact_name,
      contact_email,
      contact_phone,
      active,
      accepting_new_matters,
    } = body;

    if (!id) {
      return jsonResponse(
        { success: false, error: "Missing firm id" },
        400
      );
    }

    await env.DB.prepare(`
      UPDATE firms
      SET
        firm_name = ?,
        contact_name = ?,
        contact_email = ?,
        contact_phone = ?,
        active = ?,
        accepting_new_matters = ?
      WHERE id = ?
    `)
      .bind(
        firm_name || "",
        contact_name || "",
        contact_email || "",
        contact_phone || "",
        active || "no",
        accepting_new_matters || "no",
        id
      )
      .run();

    const updatedFirm = await env.DB.prepare(`
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
      WHERE f.id = ?
      GROUP BY
        f.id,
        f.firm_name,
        f.contact_name,
        f.contact_email,
        f.contact_phone,
        f.active,
        f.accepting_new_matters
    `)
      .bind(id)
      .first();

    return jsonResponse({
      success: true,
      firm: updatedFirm || null,
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