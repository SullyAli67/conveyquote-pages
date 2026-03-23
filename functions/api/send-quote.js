export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();

    const {
      name,
      email,
      phone,
      type,
      price,
      quoteAmount
    } = body;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ConveyQuote <onboarding@resend.dev>",
        to: [email],
        cc: ["suleman@conveyquote.uk"],
        subject: "Your Conveyancing Quote",
        html: `
          <h2>Your Conveyancing Quote</h2>
          <p>Dear ${name || "Client"},</p>
          <p>Thank you for your enquiry.</p>
          <p><strong>Transaction type:</strong> ${type || ""}</p>
          <p><strong>Property price:</strong> £${price || ""}</p>
          <p><strong>Estimated quote:</strong> £${quoteAmount || ""}</p>
          <p><strong>Phone:</strong> ${phone || ""}</p>
          <p>If you would like to proceed, please reply to this email.</p>
        `,
      }),
    });

    const data = await resendResponse.json();

    if (!resendResponse.ok) {
      return new Response(JSON.stringify({ success: false, data }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
