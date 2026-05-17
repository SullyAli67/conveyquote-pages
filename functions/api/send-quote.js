import { buildQuoteData } from "../lib/calculate-quote.js";

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const safe = (value) =>
  value === null || value === undefined || value === ""
    ? "Not provided"
    : String(value);

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const prettifyValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  const str = String(value).trim();
  if (!str) return "Not provided";

  const lower = str.toLowerCase();

  if (lower === "yes") return "Yes";
  if (lower === "no") return "No";
  if (lower === "mortgage") return "Mortgage";
  if (lower === "cash") return "Cash";
  if (lower === "joint") return "Joint";
  if (lower === "individual") return "Individual";
  if (lower === "company") return "Company";
  if (lower === "one") return "One owner";
  if (lower === "two") return "Two owners";
  if (lower === "more") return "More than two owners";
  if (str === "1") return "1 seller";
  if (str === "2") return "2 sellers";
  if (str === "3") return "3 or more sellers";

  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "Not provided";

  return `£${num.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const row = (label, value) => `
  <tr>
    <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;width:35%;vertical-align:top;">
      ${escapeHtml(label)}
    </td>
    <td style="padding:10px 12px;border:1px solid #d9d9d9;vertical-align:top;">
      ${escapeHtml(value)}
    </td>
  </tr>
`;

const sectionTable = (title, rows) => `
  <h3 style="margin:24px 0 10px 0;color:#0f2747;">${escapeHtml(title)}</h3>
  <table style="border-collapse:collapse;width:100%;margin-bottom:18px;">
    ${rows.join("")}
  </table>
`;

const getTransactionLabel = (type) => {
  if (type === "purchase") return "Purchase";
  if (type === "sale") return "Sale";
  if (type === "sale_purchase") return "Sale and Purchase";
  if (type === "remortgage") return "Remortgage";
  if (type === "transfer") return "Transfer of Equity";
  if (type === "remortgage_transfer") {
    return "Remortgage and Transfer of Equity";
  }
  return "Quote Request";
};


const getExistingEnquiryColumns = async (db) => {
  const result = await db.prepare(`PRAGMA table_info(enquiries)`).all();
  const rows = Array.isArray(result?.results) ? result.results : [];
  return new Set(rows.map((row) => String(row.name)));
};

const insertEnquiryRow = async (db, row) => {
  const existingColumns = await getExistingEnquiryColumns(db);
  const entries = Object.entries(row).filter(([key]) => existingColumns.has(key));

  if (entries.length === 0) {
    throw new Error("The enquiries table could not be inspected or has no matching columns.");
  }

  const columns = entries.map(([key]) => key);
  const values = entries.map(([, value]) => value);
  const placeholders = entries.map(() => "?").join(",");

  await db
    .prepare(
      `INSERT INTO enquiries (${columns.join(", ")}) VALUES (${placeholders})`
    )
    .bind(...values)
    .run();
};

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();

    const {
      name,
      email,
      phone,
      type,
      consentToPanel,

      tenure,
      price,
      postcode,

      mortgage,
      lender,
      ownershipType,
      firstTimeBuyer,
      newBuild,
      sharedOwnership,
      helpToBuy,
      isCompany,
      buyToLet,
      giftedDeposit,
      additionalProperty,
      ukResidentForSdlt,
      lifetimeIsa,
      rightToBuy,

      managementCompany,
      tenanted,
      numberOfSellers,

      currentLender,
      newLender,
      additionalBorrowing,
      remortgageTransfer,

      transferMortgage,
      ownersChanging,

      salePrice,

      purchasePrice,
      purchaseMortgage,
      purchaseLender,

      remortgageTransferPrice,
      remortgageTransferNewLender,
    } = body;

    // Lender is preferred but not required - reviewer will confirm lender eligibility

    const prettyType = getTransactionLabel(type);

    const now = new Date();
    const reference = `CQ-${now.getFullYear()}${String(
      now.getMonth() + 1
    ).padStart(2, "0")}${String(now.getDate()).padStart(
      2,
      "0"
    )}-${Math.floor(1000 + Math.random() * 9000)}`;

    const quote = buildQuoteData(body);
    const quoteJson = JSON.stringify(quote);

    const enquiryRow = {
      reference,
      client_name: name || "",
      client_email: email || "",
      client_phone: phone || "",
      transaction_type: type || "",
      consent_to_panel: consentToPanel ? "yes" : "no",

      tenure: tenure || "",
      price: price || "",
      postcode: postcode || "",

      mortgage: mortgage || "",
      lender: lender || "",
      ownership_type: ownershipType || "",
      first_time_buyer: firstTimeBuyer || "",
      new_build: newBuild || "",
      shared_ownership: sharedOwnership || "",
      help_to_buy: helpToBuy || "",
      is_company: isCompany || "",
      buy_to_let: buyToLet || "",
      gifted_deposit: giftedDeposit || "",
      additional_property: additionalProperty || "",
      uk_resident_for_sdlt: ukResidentForSdlt || "",
      lifetime_isa: lifetimeIsa || "",
      right_to_buy: rightToBuy || "",

      management_company: managementCompany || "",
      tenanted: tenanted || "",
      number_of_sellers: numberOfSellers || "",

      current_lender: currentLender || "",
      new_lender: newLender || "",
      additional_borrowing: additionalBorrowing || "",
      remortgage_transfer: remortgageTransfer || "",
      transfer_mortgage: transferMortgage || "",
      owners_changing: ownersChanging || "",

      // The 16 sale-leg and remortgage_transfer-leg columns previously
      // written here are now pure shadows of quote_json fields. Phase B
      // PR2 stops writing them; get-enquiry.js reconstructs them from
      // quote_json (with a DB-column fallback for legacy / non-public-
      // form rows). Columns are not yet dropped — that happens in a
      // later cleanup PR — they will simply be NULL on new rows. See
      // the PR2 investigation commit for the full mapping.

      status: "new",
      quote_json: JSON.stringify({ ...body, ...quote }),
    };

    await insertEnquiryRow(env.DB, enquiryRow);

    const adminUrl = `https://conveyquote.uk/admin/?ref=${encodeURIComponent(reference)}`;

    // Concise summary for the internal notification email. The full
    // breakdown is one tap away via the "Review Quote in Admin" deep link.
    let priceLabel;
    let priceValue;
    let lenderLabel;

    if (type === "sale_purchase") {
      priceLabel = "Property price";
      priceValue = `Sale ${formatMoney(salePrice)} | Purchase ${formatMoney(purchasePrice)}`;
      lenderLabel = purchaseMortgage === "mortgage" ? safe(purchaseLender) : "Cash";
    } else if (type === "remortgage") {
      priceLabel = "Property value";
      priceValue = formatMoney(price);
      lenderLabel = safe(newLender);
    } else if (type === "remortgage_transfer") {
      priceLabel = "Property value";
      priceValue = formatMoney(remortgageTransferPrice);
      lenderLabel = safe(remortgageTransferNewLender);
    } else if (type === "transfer") {
      priceLabel = "Property value";
      priceValue = formatMoney(price);
      lenderLabel = String(transferMortgage || "").toLowerCase() === "yes" ? "Mortgage on property" : "Cash";
    } else if (type === "sale") {
      priceLabel = "Property price";
      priceValue = formatMoney(price);
      lenderLabel = "—";
    } else {
      // purchase
      priceLabel = "Property price";
      priceValue = formatMoney(price);
      lenderLabel = mortgage === "mortgage" ? safe(lender) : "Cash";
    }

    const summaryRows = [
      row("Reference", reference),
      row("Client", safe(name)),
      row("Transaction type", prettyType),
      row(priceLabel, priceValue),
      row("Lender", lenderLabel),
      row("System-generated total", formatMoney(quote.grandTotal)),
    ];

    const internalHtml = `
      <html>
        <body style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f8;padding:24px;color:#10233f;">
          <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dfe5ec;">
            <div style="padding:24px 28px;background:#10233f;color:#ffffff;">
              <h2 style="margin:0 0 8px 0;">New Quote Enquiry</h2>
              <p style="margin:0;font-size:14px;">Reference: ${escapeHtml(
                reference
              )}</p>
            </div>

            <div style="padding:24px 28px;">
              ${sectionTable("Summary", summaryRows)}

              <p style="margin:18px 0 0 0;">
                <a
                  href="${escapeHtml(adminUrl)}"
                  style="display:inline-block;padding:12px 18px;background:#10233f;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;"
                >
                  Review Quote in Admin
                </a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send notification email - awaited so failures are caught and reported
    let emailSent = false;

    if (env.RESEND_API_KEY) {
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "ConveyQuote <quotes@conveyquote.uk>",
          to: ["info@conveyquote.uk"],
          reply_to: email || undefined,
          subject: `New Quote - ${prettyType} - ${reference}`,
          html: internalHtml,
        }),
      });

      const resendText = await resendResponse.text();

      if (!resendResponse.ok) {
        throw new Error(
          `Resend email failed: ${resendResponse.status} ${resendText}`
        );
      }

      emailSent = true;
    }

    // Best-effort customer confirmation email. Fires AFTER the internal
    // notification has succeeded. Failures here are logged but never bubble
    // up — the internal notification is the critical path.
    if (env.RESEND_API_KEY && email) {
      const customerName = (name && String(name).trim()) || "there";
      const customerHtml = `
        <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a;background:#f4f6f8;padding:24px;">
          <div style="max-width:700px;margin:0 auto;background:#ffffff;border:1px solid #d9e2ec;border-radius:10px;overflow:hidden;">
            <div style="text-align:center;padding:20px 24px 0 24px;">
              <img src="https://conveyquote.uk/logo.png" alt="ConveyQuote" style="width:110px;height:auto;" />
            </div>
            <div style="background:#0f2747;color:#ffffff;padding:18px 24px;margin-top:16px;">
              <h2 style="margin:0;font-size:20px;">Enquiry received</h2>
            </div>

            <div style="padding:24px;">
              <p style="margin-top:0;">Dear ${escapeHtml(customerName)},</p>

              <p>
                Thank you for your conveyancing quote enquiry. We have received
                your details and a member of our team will review them shortly.
              </p>

              <table style="border-collapse:collapse;width:100%;margin:16px 0 24px 0;">
                <tr>
                  <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;width:35%;">Reference</td>
                  <td style="padding:10px 12px;border:1px solid #d9d9d9;">${escapeHtml(
                    reference
                  )}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;">Transaction type</td>
                  <td style="padding:10px 12px;border:1px solid #d9d9d9;">${escapeHtml(
                    prettyType
                  )}</td>
                </tr>
              </table>

              <h3 style="margin:0 0 10px 0;color:#0f2747;font-size:16px;">What happens next</h3>

              <p>
                Your itemised quote will be prepared by our team and emailed to
                you within one working day. Our office hours are Monday to
                Friday, 9am to 5pm, so if you submitted this outside those
                hours your quote will arrive on the next working day.
              </p>

              <p>
                If you have any questions in the meantime, you can reply to
                this email or call us on
                <a href="tel:+447592654666" style="color:#0f2747;font-weight:600;text-decoration:none;">07592 654 666</a>.
                We are happy to discuss your proposed transaction and answer
                anything before your quote arrives.
              </p>

              <p style="margin-bottom:0;">
                Kind regards,<br>
                The ConveyQuote team
              </p>
            </div>

            <div style="padding:16px 24px;border-top:1px solid #d9e2ec;background:#f7f9fb;color:#6b7280;font-size:12px;line-height:1.6;">
              ConveyQuote is a trading name of Essentially Law Limited
              (Company No. 14625839). We are not a firm of solicitors. Legal
              services are provided by independent SRA-regulated firms.
            </div>
          </div>
        </div>
      `;

      try {
        const customerResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "ConveyQuote <quotes@conveyquote.uk>",
            to: [email],
            reply_to: "info@conveyquote.uk",
            subject: `We've received your conveyancing enquiry — ${reference}`,
            html: customerHtml,
          }),
        });

        if (!customerResponse.ok) {
          const errText = await customerResponse.text();
          console.error(
            `Customer confirmation email failed for ${reference}: ${customerResponse.status} ${errText}`
          );
        }
      } catch (customerEmailError) {
        console.error(
          `Customer confirmation email threw for ${reference}:`,
          customerEmailError
        );
      }
    }

    // NOTE: The automatic client-facing QUOTE email has been intentionally
    // removed. Clients should only receive a priced quote after an admin has
    // reviewed and approved it via the admin panel using
    // send-approved-quote.js. The confirmation email above only acknowledges
    // receipt — it does not contain pricing.

    return jsonResponse({
      success: true,
      reference,
      quote,
      emailSent,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : "";
    return jsonResponse(
      {
        success: false,
        error: message,
        detail: stack?.slice(0, 300),
      },
      500
    );
  }
}
