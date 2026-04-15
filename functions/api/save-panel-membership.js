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
      firm_id,
      lender_id,
      active,
      notes,
      last_checked_at,
    } = body;

    if (!firm_id || !lender_id) {
      return jsonResponse(
        { success: false, error: "Firm and lender are required" },
        400
      );
    }

    if (id) {
      await env.DB.prepare(
        `
        UPDATE panel_firm_lender_memberships
        SET
          firm_id = ?,
          lender_id = ?,
          active = ?,
          notes = ?,
          last_checked_at = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `
      )
        .bind(
          firm_id,
          lender_id,
          toFlag(active),
          notes || "",
          last_checked_at || null,
          id
        )
        .run();

      return jsonResponse({ success: true, id, mode: "updated" });
    }

    const insert = await env.DB.prepare(
      `
      INSERT INTO panel_firm_lender_memberships (
        firm_id,
        lender_id,
        active,
        notes,
        last_checked_at
      )
      VALUES (?, ?, ?, ?, ?)
      `
    )
      .bind(
        firm_id,
        lender_id,
        toFlag(active ?? true),
        notes || "",
        last_checked_at || null
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
