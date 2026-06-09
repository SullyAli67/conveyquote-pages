import { getTokenFromRequest, validateSession, unauthorised } from "../lib/auth.js";
export async function onRequestPost({ request, env }) {
  try {
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "admin");
    if (!session) return unauthorised();
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: "Missing id" }), {
        status: 400,
      });
    }

    await env.DB.prepare(
      `DELETE FROM lenders WHERE id = ?`
    )
      .bind(id)
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
