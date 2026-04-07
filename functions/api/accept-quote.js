export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const reference = url.searchParams.get("ref");

    if (!reference) {
      return new Response("Missing reference", { status: 400 });
    }

    // Update DB
    await env.DB.prepare(
      `UPDATE enquiries SET status = 'accepted' WHERE reference = ?`
    )
      .bind(reference)
      .run();

    // Send notification email to YOU
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ConveyQuote <info@conveyquote.uk>",
        to: ["info@conveyquote.uk"],
        subject: `Quote Accepted - ${reference}`,
        html: `
          <h2>Quote Accepted</h2>
          <p>A client has accepted a conveyancing quote.</p>
          <p><strong>Reference:</strong> ${reference}</p>
          <p>Log into the admin panel to proceed.</p>
          <p><a href="https://conveyquote.uk/admin?ref=${reference}">Open Admin</a></p>
        `,
      }),
    });

    // Response page
    return new Response(
      `
      <html>
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
        headers: { "Content-Type": "text/html" },
      }
    );
  } catch (error) {
    return new Response("Error accepting quote", { status: 500 });
  }
}
