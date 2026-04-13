export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return new Response(JSON.stringify({ error: "Missing name" }), {
        status: 400,
      });
    }

    await env.DB.prepare(
      `INSERT INTO lenders (name) VALUES (?)`
    )
      .bind(name)
      .run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}
