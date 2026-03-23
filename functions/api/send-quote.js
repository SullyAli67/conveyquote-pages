export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();

    console.log("Incoming body:", body);
    console.log("Has RESEND_API_KEY:", !!env.RESEND_API_KEY);

    const {
      name,
      email,
      phone,
      type,
      price,
      quoteAmount,
    } = body;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ConveyQuote <quotes@yourdomain.co.uk>",
        to: [email],
        cc: ["your-real-email@yourdomain.co.uk"],
        subject: "Your Conveyancing Quote",
        html: `
          <h2>Your Conveyancing Quote</h2>
          <p>Dear ${name || "Client"},</p>
          <p>Thank you for your enquiry.</p>
          <p><strong>Transaction type:</strong> ${type || ""}</p>
          <p><strong>Property price:</strong> £${price || ""}</p>
          <p><strong>Estimated quote:</strong> £${quoteAmount || ""}</p>
          <p><strong>Phone:</strong> ${phone || ""}</p>
        `,
      }),
    });

    const data = await resendResponse.json();

    console.log("Resend status:", resendResponse.status);
    console.log("Resend data:", data);

    if (!resendResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          source: "resend",
          status: resendResponse.status,
          data,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Function crash:", error);

    return new Response(
      JSON.stringify({
        success: false,
        source: "function",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
