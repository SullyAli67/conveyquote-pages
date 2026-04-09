export async function onRequestGet(context) {
  const jsonResponse = (payload, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "";
    const q = (url.searchParams.get("q") || "").trim();

    let sql = `
      SELECT
        id,
        reference,
        status,
        panel_status,
        client_name,
        client_email,
        transaction_type,
        price,
        purchase_price,
        remortgage_transfer_price,
        created_at,
        quote_sent_at,
        accepted_at,
        rejected_at,
        assigned_firm_name
      FROM enquiries
      WHERE 1 = 1
    `;

    const binds = [];

    if (status) {
      sql += ` AND status = ?`;
      binds.push(status);
    }

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

    sql += ` ORDER BY created_at DESC`;

    const stmt = env.DB.prepare(sql).bind(...binds);
    const results = await stmt.all();

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
