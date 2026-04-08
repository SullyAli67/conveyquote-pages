const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const reference = url.searchParams.get("ref");

    if (!reference) {
      return jsonResponse(
        { success: false, error: "Missing reference" },
        400
      );
    }

    const enquiry = await env.DB.prepare(
      `SELECT * FROM enquiries WHERE reference = ?`
    )
      .bind(reference)
      .first();

    if (!enquiry) {
      return jsonResponse(
        { success: false, error: "Enquiry not found" },
        404
      );
    }

    let parsedQuote = null;

    if (enquiry.quote_json) {
      try {
        parsedQuote = JSON.parse(enquiry.quote_json);
      } catch (error) {
        console.error("Quote JSON parse error:", error);
      }
    }

    return jsonResponse({
      success: true,
      enquiry: {
        ...enquiry,
        quote: parsedQuote,
      },
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
