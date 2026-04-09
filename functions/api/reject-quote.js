export async function onRequestGet(context) {
  const jsonResponse = (payload, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const getTransactionLabel = (type) => {
    if (type === "purchase") return "Purchase";
    if (type === "sale") return "Sale";
    if (type === "sale_purchase") return "Sale and Purchase";
    if (type === "remortgage") return "Remortgage";
    if (type === "transfer") return "Transfer of Equity";
    if (type === "remortgage_transfer") {
      return "Remortgage and Transfer of Equity";
    }
    return "Conveyancing Matter";
  };

  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const reference = url.searchParams.get("ref");

    if (!reference) {
      return jsonResponse({ success: false, error: "Missing reference" }, 400);
    }

    const enquiry = await env.DB.prepare(
      `
      SELECT
        reference,
        client_name,
        client_email,
        transaction_type,
        status
      FROM enquiries
      WHERE reference = ?
      LIMIT 1
      `
    )
      .bind(reference)
      .first();

    if (!enquiry) {
      return jsonResponse(
        { success: false, error: `Quote reference not found: ${reference}` },
        404
      );
    }

    const clientName = enquiry.client_name || "Client";
    const clientEmail = enquiry.client_email || "";
    const transactionType = getTransactionLabel(enquiry.transaction_type);
    const currentStatus = enquiry.status || "";

    if (!clientEmail) {
      return jsonResponse(
        {
          success: false,
          error: `Client email not found for reference: ${reference}`,
        },
        400
      );
    }

    const alreadyRejected = currentStatus === "rejected";

    if (!alreadyRejected) {
      await env.DB.prepare(
        `UPDATE enquiries SET status = 'rejected' WHERE reference = ?`
      )
        .bind(reference)
        .run();

      const internalEmailResponse = await fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "ConveyQuote <quotes@conveyquote.uk>",
            to: ["info@conveyquote.uk"],
            reply_to: "info@conveyquote.uk",
            subject: `Client declined quote - ${reference}`,
            html: `
              <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a;background:#f4f6f8;padding:24px;">
                <div style="max-width:700px;margin:0 auto;background:#ffffff;border:1px solid #d9e2ec;border-radius:10px;overflow:hidden;">
                  <div style="background:#0f2747;color:#ffffff;padding:20px 24px;">
                    <h2 style="margin:0;">Client declined quote</h2>
                  </div>

                  <div style="padding:24px;">
                    <p style="margin-top:0;">
                      A client has declined their conveyancing quote.
                    </p>

                    <table style="border-collapse:collapse;width:100%;margin:16px 0;">
                      <tr>
                        <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;width:35%;">Reference</td>
                        <td style="padding:10px 12px;border:1px solid #d9d9d9;">${escapeHtml(
                          reference
                        )}</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;">Client name</td>
                        <td style="padding:10px 12px;border:1px solid #d9d9d9;">${escapeHtml(
                          clientName
                        )}</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;">Client email</td>
                        <td style="padding:10px 12px;border:1px solid #d9d9d9;">${escapeHtml(
                          clientEmail
                        )}</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;">Transaction type</td>
                        <td style="padding:10px 12px;border:1px solid #d9d9d9;">${escapeHtml(
                          transactionType
                        )}</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;">Status</td>
                        <td style="padding:10px 12px;border:1px solid #d9d9d9;">Rejected</td>
                      </tr>
                    </table>
                  </div>
                </div>
              </div>
            `,
          }),
        }
      );

      if (!internalEmailResponse.ok) {
        return jsonResponse(
          { success: false, error: "Failed to send internal notification email." },
          500
        );
      }

      const clientEmailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "ConveyQuote <quotes@conveyquote.uk>",
          to: [clientEmail],
          reply_to: "info@conveyquote.uk",
          subject: `We’ve recorded your decision - ${reference}`,
          html: `
            <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a;background:#f4f6f8;padding:24px;">
              <div style="max-width:700px;margin:0 auto;background:#ffffff;border:1px solid #d9e2ec;border-radius:10px;overflow:hidden;">
                <div style="background:#0f2747;color:#ffffff;padding:20px 24px;">
                  <h2 style="margin:0;">Thank you for letting us know</h2>
                </div>

                <div style="padding:24px;">
                  <p style="margin-top:0;">Dear ${escapeHtml(clientName)},</p>

                  <p>
                    We have recorded that you do not wish to proceed with this quote at present.
                  </p>

                  <table style="border-collapse:collapse;width:100%;margin:16px 0 24px 0;">
                    <tr>
                      <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;width:35%;">Reference</td>
                      <td style="padding:10px 12px;border:1px solid #d9d9d9;">${escapeHtml(
                        reference
                      )}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;">Transaction type</td>
                      <td style="padding:10px 12px;border:1px solid #d9d9d9;">${escapeHtml(
                        transactionType
                      )}</td>
                    </tr>
                  </table>

                  <p>
                    If your circumstances change and you would like to revisit the matter,
                    please contact us at
                    <a href="mailto:info@conveyquote.uk">info@conveyquote.uk</a>.
                  </p>
                </div>
              </div>
            </div>
          `,
        }),
      });

      if (!clientEmailResponse.ok) {
        return jsonResponse(
          { success: false, error: "Failed to send client confirmation email." },
          500
        );
      }
    }

    return jsonResponse({
      success: true,
      reference,
      status: alreadyRejected ? "already_rejected" : "rejected",
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
