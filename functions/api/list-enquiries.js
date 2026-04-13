const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();

    let sql = `
      SELECT
        id,
        reference,
        client_name,
        client_email,
        client_phone,
        transaction_type,
        status,
        panel_status,
        assigned_firm_name,
        created_at
      FROM enquiries
      WHERE 1 = 1
    `;

    const binds = [];

    if (q) {
      sql += `
        AND (
          reference LIKE ?
          OR client_name LIKE ?
          OR client_email LIKE ?
        )
      `;
      binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    sql += ` ORDER BY id DESC`;

    const results = await env.DB.prepare(sql).bind(...binds).all();

    return jsonResponse({
      success: true,
      enquiries: results.results || [],
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