// functions/api/firm-respond-referral.js
import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // Validate firm session
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "firm");
    if (!session) return unauthorised();

    const firmId = session.user_id;
    const { reference, response, notes } = await request.json();

    if (!reference || !response) {
      return jsonResponse(
        { success: false, error: "Reference and response are required." },
        400
      );
    }

    if (!["accepted", "declined"].includes(response)) {
      return jsonResponse(
        { success: false, error: "Response must be 'accepted' or 'declined'." },
        400
      );
    }

    // Verify the enquiry actually belongs to this firm
    const enquiry = await env.DB.prepare(
      `SELECT id, reference, firm_response, assigned_firm_id
       FROM enquiries
       WHERE reference = ? AND assigned_firm_id = ?
       LIMIT 1`
    )
      .bind(reference, firmId)
      .first();

    if (!enquiry) {
      return jsonResponse(
        { success: false, error: "Enquiry not found or not assigned to your firm." },
        404
      );
    }

    if (enquiry.firm_response) {
      return jsonResponse(
        {
          success: false,
          error: `You have already ${enquiry.firm_response} this referral.`,
        },
        409
      );
    }

    // Record the firm's response
    await env.DB.prepare(
      `UPDATE enquiries
       SET firm_response       = ?,
           firm_responded_at   = datetime('now'),
           firm_response_notes = ?,
           panel_status        = ?,
           updated_at          = datetime('now')
       WHERE reference = ?`
    )
      .bind(
        response,
        notes || null,
        response === "accepted" ? "firm_accepted" : "firm_declined",
        reference
      )
      .run();

    // Notify the ConveyQuote admin team by email
    const firmRow = await env.DB.prepare(
      `SELECT firm_name FROM panel_firms WHERE id = ? LIMIT 1`
    )
      .bind(firmId)
      .first();

    const firmName = firmRow?.firm_name || "Unknown firm";
    const action = response === "accepted" ? "accepted" : "declined";
    const adminUrl = `https://conveyquote.uk/admin?ref=${encodeURIComponent(reference)}`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ConveyQuote <quotes@conveyquote.uk>",
        to: ["info@conveyquote.uk"],
        subject: `Firm ${action} referral – ${reference}`,
        html: `
          <p style="font-family:sans-serif;">
            <strong>${firmName}</strong> has <strong>${action}</strong>
            the referral for enquiry <strong>${reference}</strong>.
          </p>
          ${notes ? `<p style="font-family:sans-serif;">Notes: ${notes}</p>` : ""}
          <p style="font-family:sans-serif;">
            <a href="${adminUrl}">View enquiry in admin panel →</a>
          </p>
        `,
      }),
    }).catch(() => {
      // Don't fail the request if email fails
    });

    return jsonResponse({ success: true, reference, response });
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
