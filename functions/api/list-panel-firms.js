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
        pf.id,
        pf.firm_name,
        pf.contact_name,
        pf.contact_email,
        pf.contact_phone,
        pf.active,
        pf.panel_terms_accepted,
        pf.panel_terms_accepted_at,
        pf.handles_purchase,
        pf.handles_sale,
        pf.handles_remortgage,
        pf.handles_transfer,
        pf.handles_leasehold,
        pf.handles_new_build,
        pf.handles_company_buyers,
        pf.notes,
        pf.created_at,
        pf.updated_at,
        COUNT(CASE WHEN m.active = 1 THEN m.id END) AS lender_count
      FROM panel_firms pf
      LEFT JOIN panel_firm_lender_memberships m
        ON m.firm_id = pf.id
      GROUP BY
        pf.id,
        pf.firm_name,
        pf.contact_name,
        pf.contact_email,
        pf.contact_phone,
        pf.active,
        pf.panel_terms_accepted,
        pf.panel_terms_accepted_at,
        pf.handles_purchase,
        pf.handles_sale,
        pf.handles_remortgage,
        pf.handles_transfer,
        pf.handles_leasehold,
        pf.handles_new_build,
        pf.handles_company_buyers,
        pf.notes,
        pf.created_at,
        pf.updated_at
      ORDER BY pf.firm_name COLLATE NOCASE ASC
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