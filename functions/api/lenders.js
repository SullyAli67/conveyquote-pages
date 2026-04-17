// functions/api/lenders.js
// Public endpoint - returns active panel lenders for the quote form dropdowns
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
      return jsonResponse({ success: false, error: "Database binding DB is missing." }, 500);
    }

    const result = await env.DB.prepare(
      `SELECT id, lender_name
       FROM panel_lenders
       WHERE active = 1
       ORDER BY lender_name COLLATE NOCASE ASC`
    ).all();

    const lenders = (result.results || []).map((row) => ({
      id: row.id,
      name: row.lender_name,
    }));

    return jsonResponse({ success: true, lenders });
  } catch (error) {
    return jsonResponse(
      { success: false, error: "Failed to load lenders.", details: String(error) },
      500
    );
  }
}
