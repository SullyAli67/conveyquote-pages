export async function onRequestPost(context) {
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

    const jsonResponse = (payload, status = 200) =>
      new Response(JSON.stringify(payload), {
        status,
        headers: { "Content-Type": "application/json" },
      });

    const prettyType =
      type === "purchase"
        ? "Purchase"
        : type === "sale"
        ? "Sale"
        : type === "remortgage"
        ? "Remortgage"
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
      escapeHtml(value)
        .replace(/\n/g, "<br />")
        .replace(/  /g, "&nbsp;&nbsp;");

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

    const parseFeeBreakdownFallback = (text) => {
      const lines = safe(text)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const sections = {
        legalFees: [],
        disbursements: [],
        totalEstimatedCost: null,
      };

      let currentSection = "legalFees";

      for (const line of lines) {
        const upper = line.toUpperCase();

        if (upper === "LEGAL FEES") {
          currentSection = "legalFees";
          continue;
        }

        if (upper === "DISBURSEMENTS") {
          currentSection = "disbursements";
          continue;
        }

        if (upper === "TOTAL ESTIMATED COST") {
          currentSection = "total";
          continue;
        }

        const colonIndex = line.indexOf(":");
        if (colonIndex === -1) continue;

        const label = line.slice(0, colonIndex).trim();
        const rawValue = line.slice(colonIndex + 1).trim();
        const amount = Number(cleanMoney(rawValue) || 0);

        if (/total estimated cost/i.test(label) || currentSection === "total") {
          sections.totalEstimatedCost = amount;
          continue;
        }

        if (currentSection === "disbursements") {
          sections.disbursements.push({
            label,
            amount,
            isTotal: /total/i.test(label),
          });
        } else {
          sections.legalFees.push({
            label,
            amount,
            isTotal: /total/i.test(label),
          });
        }
      }

      return sections;
    };

    const defaultQuoteData = {
      legalFees: [],
      disbursements: [],
      vat: 0,
    };

    let finalQuoteData = {
      ...defaultQuoteData,
      ...(quoteData || {}),
    };

    let derivedQuoteAmount = quoteAmount;

    const hasStructuredQuoteData =
      quoteData &&
      (Array.isArray(quoteData.legalFees) ||
        Array.isArray(quoteData.disbursements) ||
        quoteData.vat !== undefined);

    if (!hasStructuredQuoteData && feeBreakdown) {
      const parsed = parseFeeBreakdownFallback(feeBreakdown);

      const legalFeesWithoutVatOrTotal = parsed.legalFees.filter(
        (item) =>
          !/^(vat|total legal fees including vat)$/i.test(item.label || "")
      );

      const vatRow = parsed.legalFees.find((item) =>
        /^vat$/i.test(item.label || "")
      );

      const totalLegalFeesRow = parsed.legalFees.find((item) =>
        /^total legal fees including vat$/i.test(item.label || "")
      );

      const disbursementsWithoutTotal = parsed.disbursements.filter(
        (item) => !/^total disbursements$/i.test(item.label || "")
      );

      finalQuoteData = {
        legalFees: legalFeesWithoutVatOrTotal,
        disbursements: disbursementsWithoutTotal,
        vat: vatRow ? Number(vatRow.amount || 0) : 0,
      };

      if (!derivedQuoteAmount && parsed.totalEstimatedCost !== null) {
        derivedQuoteAmount = String(parsed.totalEstimatedCost);
      }

      if (!derivedQuoteAmount && totalLegalFeesRow) {
        const derivedTotal =
          Number(totalLegalFeesRow.amount || 0) +
          sumItems(disbursementsWithoutTotal);
        derivedQuoteAmount = String(derivedTotal);
      }
    }

    const legalFees = Array.isArray(finalQuoteData.legalFees)
      ? finalQuoteData.legalFees
      : [];

    const disbursements = Array.isArray(finalQuoteData.disbursements)
      ? finalQuoteData.disbursements
      : [];

    const vatAmount = Number(finalQuoteData.vat || 0);

    const legalFeesSubtotal = sumItems(legalFees);
    const legalFeesTotal = legalFeesSubtotal + vatAmount;
    const disbursementTotal = sumItems(disbursements);
    const calculatedGrandTotal = legalFeesTotal + disbursementTotal;

    const finalQuoteAmountValue =
      derivedQuoteAmount && !Number.isNaN(Number(cleanMoney(derivedQuoteAmount)))
        ? Number(cleanMoney(derivedQuoteAmount))
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

    const totalEstimatedRows = [
      {
        label: "Total Estimated Cost",
        amount: finalQuoteAmountValue,
        isTotal: true,
      },
    ];

    const acceptUrl = `https://conveyquote.uk/api/accept-quote?ref=${encodeURIComponent(
      safe(quoteReference)
    )}`;

    const formattedNextSteps = formatMultilineHtml(
      nextSteps ||
        "If you would like us to proceed, please click the button below. Once we receive your instruction, we will contact you with the next steps and client care documentation."
    );

    const logoUrl = "https://conveyquote.uk/logo.png";

    const legalFeesHtml =
      legalFeeRows.length > 0
        ? `
          <div style="margin-top:24px;">
            <h2 style="margin:0 0 14px 0;font-size:19px;color:#0f2747;letter-spacing:0.2px;">;">Legal Fees</h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              ${buildRowsHtml(legalFeeRows)}
            </table>
          </div>
        `
        : "";

    const disbursementsHtml =
      disbursementRows.length > 0
        ? `
          <div style="margin-top:24px;">
            <h2 style="margin:0 0 8px 0;font-size:18px;color:#0f2747;">Disbursements</h2>
            <div style="font-size:13px;line-height:1.7;color:#6b7280;margin-bottom:12px;">
              Third-party costs payable during the transaction.
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              ${buildRowsHtml(disbursementRows)}
            </table>
          </div>
        `
        : "";

    const totalEstimatedHtml = `
      <div style="margin-top:26px;background:#f8fbff;border:1px solid #dbe6f0;border-radius:12px;padding:18px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${buildRowsHtml(totalEstimatedRows)}
        </table>
      </div>
    `;

    const fallbackBreakdownHtml =
      !legalFeesHtml && !disbursementsHtml && feeBreakdown
        ? `
          <div style="margin-top:24px;">
            <h2 style="margin:0 0 14px 0;font-size:19px;color:#0f2747;letter-spacing:0.2px;">;">Estimated Costs Breakdown</h2>
            <div style="background:#fafbfc;border:1px solid #e5e7eb;border-radius:12px;padding:18px 20px;font-size:14px;line-height:1.8;color:#374151;">
              ${formatMultilineHtml(feeBreakdown)}
            </div>
          </div>
        `
        : "";

    const clientHtml = `
      <html>
        <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;margin:0;padding:0;">
            <tr>
              <td align="center" style="padding:32px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;width:100%;">
                  
                 <tr>
  <td align="center" style="padding:0 0 18px 0;">
    <img
      src="${logoUrl}"
      alt="ConveyQuote"
      width="180"
      style="display:block;height:auto;border:0;"
    />
  </td>
</tr>

<tr>
  <td style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 4px 14px rgba(15,39,71,0.06);">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:linear-gradient(135deg, #0f2747 0%, #163760 100%);padding:30px 32px 24px 32px;color:#ffffff;">
          <div style="font-size:12px;letter-spacing:1.2px;text-transform:uppercase;opacity:0.82;">
            ConveyQuote
          </div>
          <div style="font-size:28px;line-height:1.2;font-weight:700;margin-top:8px;">
            Your Conveyancing Estimate
          </div>
          <div style="font-size:15px;line-height:1.6;margin-top:10px;opacity:0.95;max-width:560px;">
            A clear estimate prepared from the information currently available for your proposed transaction.
          </div>
        </td>
      </tr>
                            <div style="font-size:12px;letter-spacing:1.2px;text-transform:uppercase;opacity:0.85;">
                              ConveyQuote
                            </div>
                            <div style="font-size:30px;line-height:1.2;font-weight:700;margin-top:8px;">
                              Your Conveyancing Estimate
                            </div>
                            <div style="font-size:15px;line-height:1.6;margin-top:12px;opacity:0.95;">
                              A clear estimate prepared from the information currently available for your proposed transaction.
                            </div>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:32px 32px 8px 32px;">
                            <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1f2937;">
                              Dear ${escapeHtml(name)},
                            </p>
                            <p style="margin:0;font-size:15px;line-height:1.7;color:#4b5563;">
                              Thank you for your enquiry. We have reviewed the information provided and set out our current estimate below in a clear and straightforward format.
                            </p>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:24px 32px 8px 32px;">
                            <div style="background:linear-gradient(180deg, #f8fbff 0%, #f3f8fc 100%);border:1px solid #dbe6f0;border-radius:14px;padding:26px 24px;text-align:center;">
                              <div style="font-size:13px;letter-spacing:0.3px;text-transform:uppercase;color:#5b7083;">
                                Estimated Total Cost
                              </div>
                              <div style="font-size:38px;line-height:1.15;font-weight:700;color:#0f2747;margin-top:8px;">
                                £${escapeHtml(displayQuoteAmount)}
                              </div>
                              <div style="font-size:14px;line-height:1.6;color:#6b7280;margin-top:8px;">
                                Including VAT and disbursements
                              </div>
                              <div style="font-size:14px;line-height:1.6;color:#374151;margin-top:10px;">
                                Reference: <strong>${escapeHtml(quoteReference)}</strong>
                              </div>
                            </div>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:24px 32px 8px 32px;">
                            <h2 style="margin:0 0 14px 0;font-size:19px;color:#0f2747;letter-spacing:0.2px;">;">Transaction Summary</h2>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                              <tr>
                                <td style="padding:10px 0;border-bottom:1px solid #eef2f7;font-size:14px;color:#6b7280;width:38%;">Type</td>
                                <td style="padding:10px 0;border-bottom:1px solid #eef2f7;font-size:14px;color:#111827;font-weight:600;">${escapeHtml(
                                  prettyType
                                )}</td>
                              </tr>
                              <tr>
                                <td style="padding:10px 0;border-bottom:1px solid #eef2f7;font-size:14px;color:#6b7280;">Tenure</td>
                                <td style="padding:10px 0;border-bottom:1px solid #eef2f7;font-size:14px;color:#111827;font-weight:600;">${escapeHtml(
                                  tenure
                                )}</td>
                              </tr>
                              <tr>
                                <td style="padding:10px 0;font-size:14px;color:#6b7280;">Property Price / Value</td>
                                <td style="padding:10px 0;font-size:14px;color:#111827;font-weight:600;">£${escapeHtml(
                                  displayPrice
                                )}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:24px 32px 8px 32px;">
                            ${legalFeesHtml}
                            ${disbursementsHtml}
                            ${totalEstimatedHtml}
                            ${fallbackBreakdownHtml}
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:24px 32px 8px 32px;">
                            <div style="background:#fffaf0;border:1px solid #ead8a6;border-radius:12px;padding:18px 20px;">
                              <div style="font-size:16px;font-weight:700;color:#0f2747;margin-bottom:8px;">
                                Important Information
                              </div>
                              <div style="font-size:14px;line-height:1.7;color:#4b5563;">
                                This estimate is based on the information currently available. If further information comes to light or the matter involves additional complexity, we will discuss any change to costs with you before proceeding with that work.
                              </div>
                            </div>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:24px 32px 8px 32px;">
                            <h2 style="margin:0 0 14px 0;font-size:19px;color:#0f2747;letter-spacing:0.2px;">;">Next Steps</h2>
                            <div style="font-size:14px;line-height:1.8;color:#4b5563;">
                              ${formattedNextSteps}
                            </div>
                          </td>
                        </tr>

                        <tr>
                          <td align="center" style="padding:28px 32px 18px 32px;">
                          <a
  href="${acceptUrl}"
  style="display:inline-block;background:linear-gradient(135deg, #0f2747 0%, #163760 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:15px 30px;border-radius:10px;letter-spacing:0.2px;box-shadow:0 6px 14px rgba(15,39,71,0.18);"
>
  Instruct Us
</a>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:0 32px 28px 32px;">
                            <div style="font-size:14px;line-height:1.8;color:#4b5563;text-align:center;">
                              If you have any questions, please contact us at
                              <a href="mailto:info@conveyquote.uk" style="color:#0f2747;text-decoration:none;font-weight:600;">info@conveyquote.uk</a>.
                            </div>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.7;color:#6b7280;text-align:center;">
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

    if (quoteReference) {
      await env.DB.prepare(
        `UPDATE enquiries SET status = 'quote_sent' WHERE reference = ?`
      )
        .bind(quoteReference)
        .run();
    }

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
