// functions/api/firm-quote-accept.js
// This is called when a client clicks "Accept" in their quote email
// It renders a clean HTML confirmation page

const page = (title, heading, body, colour = "#0f2747") => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #f4f6f9; color: #1a1a1a; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; }
    .card { background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.10); max-width: 520px; width: 100%; padding: 48px 40px; text-align: center; }
    .icon { font-size: 56px; margin-bottom: 20px; }
    h1 { font-size: 24px; margin-bottom: 12px; color: ${colour}; }
    p { font-size: 15px; line-height: 1.6; color: #4b5563; margin-bottom: 10px; }
    .ref { font-size: 13px; color: #9ca3af; margin-top: 20px; }
    .firm { font-weight: bold; color: #1a1a1a; }
    footer { margin-top: 32px; font-size: 11px; color: #d1d5db; }
  </style>
</head>
<body>
  <div class="card">
    ${body}
    <footer>Powered by ConveyQuote &middot; conveyquote.uk</footer>
  </div>
</body>
</html>`;

const escapeHtml = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(
        page("Invalid Link", "Invalid Link", `
          <div class="icon">⚠️</div>
          <h1>Invalid Link</h1>
          <p>This link is not valid. Please check your email and try again.</p>
        `),
        { status: 400, headers: { "Content-Type": "text/html;charset=UTF-8" } }
      );
    }

    // Look up the token
    const tokenRow = await env.DB.prepare(
      `SELECT * FROM firm_quote_tokens WHERE token = ? LIMIT 1`
    ).bind(token).first();

    if (!tokenRow) {
      return new Response(
        page("Link Not Found", "Link Not Found", `
          <div class="icon">⚠️</div>
          <h1>Link Not Found</h1>
          <p>This acceptance link could not be found. Please contact your solicitor directly.</p>
        `),
        { status: 404, headers: { "Content-Type": "text/html;charset=UTF-8" } }
      );
    }

    // Load the quote
    const quote = await env.DB.prepare(
      `SELECT * FROM firm_quotes WHERE id = ? LIMIT 1`
    ).bind(tokenRow.firm_quote_id).first();

    if (!quote) {
      return new Response(
        page("Quote Not Found", "Quote Not Found", `
          <div class="icon">⚠️</div>
          <h1>Quote Not Found</h1>
          <p>We could not find the associated quote. Please contact your solicitor directly.</p>
        `),
        { status: 404, headers: { "Content-Type": "text/html;charset=UTF-8" } }
      );
    }

    // Load firm name
    const firm = await env.DB.prepare(
      `SELECT firm_name, contact_email FROM panel_firms WHERE id = ? LIMIT 1`
    ).bind(quote.firm_id).first();

    const firmName = firm?.firm_name || "Your Solicitor";
    const ref = quote.firm_reference || quote.internal_reference;

    // Already accepted
    if (tokenRow.used || quote.status === "accepted") {
      return new Response(
        page("Already Confirmed", "Already Confirmed", `
          <div class="icon">✅</div>
          <h1>Quote Already Accepted</h1>
          <p>You have already accepted this quote. <span class="firm">${escapeHtml(firmName)}</span> has been notified and will be in touch shortly.</p>
          <p class="ref">Reference: ${escapeHtml(ref)}</p>
        `),
        { status: 200, headers: { "Content-Type": "text/html;charset=UTF-8" } }
      );
    }

    // Mark token as used and quote as accepted
    await env.DB.prepare(
      `UPDATE firm_quote_tokens SET used = 1 WHERE id = ?`
    ).bind(tokenRow.id).run();

    await env.DB.prepare(
      `UPDATE firm_quotes
       SET status = 'accepted', accepted_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`
    ).bind(quote.id).run();

    // Notify the firm
    const firmEmail = firm?.contact_email;
    if (firmEmail && env.RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "ConveyQuote <noreply@conveyquote.uk>",
          to: [firmEmail],
          subject: `Quote Accepted – ${ref}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
              <p>A client has accepted a quote.</p>
              <p><strong>Reference:</strong> ${escapeHtml(ref)}</p>
              <p><strong>Client:</strong> ${escapeHtml(quote.client_name || quote.client_email)}</p>
              <p>Log in to your firm portal to view the details.</p>
              <p style="color:#9ca3af;font-size:12px;">Powered by ConveyQuote</p>
            </div>
          `,
        }),
      }).catch(() => {});
    }

    return new Response(
      page("Quote Accepted", "Quote Accepted", `
        <div class="icon">✅</div>
        <h1>Quote Accepted</h1>
        <p>Thank you. You have successfully accepted your conveyancing quote from <span class="firm">${escapeHtml(firmName)}</span>.</p>
        <p>They will be in touch shortly with your next steps and client care documentation.</p>
        <p class="ref">Reference: ${escapeHtml(ref)}</p>
      `),
      { status: 200, headers: { "Content-Type": "text/html;charset=UTF-8" } }
    );
  } catch (error) {
    return new Response(
      page("Error", "Something went wrong", `
        <div class="icon">⚠️</div>
        <h1>Something Went Wrong</h1>
        <p>Please contact your solicitor directly to confirm your instructions.</p>
      `),
      { status: 500, headers: { "Content-Type": "text/html;charset=UTF-8" } }
    );
  }
}
