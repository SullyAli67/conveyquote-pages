export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const reference = url.searchParams.get("ref");

    if (!reference) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing reference" }),
        { status: 400 }
      );
    }

    const result = await env.DB.prepare(
      `SELECT * FROM enquiries WHERE reference = ?`
    )
      .bind(reference)
      .first();

    if (!result) {
      return new Response(
        JSON.stringify({ success: false, error: "Enquiry not found" }),
        { status: 404 }
      );
    }

    let parsedQuote = null;

    if (result.quote_json) {
      try {
        parsedQuote = JSON.parse(result.quote_json);
      } catch (err) {
        console.error("Quote JSON parse error:", err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        enquiry: {
          ...result,
          quote: parsedQuote,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { status: 500 }
    );
  }
}
