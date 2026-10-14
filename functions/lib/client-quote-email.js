// functions/lib/client-quote-email.js
//
// Builds the quote email a client receives. Moved unchanged out of
// send-approved-quote.js so the referrer portal's "Your branding" tab
// (referrer-email-preview.js) shows the real email, not a copy. Pure: no
// database and no sending.
//
// body:  the Send Approved Quote request body.
// opts:  unsubUrl — the reminder opt-out link.
//        linkToken — the signed code for the Accept / Decline links
//                   (functions/lib/quote-link.js).
//        brand    — { name, logoUrl } when the referrer has a logo
//                   (migration 0023): the email then leads with their logo
//                   and says "Powered by ConveyQuote".

import {
  getSpecialistMatterLabel,
  isSpecialistMatterType,
} from "./matter-families.js";

export function buildClientQuoteEmail(body, { unsubUrl = "", brand = null, linkToken = "" } = {}) {
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
    additionalNotes,
    quoteData,
  } = body;
  void email;

  // The body below keeps its original indentation from send-approved-quote.js
  // so the email's HTML is byte-for-byte unchanged.
    const prettyType =
      getSpecialistMatterLabel(type) ||
      (type === "purchase"
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
        : "Conveyancing Matter");

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

    const formatMoneyWithSign = (value) => {
      const number = Number(value || 0);
      if (!Number.isFinite(number)) return "£0.00";
      if (number < 0) return `−£${formatMoney(Math.abs(number))}`;
      return `£${formatMoney(number)}`;
    };

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
                ${escapeHtml(formatMoneyWithSign(item.amount || 0))}
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

    // Manual adjustment applied flat against the grand total AFTER VAT.
    // It does NOT enter the VAT base. Treated as no-op when amount is 0.
    const rawAdjustment = quoteData?.manualAdjustment;
    const adjustment =
      rawAdjustment &&
      Number.isFinite(Number(rawAdjustment.amount)) &&
      Number(rawAdjustment.amount) !== 0
        ? {
            amount: Number(rawAdjustment.amount),
            reason: String(rawAdjustment.reason || ""),
          }
        : null;
    const adjustmentAmount = adjustment ? adjustment.amount : 0;
    const adjustmentLabel = adjustment
      ? adjustment.amount < 0
        ? "Discount"
        : "Adjustment"
      : "";

    const calculatedGrandTotal =
      legalFeesTotal + disbursementTotal + adjustmentAmount;

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
        amount: legalFeesTotal + disbursementTotal,
      },
      ...(adjustment
        ? [
            {
              label: adjustment.reason
                ? `${adjustmentLabel} – ${adjustment.reason}`
                : adjustmentLabel,
              amount: adjustment.amount,
            },
          ]
        : []),
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

    const linkCode = linkToken ? `&t=${encodeURIComponent(linkToken)}` : "";
    const acceptUrl = `https://conveyquote.uk/api/accept-quote?ref=${encodeURIComponent(
      safe(quoteReference)
    )}${linkCode}`;

    const rejectUrl = `https://conveyquote.uk/api/reject-quote?ref=${encodeURIComponent(
      safe(quoteReference)
    )}${linkCode}`;

    // Quote expiry — 14 days from today
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 14);
    const expiryFormatted = expiryDate.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Book a call — passes client name, email and quote reference so the form pre-fills
    const bookACallUrl = `https://conveyquote.uk/book-call?ref=${encodeURIComponent(safe(quoteReference))}&name=${encodeURIComponent(safe(name))}&email=${encodeURIComponent(safe(email))}`;
    const feesGuideUrl = "https://conveyquote.uk/conveyancing-fees/";

    const formattedNextSteps = formatMultilineHtml(
      nextSteps ||
        "If you would like to proceed, please click Accept Quote below. Once we receive your instruction, we will open your file and allocate your matter to an SRA-regulated panel firm within one working day. If you have any questions before deciding, please reply to this email or call us on 07592 654 666."
    );

    const trimmedAdditionalNotes = String(additionalNotes || "").trim();
    const additionalNotesHtml = trimmedAdditionalNotes
      ? `
          <tr>
            <td style="padding:0 28px 24px 28px;">
              <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f2747;">Additional Notes</h2>
              <div style="font-size:14px;line-height:1.7;color:#4b5563;">
                ${formatMultilineHtml(trimmedAdditionalNotes)}
              </div>
            </td>
          </tr>
        `
      : "";

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
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#fff8e6;border:1px solid #d8e0ea;">
                <tr>
                  <td style="padding:14px 16px;font-size:14px;line-height:1.7;color:#062a63;">
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
    } else if (isSpecialistMatterType(type)) {
      // A lease extension has no consideration figure to report. The
      // unexpired term is what matters — it drives both the premium and
      // the urgency of serving notice.
      // quote_json is built as { ...body, ...quote }, so the raw form
      // answers travel alongside the computed quote and unexpiredTermYears
      // is present here. There is no `enquiry` binding in this scope.
      const termYears = safe(quoteData?.unexpiredTermYears);
      transactionSummaryHtml = sectionTable("Matter Summary", [
        row("Type", escapeHtml(prettyType)),
        row(
          "Statutory basis",
          escapeHtml(quoteData?.statutoryBasis || "Not provided")
        ),
        row(
          "Unexpired term of lease",
          termYears ? `${escapeHtml(termYears)} years` : "Not provided"
        ),
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

    // ── Enfranchisement-only email blocks ─────────────────────────
    //
    // On a lease extension the largest sums involved are NOT our fees.
    // These blocks are rendered after the fee table, styled distinctly,
    // and state plainly that the amounts are estimates outside our
    // control. An email that showed only the fee total would leave a
    // client believing a £1,440 quote was the cost of their claim.
    let enfranchisementBlocksHtml = "";
    if (isSpecialistMatterType(type)) {
      const formatEstimate = (low, high) => {
        if (low == null && high == null) return "A valuation is required";
        if (low === high) return `£${Number(low).toFixed(2)} (estimate)`;
        return `£${Number(low).toFixed(2)} – £${Number(high).toFixed(2)} (estimate)`;
      };

      const thirdPartyCosts = Array.isArray(quoteData?.thirdPartyCosts)
        ? quoteData.thirdPartyCosts
        : [];

      if (thirdPartyCosts.length > 0) {
        const costRows = thirdPartyCosts
          .map(
            (cost) => `
              <tr>
                <td style="padding:10px 12px;border:1px solid #d8e0ea;background:#f7f9fc;vertical-align:top;">
                  <strong>${escapeHtml(cost.label)}</strong>
                  <div style="font-size:12px;color:#062a63;margin-top:4px;line-height:1.6;">
                    ${escapeHtml(cost.note || "")}
                    ${
                      cost.statutoryRef
                        ? `<br /><em>${escapeHtml(cost.statutoryRef)}</em>`
                        : ""
                    }
                    ${
                      cost.survivesWithdrawalNote
                        ? `<br /><strong>${escapeHtml(cost.survivesWithdrawalNote)}</strong>`
                        : ""
                    }
                  </div>
                </td>
                <td style="padding:10px 12px;border:1px solid #d8e0ea;background:#f7f9fc;text-align:right;white-space:nowrap;vertical-align:top;">
                  ${escapeHtml(formatEstimate(cost.amountLow, cost.amountHigh))}
                </td>
              </tr>`
          )
          .join("");

        const indicative = quoteData?.indicativeTotalExcludingPremium;
        const indicativeRow = indicative
          ? `
              <tr>
                <td style="padding:12px;border:1px solid #d8e0ea;background:#eef2f7;font-weight:bold;color:#062a63;">
                  Indicative total, EXCLUDING the premium
                </td>
                <td style="padding:12px;border:1px solid #d8e0ea;background:#eef2f7;text-align:right;font-weight:bold;color:#062a63;white-space:nowrap;">
                  £${Number(indicative.low).toFixed(2)} – £${Number(indicative.high).toFixed(2)}
                </td>
              </tr>`
          : "";

        enfranchisementBlocksHtml += `
          <tr>
            <td style="padding:0 28px 24px 28px;">
              <h3 style="margin:24px 0 6px 0;color:#062a63;">Not included — payable by you to others</h3>
              <p style="margin:0 0 12px 0;font-size:13px;line-height:1.7;color:#062a63;">
                <strong>The amounts below are not our fees. We do not set them, we do not
                control them and we do not receive them. The figures shown are estimates
                only and the actual amounts may be higher or lower.</strong>
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;font-size:14px;">
                ${costRows}
                ${indicativeRow}
              </table>
            </td>
          </tr>`;
      }

      const policy = quoteData?.abortivePolicy;
      if (policy) {
        const conditions = (policy.faultConditions || [])
          .map((cond) => `<li style="margin-bottom:4px;">${escapeHtml(cond)}</li>`)
          .join("");
        enfranchisementBlocksHtml += `
          <tr>
            <td style="padding:0 28px 24px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#eef6ff;border:1px solid #c9dcef;">
                <tr>
                  <td style="padding:14px 16px;font-size:14px;line-height:1.7;color:#24446b;">
                    <strong>If the matter does not complete</strong><br />
                    ${
                      policy.appliesToThisMatter
                        ? `${escapeHtml(policy.summary)}
                           <br /><br />Our fee does become payable if:
                           <ul style="margin:6px 0 0 0;padding-left:20px;">${conditions}</ul>`
                        : escapeHtml(policy.disapplicationReason || "")
                    }
                    <br /><br />
                    <strong style="color:#062a63;">${escapeHtml(policy.thirdPartyDisclosure)}</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
      }

      const exclusions = Array.isArray(quoteData?.exclusions)
        ? quoteData.exclusions
        : [];
      if (exclusions.length > 0) {
        const exclusionItems = exclusions
          .map(
            (item) =>
              `<li style="margin-bottom:6px;"><strong>${escapeHtml(item.label)}</strong>${
                item.note ? `<br /><span style="font-size:13px;color:#52606d;">${escapeHtml(item.note)}</span>` : ""
              }</li>`
          )
          .join("");
        enfranchisementBlocksHtml += `
          <tr>
            <td style="padding:0 28px 24px 28px;">
              <h3 style="margin:0 0 8px 0;color:#24446b;">Also not included in this fee</h3>
              <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.7;color:#24446b;">
                ${exclusionItems}
              </ul>
            </td>
          </tr>`;
      }

      // No marriage value block. It is a component of the premium, which
      // this quote excludes as a valuation matter for the client's own
      // surveyor — explaining it on a fee quote would be valuation
      // commentary the firm does not hold itself out to give.
    }

    // Referrer branding (migration 0023): the email leads with the
    // referrer's logo and says "Powered by ConveyQuote".
    const referrerLogo = brand && brand.logoUrl ? brand : null;
    const brandName = referrerLogo ? safe(referrerLogo.name).trim() : "";
    const headerLogoHtml = referrerLogo
      ? `
                  <tr>
                    <td align="center" style="padding:0 0 6px 0;">
                      <img
                        src="${referrerLogo.logoUrl}"
                        alt="${escapeHtml(brandName)}"
                        style="display:block;max-width:220px;max-height:90px;width:auto;height:auto;border:0;margin:0 auto;"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:0 0 14px 0;font-size:12px;color:#6b7280;">
                      <img src="${logoUrl}" alt="" width="18" style="width:18px;height:auto;border:0;vertical-align:middle;margin-right:6px;" />Powered by <strong style="color:#0f2747;">ConveyQuote</strong>
                    </td>
                  </tr>`
      : `
                  <tr>
                    <td align="center" style="padding:0 0 12px 0;">
                      <img
                        src="${logoUrl}"
                        alt="ConveyQuote"
                        width="120"
                        style="display:block;width:120px;max-width:120px;height:auto;border:0;margin:0 auto;"
                      />
                    </td>
                  </tr>`;

    const clientHtml = `
      <html>
        <body style="margin:0;padding:0;background:#f2f4f7;font-family:Arial,Helvetica,sans-serif;color:#222;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f2f4f7;">
            <tr>
              <td align="center" style="padding:24px 12px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="760" style="max-width:760px;width:100%;border-collapse:collapse;">
${headerLogoHtml}

                  <tr>
                    <td style="background:#ffffff;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">

                        <tr>
                          <td style="background:#0f2747;padding:24px 28px;color:#ffffff;">
                            <div style="font-size:12px;letter-spacing:0.5px;text-transform:uppercase;opacity:0.85;">
                              ${brandName ? `${escapeHtml(brandName)} · powered by ConveyQuote` : "ConveyQuote"}
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
                        ${enfranchisementBlocksHtml}

                        <tr>
                          <td style="padding:0 28px 24px 28px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#eef6ff;border:1px solid #c9dcef;">
                              <tr>
                                <td style="padding:14px 16px;font-size:14px;line-height:1.7;color:#24446b;">
                                  <strong>What happens when you accept</strong><br />
                                  Once you accept, we open your file and allocate your matter to an SRA-regulated firm from our panel within one working day. You will receive a welcome pack and client care letter from the firm directly, along with any ID and document requests needed to get your transaction underway.
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:0 28px 24px 28px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#fff8e6;border:1px solid #d8e0ea;">
                              <tr>
                                <td style="padding:14px 16px;font-size:14px;line-height:1.7;color:#062a63;">
                                  <strong>Important Information</strong><br />
                                  This estimate is based on the information currently available. If further information comes to light or the matter involves additional complexity, we will discuss any change to costs with you before proceeding with that work.
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        ${additionalNotesHtml}

                        <tr>
                          <td style="padding:0 28px 0 28px;">
                            <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f2747;">Next Steps</h2>
                            <div style="font-size:14px;line-height:1.8;color:#4b5563;">
                              ${formattedNextSteps}
                            </div>
                          </td>
                        </tr>

                        <!-- Quote expiry notice -->
                        <tr>
                          <td style="padding:0 28px 20px 28px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#fef3f2;border:1px solid #fca5a5;border-radius:8px;">
                              <tr>
                                <td style="padding:12px 16px;font-size:13px;line-height:1.6;color:#991b1b;text-align:center;">
                                  🔒 <strong>Lock in this price by accepting before ${expiryFormatted}.</strong>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Action buttons -->
                        <tr>
                          <td align="center" style="padding:0 28px 12px 28px;">
                            <a
                              href="${acceptUrl}"
                              style="display:inline-block;background:#0f2747;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:bold;margin:0 8px 12px 8px;"
                            >
                              Accept Quote
                            </a>
                            <a
                              href="${bookACallUrl}"
                              style="display:inline-block;background:#1d6f42;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:bold;margin:0 8px 12px 8px;"
                            >
                              📞 Book a Free Call
                            </a>
                          </td>
                        </tr>

                        <!-- Reassurance under buttons -->
                        <tr>
                          <td style="padding:0 28px 24px 28px;">
                            <div style="font-size:13px;line-height:1.8;color:#6b7280;text-align:center;">
                              Not ready to accept yet? We are happy to answer any questions — no obligation.<br />
                              <a href="${bookACallUrl}" style="color:#0f2747;text-decoration:none;font-weight:600;">Book a free 10-minute call</a>
                              &nbsp;·&nbsp;
                              <a href="mailto:info@conveyquote.uk" style="color:#0f2747;text-decoration:none;font-weight:600;">Email us</a>
                              &nbsp;·&nbsp;
                              <a href="${rejectUrl}" style="color:#6b7280;text-decoration:none;font-weight:600;">Not the right fit? Let us know</a>
                            </div>
                          </td>
                        </tr>

                        <!-- Fees guide -->
                        <tr>
                          <td style="padding:0 28px 24px 28px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#f0f7ff;border:1px solid #bfdbfe;border-radius:8px;">
                              <tr>
                                <td style="padding:14px 16px;font-size:13px;line-height:1.7;color:#1e3a5f;text-align:center;">
                                  <strong>Want to understand what these fees cover?</strong><br />
                                  Our guide walks through every item in plain English — what it is, why it is charged, and what to expect at each stage of your transaction.<br />
                                  <a href="${feesGuideUrl}" style="display:inline-block;margin-top:10px;color:#0f2747;font-weight:700;text-decoration:underline;">
                                    Read our conveyancing fees guide →
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Reminder opt-out -->
                        <tr>
                          <td style="text-align:center;padding:16px 28px 0;font-size:12px;color:#9ca3af;line-height:1.6;">
                            Prefer not to receive reminders about this quote?
                            <a href="${unsubUrl}" style="color:#6b7280;text-decoration:underline;">Skip reminder emails</a>
                          </td>
                        </tr>

                        <!-- Footer legal note -->
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
                      ${brandName ? "Powered by ConveyQuote" : "ConveyQuote"} · <a href="mailto:info@conveyquote.uk" style="color:#0f2747;text-decoration:none;">info@conveyquote.uk</a>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const approvedQuoteRecord = {
      legalFees: quoteData?.legalFees || [],
      disbursements: quoteData?.disbursements || [],
      vat: vatAmount,
      legalFeesExVat: legalFeesSubtotal,
      legalTotalInclVat: legalFeesTotal,
      disbursementTotal,
      grandTotal: calculatedGrandTotal,
      sdltAmount: sdltAmount !== null ? sdltAmount : undefined,
      sdltNote: sdltNote || undefined,
      totalIncludingSdlt: totalIncludingSdlt !== null ? totalIncludingSdlt : undefined,
      approvedTotal: finalQuoteAmountValue,
      feeBreakdown: feeBreakdown || "",
      nextSteps: nextSteps || "",
      additionalNotes: trimmedAdditionalNotes,
      manualAdjustment: adjustment || undefined,
    };

    const firstName = safe(name).trim().split(" ")[0];
    const subjectAmount = displayQuoteAmount.split(".")[0];
    const emailSubject = firstName
      ? `${firstName}, your conveyancing quote is ready (£${subjectAmount})`
      : `Your conveyancing quote is ready (£${subjectAmount})`;

  return { clientHtml, emailSubject, approvedQuoteRecord, finalQuoteAmountValue };
}
