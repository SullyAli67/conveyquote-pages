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
        firm_name,
        contact_name,
        contact_email,
        contact_phone,
        active,
        panel_terms_accepted,
        panel_terms_accepted_at,
        handles_purchase,
        handles_sale,
        handles_remortgage,
        handles_transfer,
        handles_leasehold,
        handles_new_build,
        handles_company_buyers,
        notes,
        created_at,
        updated_at
      FROM panel_firms
      ORDER BY firm_name COLLATE NOCASE ASC
      `
    ).all();

    return jsonResponse({
      success: true,
      firms: results.results || [],
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
