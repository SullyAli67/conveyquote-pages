// POST /api/guide-download  { email, guide }
// Emails the requested PDF guide to the user (attachment) and notifies
// info@conveyquote.uk for lead capture. Reuses the existing Resend setup
// (verified domain quotes@conveyquote.uk, env.RESEND_API_KEY) — mirrors
// functions/api/send-quote.js. The guide is ALSO directly downloadable on
// the landing page, so this is opt-in lead capture, not a gate.

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// Allowlist: slug → { file, title }. Prevents the endpoint being used to
// attach arbitrary URLs.
const GUIDES = {
  "first-time-buyer-conveyancing-checklist": { file: "First-Time-Buyer-Conveyancing-Checklist.pdf", title: "The First-Time Buyer's Conveyancing Checklist" },
  "conveyancing-cost-guide-2026": { file: "Conveyancing-Cost-Guide-2026.pdf", title: "The Conveyancing Cost Guide 2026" },
  "freehold-vs-leasehold-complete-guide": { file: "Freehold-vs-Leasehold-Complete-Guide.pdf", title: "Freehold vs Leasehold: The Complete Guide" },
  "buy-to-let-conveyancing-guide": { file: "Buy-to-Let-Conveyancing-Guide.pdf", title: "The Buy-to-Let Conveyancing Guide" },
  "remortgage-conveyancing-guide": { file: "Remortgage-Conveyancing-Guide.pdf", title: "The Remortgage Conveyancing Guide" },
  "agents-guide-to-conveyancing-referrals": { file: "Agents-Guide-to-Conveyancing-Referrals.pdf", title: "The Agent's Guide to Conveyancing Referrals" },
  "broker-partnership-guide": { file: "Broker-Partnership-Guide.pdf", title: "The Broker Partnership Guide" },
  "conveyquote-referral-program-overview": { file: "ConveyQuote-Referral-Program-Overview.pdf", title: "ConveyQuote Referral Program Overview" },
};

const isEmail = (s) => typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json().catch(() => ({}));
    const email = (body.email || "").trim();
    const slug = (body.guide || "").trim();
    const guide = GUIDES[slug];

    if (!isEmail(email)) return jsonResponse({ success: false, error: "Please enter a valid email address." }, 400);
    if (!guide) return jsonResponse({ success: false, error: "Unknown guide." }, 400);

    if (!env.RESEND_API_KEY) {
      // Email isn't configured — the page's direct download still works.
      return jsonResponse({ success: false, error: "Email delivery is temporarily unavailable — please use the download button instead." }, 503);
    }

    const origin = new URL(request.url).origin;
    const pdfUrl = `${origin}/guides/${guide.file}`;
    const pdfResp = await fetch(pdfUrl);
    if (!pdfResp.ok) {
      return jsonResponse({ success: false, error: "Could not retrieve the guide — please use the download button instead." }, 502);
    }
    const base64 = arrayBufferToBase64(await pdfResp.arrayBuffer());

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#162033;background:#f4f6f8;padding:24px;">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #d9e2ec;">
          <div style="background:#062a63;padding:20px 24px;color:#fff;font-weight:700;font-size:18px;">ConveyQuote</div>
          <div style="padding:24px;">
            <p style="margin:0 0 12px;">Hi,</p>
            <p style="margin:0 0 12px;">Thanks for downloading <strong>${guide.title}</strong> — it's attached to this email as a PDF.</p>
            <p style="margin:0 0 12px;">When you're ready, you can get a fixed, itemised conveyancing quote in about two minutes — reviewed by a real person before it reaches you, with no hidden extras.</p>
            <p style="margin:16px 0;"><a href="https://conveyquote.uk/" style="background:#0aa6b5;color:#fff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:8px;display:inline-block;">Get your free quote &rarr;</a></p>
            <p style="margin:16px 0 0;font-size:13px;color:#667085;">You received this because you requested this guide at conveyquote.uk. We won't add you to any marketing lists.</p>
          </div>
        </div>
      </div>`;

    const sendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "ConveyQuote <quotes@conveyquote.uk>",
        to: [email],
        reply_to: "info@conveyquote.uk",
        subject: `Your guide: ${guide.title}`,
        html,
        attachments: [{ filename: guide.file, content: base64 }],
      }),
    });

    if (!sendResp.ok) {
      const detail = await sendResp.text().catch(() => "");
      console.error("guide-download: Resend failed", sendResp.status, detail);
      return jsonResponse({ success: false, error: "We couldn't send the email just now — please use the download button instead." }, 502);
    }

    // Lead notification (best-effort; never blocks the user response).
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "ConveyQuote <quotes@conveyquote.uk>",
          to: ["info@conveyquote.uk"],
          reply_to: email,
          subject: `Guide download — ${guide.title}`,
          html: `<p>${email} downloaded <strong>${guide.title}</strong> (${slug}).</p>`,
        }),
      });
    } catch (e) {
      console.error("guide-download: lead notify threw", e);
    }

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("guide-download error", err);
    return jsonResponse({ success: false, error: "Something went wrong — please use the download button instead." }, 500);
  }
}
