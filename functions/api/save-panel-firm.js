export async function onRequestPost(context) {
  const jsonResponse = (payload, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  const toFlag = (value) => (value ? 1 : 0);

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
      panel_terms_accepted,
      handles_purchase,
      handles_sale,
      handles_remortgage,
      handles_transfer,
      handles_leasehold,
      handles_new_build,
      handles_company_buyers,
      notes,
      default_referral_fee,
      suspended,
    } = body;

    if (!firm_name || !String(firm_name).trim()) {
      return jsonResponse(
        { success: false, error: "Firm name is required" },
        400
      );
    }

    const acceptedAt = panel_terms_accepted ? new Date().toISOString() : null;

    if (id) {
      await env.DB.prepare(
        `
        UPDATE panel_firms
        SET
          firm_name = ?,
          contact_name = ?,
          contact_email = ?,
          contact_phone = ?,
          active = ?,
          panel_terms_accepted = ?,
          panel_terms_accepted_at = CASE
            WHEN ? = 1 AND panel_terms_accepted_at IS NULL THEN ?
            WHEN ? = 0 THEN NULL
            ELSE panel_terms_accepted_at
          END,
          handles_purchase = ?,
          handles_sale = ?,
          handles_remortgage = ?,
          handles_transfer = ?,
          handles_leasehold = ?,
          handles_new_build = ?,
          handles_company_buyers = ?,
          notes = ?,
          default_referral_fee = ?,
          suspended = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `
      )
        .bind(
          String(firm_name).trim(),
          contact_name || "",
          contact_email || "",
          contact_phone || "",
          toFlag(active),
          toFlag(panel_terms_accepted),
          toFlag(panel_terms_accepted),
          acceptedAt,
          toFlag(panel_terms_accepted),
          toFlag(handles_purchase),
          toFlag(handles_sale),
          toFlag(handles_remortgage),
          toFlag(handles_transfer),
          toFlag(handles_leasehold),
          toFlag(handles_new_build),
          toFlag(handles_company_buyers),
          notes || "",
          Number(default_referral_fee || 0),
          toFlag(suspended),
          id
        )
        .run();

      return jsonResponse({ success: true, id, mode: "updated" });
    }

    const insert = await env.DB.prepare(
      `
      INSERT INTO panel_firms (
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
        default_referral_fee,
        suspended
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
      .bind(
        String(firm_name).trim(),
        contact_name || "",
        contact_email || "",
        contact_phone || "",
        toFlag(active ?? true),
        toFlag(panel_terms_accepted),
        panel_terms_accepted ? acceptedAt : null,
        toFlag(handles_purchase),
        toFlag(handles_sale),
        toFlag(handles_remortgage),
        toFlag(handles_transfer),
        toFlag(handles_leasehold),
        toFlag(handles_new_build),
        toFlag(handles_company_buyers),
        notes || "",
        Number(default_referral_fee || 0),
        toFlag(suspended)
      )
      .run();

    return jsonResponse({
      success: true,
      id: insert.meta?.last_row_id || null,
      mode: "created",
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
