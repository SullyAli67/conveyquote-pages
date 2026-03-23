export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const reference = url.searchParams.get("ref");

    if (!reference) {
      return Response.json(
        { success: false, error: "Missing reference" },
        { status: 400 }
      );
    }

    const enquiry = await context.env.DB.prepare(
      `SELECT * FROM enquiries WHERE reference = ? LIMIT 1`
    )
      .bind(reference)
      .first();

    if (!enquiry) {
      return Response.json(
        { success: false, error: "Enquiry not found" },
        { status: 404 }
      );
    }

    let quote = null;

    if (enquiry.quote_json) {
      try {
        quote = JSON.parse(enquiry.quote_json);
      } catch (error) {
        quote = null;
      }
    }

    return Response.json({
      success: true,
      enquiry: {
        ...enquiry,
        quote,
      },
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message || "Server error",
      },
      { status: 500 }
    );
  }
}
