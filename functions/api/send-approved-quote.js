export async function onRequestPost(context) {
  const jsonResponse = (payload, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  try {
    const { request, env } = context;
    const body = await request.json();

    const {
      name,
      email,
      type,
      tenure,
      price,
      quoteAmount,
      quoteReference,
      feeBreakdown,
      nextSteps,
      quoteData,
    } = body;

    if (!email) {
      return jsonResponse(
        { success: false, error: "Client email is missing." },
        400
      );
    }

    if (!quoteReference) {
      return jsonResponse(
        { success: false, error: "Quote reference is missing." },
        400
      );
    }

    const prettyType =
      type === "purchase"
        ? "Purchase"
        : type === "sale"
        ? "Sale"
        : type === "sale_purchase"
        ? "Sale & Purchase"
        : type === "remortgage"
        ? "Remortgage"
        : type === "remortgage_transfer"
        ? "Remortgage & Transfer of Equity"
        : type === "transfer"
        ? "Transfer of Equity"
        : "Conveyancing Matter";

    const safe = (value) =>
      value === null || value === undefined ? "" : String(value);

    const escapeHtml = (value) =>
      safe(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const formatMultilineHtml = (value) =>
      escapeHtml(value).replace(/\n/g, "<br />").replace(/  /g, "&nbsp;&nbsp;");

    const cleanMoney = (value) =>
      safe(value)
        .replace(/£/g, "")
        .replace(/,/g, "")
        .trim();

    const formatMoney = (value) => {
      const number = Number(value || 0);
      if (Number.isNaN(number)) return "0.00";
      return number.toLocaleString("en-GB", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    const formatDisplayMoney = (value) => {
      const cleaned = cleanMoney(value);
      if (!cleaned) return "";
      const number = Number(cleaned);
      if (Number.isNaN(number)) return cleaned;
      return formatMoney(number);
    };

    const sumItems = (items = []) =>
      items.reduce((total, item) => total + Number(item.amount || 0), 0);

    const row = (label, value) => `
      <tr>
        <td style="padding:10px 12px;border:1px solid #d9d9d9;background:#f7f7f7;font-weight:bold;width:35%;vertical-align:top;">
          ${escapeHtml(label)}
        </td>
        <td style="padding:10px 12px;border:1px solid #d9d9d9;vertical-align:top;">
          ${value}
        </td>
      </tr>
    `;

    const sectionTable = (title, rows) => `
      <div style="margin-bottom:24px;">
        <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f2747;">${escapeHtml(
          title
        )}</h2>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
          ${rows.join("")}
        </table>
      </div>
    `;

    const buildRowsHtml = (items = []) =>
      items
        .map((item, index) => {
          const isLast = index === items.length - 1;
          const isBold = Boolean(item.isTotal);

          return `
            <tr>
              <td style="
                padding:12px 0;
                border-bottom:${isLast ? "0" : "1px solid #eef2f7"};
                font-size:14px;
                color:${isBold ? "#0f2747" : "#374151"};
                font-weight:${isBold ? "700" : "500"};
              ">
                ${escapeHtml(item.label)}
              </td>
              <td style="
                padding:12px 0;
                border-bottom:${isLast ? "0" : "1px solid #eef2f7"};
                font-size:14px;
                color:${isBold ? "#0f2747" : "#111827"};
                font-weight:${isBold ? "700" : "600"};
                text-align:right;
                white-space:nowrap;
              ">
                £${escapeHtml(formatMoney(item.amount || 0))}
              </td>
            </tr>
          `;
        })
        .join("");

    const legalFees = Array.isArray(quoteData?.legalFees)
      ? quoteData.legalFees
      : [];

    const disbursements = Array.isArray(quoteData?.disbursements)
      ? quoteData.disbursements
      : [];

    const vatAmount = Number(quoteData?.vat || 0);
    const sdltAmount =
      typeof quoteData?.sdltAmount === "number"
        ? Number(quoteData.sdltAmount)
        : null;
    const sdltNote =
      quoteData?.sdltNote !== null && quoteData?.sdltNote !== undefined
        ? String(quoteData.sdltNote)
        : "";
    const totalIncludingSdlt =
      typeof quoteData?.totalIncludingSdlt === "number"
        ? Number(quoteData.totalIncludingSdlt)
        : null;

    const legalFeesSubtotal = sumItems(legalFees);
    const legalFeesTotal = legalFeesSubtotal + vatAmount;
    const disbursementTotal = sumItems(disbursements);
    const calculatedGrandTotal = legalFeesTotal + disbursementTotal;

    const finalQuoteAmountValue =
      quoteAmount && !Number.isNaN(Number(cleanMoney(quoteAmount)))
        ? Number(cleanMoney(quoteAmount))
        : totalIncludingSdlt !== null
        ? totalIncludingSdlt
        : calculatedGrandTotal;

    const displayQuoteAmount = formatMoney(finalQuoteAmountValue);
    const displayPrice = formatDisplayMoney(price);

    const legalFeeRows = [
      ...legalFees,
      ...(vatAmount > 0 ? [{ label: "VAT", amount: vatAmount }] : []),
      ...(legalFees.length > 0 || vatAmount > 0
        ? [
            {
              label: "Total legal fees including VAT",
              amount: legalFeesTotal,
              isTotal: true,
            },
          ]
        : []),
    ];

    const disbursementRows = [
      ...disbursements,
      ...(disbursements.length > 0
        ? [
            {
              label: "Total disbursements",
              amount: disbursementTotal,
              isTotal: true,
            },
          ]
        : []),
    ];

    const totalRows = [
      {
        label: "Legal fees and disbursements",
        amount: calculatedGrandTotal,
      },
      ...(sdltAmount !== null
        ? [
            {
              label: "Estimated SDLT",
              amount: sdltAmount,
            },
          ]
        : []),
      {
        label: "Total Estimated Cost",
        amount: finalQuoteAmountValue,
        isTotal: true,
      },
    ];

    const acceptUrl = `https://conveyquote.uk/api/accept-quote?ref=${encodeURIComponent(
      safe(quoteReference)
    )}`;

    const rejectUrl = `https://conveyquote.uk/api/reject-quote?ref=${encodeURIComponent(
      safe(quoteReference)
    )}`;

    const formattedNextSteps = formatMultilineHtml(
      nextSteps ||
        "If you would like to proceed, please click Accept Quote below. Once we receive your instruction, we will move your matter to the next stage, which may include referral to one of our selected panel solicitor firms. If you do not wish to proceed, you may click Decline Quote. If you have any questions before deciding, please contact us at info@conveyquote.uk."
    );

    const logoUrl = "https://conveyquote.uk/logo.png";

    const legalFeesHtml =
      legalFeeRows.length > 0
        ? `
          <tr>
            <td style="padding:0 28px 0 28px;">
              <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f2747;">Legal Fees</h2>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:24px;">
                ${buildRowsHtml(legalFeeRows)}
              </table>
            </td>
          </tr>
        `
        : "";

    const disbursementsHtml =
      disbursementRows.length > 0
        ? `
          <tr>
            <td style="padding:0 28px 0 28px;">
              <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f2747;">Disbursements</h2>
              <div style="font-size:13px;line-height:1.7;color:#6b7280;margin:0 0 12px 0;">
                Third-party costs payable during the transaction.
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:24px;">
                ${buildRowsHtml(disbursementRows)}
              </table>
            </td>
          </tr>
        `
        : "";

    const totalEstimatedHtml = `
      <tr>
        <td style="padding:0 28px 24px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#f8fafc;border:1px solid #d9e2ec;">
            <tr>
              <td style="padding:18px 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  ${buildRowsHtml(totalRows)}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;

    const sdltReviewHtml =
      sdltAmount === null && sdltNote
        ? `
          <tr>
            <td style="padding:0 28px 24px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#fff8e6;border:1px solid #e2c275;">
                <tr>
                  <td style="padding:14px 16px;font-size:14px;line-height:1.7;color:#7a4b00;">
                    <strong>SDLT</strong><br />
                    ${escapeHtml(sdltNote)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `
        : "";

    const fallbackBreakdownHtml =
      !legalFeesHtml && !disbursementsHtml && feeBreakdown
        ? `
          <tr>
            <td style="padding:0 28px 24px 28px;">
              <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f2747;">Estimated Costs Breakdown</h2>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#fafbfc;border:1px solid #e5e7eb;">
                <tr>
                  <td style="padding:18px 20px;font-size:14px;line-height:1.8;color:#374151;">
                    ${formatMultilineHtml(feeBreakdown)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `
        : "";

    let transactionSummaryHtml = "";

    if (type === "sale_purchase") {
      const parts = safe(price)
        .split("|")
        .map((part) => part.trim());
      const salePart = parts[0] || "";
      const purchasePart = parts[1] || "";

      transactionSummaryHtml = sectionTable("Transaction Summary", [
        row("Type", escapeHtml(prettyType)),
        row("Sale summary", escapeHtml(salePart || "Not provided")),
        row("Purchase summary", escapeHtml(purchasePart || "Not provided")),
        row("Tenure summary", escapeHtml(tenure || "Not provided")),
      ]);
    } else if (type === "remortgage_transfer") {
      transactionSummaryHtml = sectionTable("Transaction Summary", [
        row("Type", escapeHtml(prettyType)),
        row("Property / value", `£${escapeHtml(displayPrice || "0.00")}`),
        row("Tenure", escapeHtml(tenure || "Not provided")),
      ]);
    } else {
      transactionSummaryHtml = sectionTable("Transaction Summary", [
        row("Type", escapeHtml(prettyType)),
        row("Tenure", escapeHtml(tenure || "Not provided")),
        row(
          "Property Price / Value",
          `£${escapeHtml(displayPrice || "0.00")}`
        ),
      ]);
    }

    const clientHtml = `
      <html>
        <body style="margin:0;padding:0;background:#f2f4f7;font-family:Arial,Helvetica,sans-serif;color:#222;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f2f4f7;">
            <tr>
              <td align="center" style="padding:24px 12px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="760" style="max-width:760px;width:100%;border-collapse:collapse;">

                  <tr>
                    <td align="center" style="padding:0 0 12px 0;">
                      <img
                        src="${logoUrl}"
                        alt="ConveyQuote"
                        width="120"
                        style="display:block;width:120px;max-width:120px;height:auto;border:0;margin:0 auto;"
                      />
                    </td>
                  </tr>

                  <tr>
                    <td style="background:#ffffff;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">

                        <tr>
                          <td style="background:#0f2747;padding:24px 28px;color:#ffffff;">
                            <div style="font-size:12px;letter-spacing:0.5px;text-transform:uppercase;opacity:0.85;">
                              ConveyQuote
                            </div>
                            <div style="font-size:30px;line-height:1.2;font-weight:bold;margin-top:8px;">
                              Your Conveyancing Estimate
                            </div>
                            <div style="font-size:15px;line-height:1.6;margin-top:10px;opacity:0.95;">
                              A reviewed estimate prepared from the information currently available for your proposed transaction.
                            </div>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:28px;">
                            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#222;">
                              Dear ${escapeHtml(name)},
                            </p>
                            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#4b5563;">
                              Thank you for your enquiry. We have reviewed the information provided and set out our current conveyancing estimate below in a clear and straightforward format.
                            </p>
                            <p style="margin:0;font-size:15px;line-height:1.7;color:#4b5563;">
                              This estimate is based on the information currently available. If further information comes to light, or the matter proves more complex than initially anticipated, we will discuss any change to costs with you before carrying out that additional work.
                            </p>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:0 28px 20px 28px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#f8fafc;border:1px solid #d9e2ec;">
                              <tr>
                                <td style="padding:18px 20px;text-align:center;">
                                  <div style="font-size:13px;text-transform:uppercase;letter-spacing:0.4px;color:#486581;margin-bottom:8px;">
                                    Estimated Total Cost
                                  </div>
                                  <div style="font-size:34px;font-weight:bold;color:#0f2747;">
                                    £${escapeHtml(displayQuoteAmount)}
                                  </div>
                                  <div style="font-size:14px;color:#52606d;margin-top:8px;line-height:1.8;">
                                    ${
                                      sdltAmount !== null
                                        ? "Including VAT, disbursements and estimated SDLT"
                                        : "Including VAT and disbursements"
                                    }
                                  </div>
                                  <div style="font-size:14px;color:#52606d;margin-top:6px;line-height:1.8;">
                                    Reference: <strong>${escapeHtml(
                                      quoteReference
                                    )}</strong>
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:0 28px 0 28px;">
                            ${transactionSummaryHtml}
                          </td>
                        </tr>

                        ${legalFeesHtml}
                        ${disbursementsHtml}
                        ${totalEstimatedHtml}
                        ${sdltReviewHtml}
                        ${fallbackBreakdownHtml}

                        <tr>
                          <td style="padding:0 28px 24px 28px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#eef6ff;border:1px solid #c9dcef;">
                              <tr>
                                <td style="padding:14px 16px;font-size:14px;line-height:1.7;color:#24446b;">
                                  <strong>How your matter may proceed</strong><br />
                                  If you would like to move forward, we will take your matter to the next stage of onboarding. This may include referral to one of our selected panel solicitor firms, depending on the type of transaction, lender requirements and panel availability.
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:0 28px 24px 28px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#fff8e6;border:1px solid #e2c275;">
                              <tr>
                                <td style="padding:14px 16px;font-size:14px;line-height:1.7;color:#7a4b00;">
                                  <strong>Important Information</strong><br />
                                  This estimate is based on the information currently available. If further information comes to light or the matter involves additional complexity, we will discuss any change to costs with you before proceeding with that work.
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:0 28px 0 28px;">
                            <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f2747;">Next Steps</h2>
                            <div style="font-size:14px;line-height:1.8;color:#4b5563;">
                              ${formattedNextSteps}
                            </div>
                          </td>
                        </tr>

                        <tr>
                          <td align="center" style="padding:28px 28px 12px 28px;">
                            <a
                              href="${acceptUrl}"
                              style="display:inline-block;background:#0f2747;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:bold;margin:0 8px 12px 8px;"
                            >
                              Accept Quote
                            </a>
                            <a
                              href="${rejectUrl}"
                              style="display:inline-block;background:#ffffff;color:#0f2747;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:bold;border:1px solid #0f2747;margin:0 8px 12px 8px;"
                            >
                              Decline Quote
                            </a>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:0 28px 28px 28px;">
                            <div style="font-size:14px;line-height:1.8;color:#4b5563;text-align:center;">
                              If you have any questions before deciding, please contact us at
                              <a href="mailto:info@conveyquote.uk" style="color:#0f2747;text-decoration:none;font-weight:600;">info@conveyquote.uk</a>.
                            </div>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.7;color:#6b7280;text-align:center;">
                            This estimate is provided for information only and does not create a solicitor-client retainer until you are formally onboarded and we confirm instructions.
                          </td>
                        </tr>

                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:18px 10px 0 10px;text-align:center;font-size:12px;line-height:1.7;color:#6b7280;">
                      ConveyQuote · <a href="mailto:info@conveyquote.uk" style="color:#0f2747;text-decoration:none;">info@conveyquote.uk</a>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ConveyQuote <quotes@conveyquote.uk>",
        to: [email],
        cc: ["info@conveyquote.uk"],
        reply_to: "info@conveyquote.uk",
        subject: `Your Conveyancing Quote - ${safe(quoteReference)}`,
        html: clientHtml,
      }),
    });

    const data = await resendResponse.json();

    if (!resendResponse.ok) {
      return jsonResponse({ success: false, data }, 500);
    }

    await env.DB.prepare(
      `UPDATE enquiries SET status = 'quote_sent' WHERE reference = ?`
    )
      .bind(quoteReference)
      .run();

    return jsonResponse({ success: true, data });
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
