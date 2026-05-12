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

    // LEFT JOIN followup_state so follow-up tracking fields come back alongside
    // the enquiry. Aliased with fs_ prefix to avoid colliding with the vestigial
    // enquiries.quote_sent_at column that still exists on prod from batch 4.
    const enquiry = await env.DB.prepare(
      `SELECT e.*,
              fs.quote_sent_at      AS fs_quote_sent_at,
              fs.followup_stage     AS fs_followup_stage,
              fs.last_followup_at   AS fs_last_followup_at,
              fs.followups_disabled AS fs_followups_disabled
         FROM enquiries e
         LEFT JOIN followup_state fs ON fs.enquiry_reference = e.reference
        WHERE e.reference = ?
        LIMIT 1`
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
    let parsedApprovedQuote = null;

    // Parse the base/generated quote (original submission)
    if (enquiry.quote_json) {
      try {
        parsedQuote = JSON.parse(enquiry.quote_json);
      } catch (error) {
        console.error("Quote JSON parse error:", error);
        parsedQuote = null;
      }
    }

    // Parse the approved quote (admin-reviewed, sent to client) — this is authoritative
    if (enquiry.approved_quote_json) {
      try {
        parsedApprovedQuote = JSON.parse(enquiry.approved_quote_json);
      } catch (error) {
        console.error("Approved quote JSON parse error:", error);
        parsedApprovedQuote = null;
      }
    }

    // adminQuote prefers the saved approved version; falls back to base quote if not yet approved
    const authoritative = parsedApprovedQuote || parsedQuote;

    const {
      quote_json,
      approved_quote_json,
      fs_quote_sent_at,
      fs_followup_stage,
      fs_last_followup_at,
      fs_followups_disabled,
      ...enquiryWithoutRawQuote
    } = enquiry;

    const mergedEnquiry = {
      ...(parsedQuote && typeof parsedQuote === "object" ? parsedQuote : {}),
      ...enquiryWithoutRawQuote,
      // Follow-up tracking lives in the followup_state table; override the
      // vestigial enquiries.quote_sent_at with the canonical value.
      quote_sent_at: fs_quote_sent_at ?? null,
      followup_stage: fs_followup_stage ?? 0,
      last_followup_at: fs_last_followup_at ?? null,
      followups_disabled: fs_followups_disabled ?? 0,
      quote: authoritative,
      // Expose whether an approved quote exists so frontend can show correct state
      has_approved_quote: Boolean(parsedApprovedQuote),
    };

    return jsonResponse({
      success: true,
      enquiry: mergedEnquiry,
      adminQuote: authoritative
        ? {
            legalFees: authoritative.legalFees || [],
            disbursements: authoritative.disbursements || [],
            vat: authoritative.vat ?? 0,
            legalFeesExVat: authoritative.legalFeesExVat ?? 0,
            legalTotalInclVat: authoritative.legalTotalInclVat ?? 0,
            disbursementTotal: authoritative.disbursementTotal ?? 0,
            grandTotal: authoritative.grandTotal ?? 0,
            sdltAmount: authoritative.sdltAmount ?? null,
            sdltNote: authoritative.sdltNote ?? null,
            totalIncludingSdlt: authoritative.totalIncludingSdlt ?? null,
            feeBreakdown: authoritative.feeBreakdown || "",
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
