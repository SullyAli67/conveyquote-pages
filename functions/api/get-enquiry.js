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
      `SELECT * FROM enquiries WHERE reference = ? LIMIT 1`
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
        parsedQuote = null;
      }
    }

    const { quote_json, ...enquiryWithoutRawQuote } = enquiry;

    const mergedEnquiry = {
      ...(parsedQuote && typeof parsedQuote === "object" ? parsedQuote : {}),
      ...enquiryWithoutRawQuote,
      quote: parsedQuote,
    };

    return jsonResponse({
      success: true,
      enquiry: mergedEnquiry,
      adminQuote: parsedQuote
        ? {
            legalFees: parsedQuote.legalFees || [],
            disbursements: parsedQuote.disbursements || [],
            vat: parsedQuote.vat ?? 0,
            legalFeesExVat: parsedQuote.legalFeesExVat ?? 0,
            legalTotalInclVat: parsedQuote.legalTotalInclVat ?? 0,
            disbursementTotal: parsedQuote.disbursementTotal ?? 0,
            grandTotal: parsedQuote.grandTotal ?? 0,
            sdltAmount: parsedQuote.sdltAmount ?? null,
            sdltNote: parsedQuote.sdltNote ?? null,
            totalIncludingSdlt: parsedQuote.totalIncludingSdlt ?? null,
            feeBreakdown: parsedQuote.feeBreakdown || "",
          }
        : null,
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
