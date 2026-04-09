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
      reference,
      firm_id,
      firm_name,
      referral_fee_payable,
      referral_fee_amount,
      admin_notes,
    } = body;

    if (!reference || !firm_id || !firm_name) {
      return jsonResponse(
        { success: false, error: "Reference, firm id and firm name are required" },
        400
      );
    }

    await env.DB.prepare(
      `
      UPDATE enquiries
      SET
        assigned_firm_id = ?,
        assigned_firm_name = ?,
        referral_fee_payable = ?,
        referral_fee_amount = ?,
        panel_status = 'panel_referred',
        referred_at = CURRENT_TIMESTAMP,
        admin_notes = COALESCE(?, admin_notes)
      WHERE reference = ?
      `
    )
      .bind(
        firm_id,
        firm_name,
        toFlag(referral_fee_payable),
        Number(referral_fee_amount || 0),
        admin_notes || null,
        reference
      )
      .run();

    return jsonResponse({ success: true, reference });
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
