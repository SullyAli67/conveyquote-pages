export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const reference = url.searchParams.get("ref");

    if (!reference) {
      return new Response("Missing reference", { status: 400 });
    }

    await env.DB.prepare(
      `
      UPDATE enquiries
      SET status = 'accepted'
      WHERE reference = ?
      `
    )
      .bind(reference)
      .run();

    return Response.redirect(
      `https://conveyquote.uk/accept-success?ref=${encodeURIComponent(reference)}`,
      302
    );
  } catch (error) {
    return new Response("Error accepting quote", { status: 500 });
  }
}
