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

    const { id, lender_name, active, notes } = body;

    if (!lender_name || !String(lender_name).trim()) {
      return jsonResponse(
        { success: false, error: "Lender name is required" },
        400
      );
    }

    if (id) {
      await env.DB.prepare(
        `
        UPDATE panel_lenders
        SET
          lender_name = ?,
          active = ?,
          notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `
      )
        .bind(
          String(lender_name).trim(),
          toFlag(active),
          notes || "",
          id
        )
        .run();

      return jsonResponse({ success: true, id, mode: "updated" });
    }

    const insert = await env.DB.prepare(
      `
      INSERT INTO panel_lenders (
        lender_name,
        active,
        notes
      )
      VALUES (?, ?, ?)
      `
    )
      .bind(
        String(lender_name).trim(),
        toFlag(active ?? true),
        notes || ""
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
