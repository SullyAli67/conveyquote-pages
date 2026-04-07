export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const reference = url.searchParams.get("ref");

    if (!reference) {
      return new Response("Missing reference", { status: 400 });
    }

    // First get the enquiry so we have the client details
    const enquiryResult = await env.DB.prepare(
      `SELECT name, email FROM enquiries WHERE reference = ? LIMIT 1`
    )
      .bind(reference)
      .first();

    if (!enquiryResult) {
      return new Response("Quote reference not found", { status: 404 });
    }

    const clientName = enquiryResult.name || "Client";
    const clientEmail = enquiryResult.email;

    if (!clientEmail) {
      return new Response("Client email not found", { status: 400 });
    }

    // Update DB
    await env.DB.prepare(
      `UPDATE enquiries SET status = 'accepted' WHERE reference = ?`
    )
      .bind(reference)
      .run();

    // Email to you
    const internalEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ConveyQuote <info@conveyquote.uk>",
        to: ["info@conveyquote.uk"],
        reply_to: "info@conveyquote.uk",
        subject: `Client has instructed - ${reference}`,
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a;">
            <h2 style="color:#0f2747;margin-bottom:16px;">Client has instructed</h2>
            <p>A client has accepted their conveyancing quote.</p>
            <p><strong>Reference:</strong> ${reference}</p>
            <p><strong>Client name:</strong> ${clientName}</p>
            <p><strong>Client email:</strong> ${clientEmail}</p>
            <p>
              <a href="https://conveyquote.uk/admin?ref=${reference}" style="display:inline-block;padding:12px 18px;background:#0f2747;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">
                Open Admin
              </a>
            </p>
          </div>
        `,
      }),
    });

    if (!internalEmailResponse.ok) {
      const errorText = await internalEmailResponse.text();
      return new Response(`Failed to send internal email: ${errorText}`, {
        status: 500,
      });
    }

    // Email to client
    const clientEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ConveyQuote <info@conveyquote.uk>",
        to: [clientEmail],
        reply_to: "info@conveyquote.uk",
        subject: `We've received your instruction - ${reference}`,
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a;">
            <h2 style="color:#0f2747;margin-bottom:16px;">Thank you for your instruction</h2>
            <p>Dear ${clientName},</p>
            <p>We have received your instruction to proceed.</p>
            <p><strong>Reference:</strong> ${reference}</p>
            <p>We will be in touch shortly with the next steps and your client care documentation.</p>
            <p>If you need to contact us in the meantime, please email <a href="mailto:info@conveyquote.uk">info@conveyquote.uk</a>.</p>
          </div>
        `,
      }),
    });

    if (!clientEmailResponse.ok) {
      const errorText = await clientEmailResponse.text();
      return new Response(`Failed to send client confirmation email: ${errorText}`, {
        status: 500,
      });
    }

    // Confirmation page
    return new Response(
      `
      <html>
        <head>
          <title>Instruction Received</title>
        </head>
        <body style="font-family:Arial,Helvetica,sans-serif;background:#f2f4f7;padding:40px;">
          <div style="max-width:700px;margin:0 auto;background:#fff;padding:30px;border-radius:8px;">
            <h1 style="color:#0f2747;">Thank you</h1>
            <p>Your instruction has been received.</p>
            <p>Reference: <strong>${reference}</strong></p>
            <p>We will be in touch shortly with the next steps and client care documentation.</p>
          </div>
        </body>
      </html>
      `,
      {
        headers: { "Content-Type": "text/html; charset=UTF-8" },
      }
    );
  } catch (error) {
    return new Response("Error accepting quote", { status: 500 });
  }
}
