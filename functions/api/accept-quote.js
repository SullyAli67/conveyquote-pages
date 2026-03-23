export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const reference = url.searchParams.get("ref");

    if (!reference) {
      return new Response("Missing reference", { status: 400 });
    }

    await env.DB.prepare(
      `UPDATE enquiries SET status = 'accepted' WHERE reference = ?`
    )
      .bind(reference)
      .run();

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
