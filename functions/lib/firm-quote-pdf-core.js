// functions/lib/firm-quote-pdf-core.js
//
// Shared PDF-building core for firm-issued quotes.
//
// Originally inlined in functions/api/firm-quote-pdf.js. Extracted in
// Phase 5 (email-to-client) so the firm-issued-quote-send.js endpoint
// can produce the exact same branded PDF without re-fetching via HTTP.
//
// Two entry points:
//   - buildQuotePdf(...)       low-level: caller supplies parsed row
//   - loadFirmBranding(...)    helper: read panel_firms branding + R2 logo
//   - buildFilename(...)       shared filename pattern
//
// The HTTP wrapper lives in functions/api/firm-quote-pdf.js and is
// unchanged in behaviour — it just delegates to this module now.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  getEnfranchisementLabel,
  isEnfranchisementType,
} from "./enfranchisement/types.js";

// ── Brand constants ──────────────────────────────────────────────────
const NAVY = rgb(0x06 / 255, 0x2a / 255, 0x63 / 255);
const TEAL = rgb(0x0a / 255, 0xa6 / 255, 0xb5 / 255);
const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0, 0, 0);
const MUTED = rgb(0.42, 0.45, 0.5);
// Blocks a client must not skim past — third-party costs they are liable
// for but we do not control, and the no-completion-no-fee carve-outs —
// are given weight through type, not through colour. A quote is a
// professional document, so emphasis stays within the brand palette:
// bold navy for the point being made, muted grey for the explanation.
const EMPHASIS = NAVY;
// Light rule used to box the third-party section off from our own fees.
const RULE = rgb(0.84, 0.86, 0.89);

// A4 in points (1/72 inch).
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 50;
const HEADER_BAND_HEIGHT = 70;
const FOOTER_RESERVE = 60;
const CONTENT_TOP = PAGE_HEIGHT - HEADER_BAND_HEIGHT - 30;
const CONTENT_BOTTOM = FOOTER_RESERVE;

const CONVEYANCING_TRANSACTION_LABELS = {
  purchase: "Purchase",
  sale: "Sale",
  remortgage: "Remortgage",
  transfer: "Transfer of equity",
  sale_purchase: "Sale and purchase",
  remortgage_transfer: "Remortgage and transfer of equity",
};

// Enfranchisement labels are NOT duplicated here — they come from
// ./enfranchisement/types.js, which every rail shares.
const getTransactionLabel = (transactionType) =>
  getEnfranchisementLabel(transactionType) ||
  CONVEYANCING_TRANSACTION_LABELS[transactionType] ||
  String(transactionType || "");

const DISCLAIMER =
  "This quote is an estimate based on the information provided and is " +
  "subject to change if material facts change (e.g. tenure, price, " +
  "mortgage terms, transaction complexity). Final fees will be " +
  "confirmed in writing before instruction.";

// ── Formatting helpers ───────────────────────────────────────────────

const formatMoney = (n) => {
  const v = Number(n) || 0;
  return `£${v.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatPriceLarge = (n) => {
  const v = Math.round(Number(n) || 0);
  return `£${v.toLocaleString("en-GB")}`;
};

const formatIssuedDate = (iso) => {
  if (!iso) return "";
  const normalised = String(iso).includes("T")
    ? String(iso)
    : String(iso).replace(" ", "T") + "Z";
  const d = new Date(normalised);
  if (Number.isNaN(d.getTime())) return String(iso);
  const day = d.getUTCDate();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${day} ${monthNames[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

const formatYearFromIso = (iso) => {
  if (!iso) return new Date().getUTCFullYear();
  const normalised = String(iso).includes("T")
    ? String(iso)
    : String(iso).replace(" ", "T") + "Z";
  const d = new Date(normalised);
  if (Number.isNaN(d.getTime())) return new Date().getUTCFullYear();
  return d.getUTCFullYear();
};

const sanitiseFilenamePart = (s) =>
  String(s || "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const sanitiseForWinAnsi = (s) =>
  String(s == null ? "" : s)
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/ /g, " ");

// ── Drawing primitives ───────────────────────────────────────────────

const drawText = (page, text, x, y, opts) =>
  page.drawText(sanitiseForWinAnsi(text), { x, y, ...opts });

const drawRightAlignedText = (page, text, rightX, y, font, size, color) => {
  const clean = sanitiseForWinAnsi(text);
  const width = font.widthOfTextAtSize(clean, size);
  page.drawText(clean, { x: rightX - width, y, font, size, color });
};

const LOGO_BOX_HEIGHT = HEADER_BAND_HEIGHT - 20;
const LOGO_BOX_MAX_WIDTH = 200;

const drawHeaderBand = (page, fonts, branding) => {
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - HEADER_BAND_HEIGHT,
    width: PAGE_WIDTH,
    height: HEADER_BAND_HEIGHT,
    color: NAVY,
  });

  const wordmark = branding?.displayName || "ConveyQuote";

  if (branding?.logoImage) {
    const img = branding.logoImage;
    const scale = Math.min(
      LOGO_BOX_MAX_WIDTH / img.width,
      LOGO_BOX_HEIGHT / img.height
    );
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const y = PAGE_HEIGHT - HEADER_BAND_HEIGHT + (HEADER_BAND_HEIGHT - drawH) / 2;
    page.drawImage(img, {
      x: MARGIN_X,
      y,
      width: drawW,
      height: drawH,
    });
  } else {
    drawText(page, wordmark, MARGIN_X, PAGE_HEIGHT - 45, {
      font: fonts.bold,
      size: 26,
      color: WHITE,
    });
  }

  drawRightAlignedText(
    page,
    "Quote summary",
    PAGE_WIDTH - MARGIN_X,
    PAGE_HEIGHT - 42,
    fonts.regular,
    11,
    WHITE
  );
};

const drawTealDivider = (page, y) => {
  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: PAGE_WIDTH - MARGIN_X, y },
    thickness: 1,
    color: TEAL,
  });
};

const drawSectionTitle = (page, fonts, title, y) => {
  drawText(page, title, MARGIN_X, y, {
    font: fonts.bold,
    size: 13,
    color: NAVY,
  });
};

// ── Quote-specific drawing ───────────────────────────────────────────

const buildReference = (id, issuedAt) =>
  `CQ-${formatYearFromIso(issuedAt)}-${String(id).padStart(4, "0")}`;

export const buildFilename = (id, clientName, issuedAt) => {
  const namePart = sanitiseFilenamePart(clientName);
  const datePart = sanitiseFilenamePart(
    (issuedAt || "").slice(0, 10) || String(formatYearFromIso(issuedAt))
  );
  const idPart = String(id);
  return namePart
    ? `ConveyQuote-${namePart}-${idPart}.pdf`
    : `ConveyQuote-${idPart}-${datePart}.pdf`;
};

// Appends share % and continuing mortgage rows to the transaction
// details when those optional inputs were populated. Quietly skipped
// for the conservative-estimate case (both blank), keeping the PDF
// clean. Continuing mortgage is only rendered when > 0 — a literal
// "£0" row is omitted as noise.
const addTransferRefinementRows = (details, inputs) => {
  const share = Number(inputs.sharePercent);
  if (Number.isFinite(share) && share > 0) {
    details.push(["Share being transferred", `${share}%`]);
  }
  const continuing = Number(inputs.continuingMortgage);
  if (Number.isFinite(continuing) && continuing > 0) {
    details.push(["Continuing mortgage", formatPriceLarge(continuing)]);
  }
};

const curateTransactionDetails = (transactionType, inputs) => {
  const details = [];
  const i = inputs || {};
  const tenureLabel =
    i.tenure === "leasehold"
      ? "Leasehold"
      : i.tenure === "freehold"
      ? "Freehold"
      : "";

  switch (transactionType) {
    case "purchase":
      if (i.price) details.push(["Purchase price", formatPriceLarge(i.price)]);
      if (tenureLabel) details.push(["Tenure", tenureLabel]);
      break;
    case "sale":
      if (i.price) details.push(["Sale price", formatPriceLarge(i.price)]);
      if (tenureLabel) details.push(["Tenure", tenureLabel]);
      break;
    case "sale_purchase":
      if (i.price) details.push(["Purchase price", formatPriceLarge(i.price)]);
      if (i.salePrice) details.push(["Sale price", formatPriceLarge(i.salePrice)]);
      if (tenureLabel) details.push(["Tenure", tenureLabel]);
      break;
    case "remortgage":
      if (i.price) details.push(["Property value", formatPriceLarge(i.price)]);
      if (i.mortgageAmount)
        details.push(["Mortgage amount", formatPriceLarge(i.mortgageAmount)]);
      if (tenureLabel) details.push(["Tenure", tenureLabel]);
      break;
    case "transfer":
      if (i.price) details.push(["Property value", formatPriceLarge(i.price)]);
      if (tenureLabel) details.push(["Tenure", tenureLabel]);
      addTransferRefinementRows(details, i);
      break;
    case "remortgage_transfer":
      if (i.price) details.push(["Property value", formatPriceLarge(i.price)]);
      if (i.mortgageAmount)
        details.push(["Mortgage amount", formatPriceLarge(i.mortgageAmount)]);
      if (tenureLabel) details.push(["Tenure", tenureLabel]);
      addTransferRefinementRows(details, i);
      break;
    case "lease_extension_statutory":
    case "lease_extension_informal": {
      // A lease extension is not driven by a consideration figure, so
      // the rows that matter are the ones that drive the claim: the
      // unexpired term (which governs the premium and the urgency) and
      // whether the landlord can be found.
      if (i.unexpiredTermYears)
        details.push(["Unexpired term", `${i.unexpiredTermYears} years`]);
      if (i.originalLeaseTermYears)
        details.push(["Original lease term", `${i.originalLeaseTermYears} years`]);
      if (i.groundRent)
        details.push(["Current ground rent", formatPriceLarge(i.groundRent)]);
      if (i.landlordIdentifiable === "no" || i.landlordIdentifiable === false) {
        details.push(["Landlord", "Cannot be traced - vesting order required"]);
      }
      if (i.premium) details.push(["Premium (per valuer)", formatPriceLarge(i.premium)]);
      break;
    }
    default:
      if (i.price) details.push(["Amount", formatPriceLarge(i.price)]);
      if (tenureLabel) details.push(["Tenure", tenureLabel]);
  }

  if (i.postcode) details.push(["Postcode", String(i.postcode)]);
  return details;
};

const createRenderer = (pdfDoc, fonts, branding) => {
  const pages = [];
  let state = null;

  const startPage = () => {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawHeaderBand(page, fonts, branding);
    pages.push(page);
    state = { page, y: CONTENT_TOP };
  };

  startPage();

  const ensureRoom = (needed) => {
    if (state.y - needed < CONTENT_BOTTOM) startPage();
  };

  const advance = (n) => {
    state.y -= n;
  };

  return {
    newPage: startPage,
    ensureRoom,
    advance,
    get: () => state,
    getPages: () => pages,
  };
};

const drawFirmContactBlock = (renderer, fonts, branding) => {
  if (!branding) return;
  const addressLines = (branding.address || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const hasContact =
    addressLines.length > 0 ||
    Boolean(branding.phone) ||
    Boolean(branding.email);
  if (!hasContact) return;

  const totalLines =
    addressLines.length + (branding.phone ? 1 : 0) + (branding.email ? 1 : 0);
  renderer.ensureRoom(14 * totalLines + 14);

  const lineHeight = 13;
  for (const line of addressLines) {
    if (renderer.get().y - lineHeight < CONTENT_BOTTOM) renderer.newPage();
    drawText(renderer.get().page, line, MARGIN_X, renderer.get().y, {
      font: fonts.regular,
      size: 10,
      color: NAVY,
    });
    renderer.advance(lineHeight);
  }
  if (branding.phone) {
    if (renderer.get().y - lineHeight < CONTENT_BOTTOM) renderer.newPage();
    drawText(
      renderer.get().page,
      `Tel: ${branding.phone}`,
      MARGIN_X,
      renderer.get().y,
      { font: fonts.regular, size: 10, color: NAVY }
    );
    renderer.advance(lineHeight);
  }
  if (branding.email) {
    if (renderer.get().y - lineHeight < CONTENT_BOTTOM) renderer.newPage();
    drawText(
      renderer.get().page,
      `Email: ${branding.email}`,
      MARGIN_X,
      renderer.get().y,
      { font: fonts.regular, size: 10, color: NAVY }
    );
    renderer.advance(lineHeight);
  }
  renderer.advance(6);
  drawTealDivider(renderer.get().page, renderer.get().y);
  renderer.advance(14);
};

const drawMetadataBlock = (renderer, fonts, meta) => {
  renderer.ensureRoom(80);
  drawText(
    renderer.get().page,
    `Quote reference: ${meta.reference}`,
    MARGIN_X,
    renderer.get().y,
    { font: fonts.bold, size: 13, color: NAVY }
  );
  renderer.advance(20);

  drawLabelValueRow(renderer, fonts, "Issued", meta.issuedFormatted);
  drawLabelValueRow(renderer, fonts, "Client", meta.clientName || "-");
  if (meta.clientEmail) {
    drawLabelValueRow(renderer, fonts, "Email", meta.clientEmail);
  }

  renderer.advance(10);
  drawTealDivider(renderer.get().page, renderer.get().y);
  renderer.advance(16);
};

const drawLabelValueRow = (renderer, fonts, label, value, lineHeight = 14) => {
  if (renderer.get().y - lineHeight < CONTENT_BOTTOM) renderer.newPage();
  const ny = renderer.get().y;
  const labelStr = `${label}: `;
  drawText(renderer.get().page, labelStr, MARGIN_X, ny, {
    font: fonts.bold,
    size: 10,
    color: BLACK,
  });
  const lw = fonts.bold.widthOfTextAtSize(sanitiseForWinAnsi(labelStr), 10);
  drawText(renderer.get().page, String(value || ""), MARGIN_X + lw, ny, {
    font: fonts.regular,
    size: 10,
    color: BLACK,
  });
  renderer.advance(lineHeight);
};

const drawTransactionBlock = (renderer, fonts, transactionType, inputs) => {
  renderer.ensureRoom(60);
  drawSectionTitle(
    renderer.get().page,
    fonts,
    "Transaction details",
    renderer.get().y
  );
  renderer.advance(18);

  const typeLabel = getTransactionLabel(transactionType);
  drawLabelValueRow(renderer, fonts, "Transaction type", typeLabel);

  const details = curateTransactionDetails(transactionType, inputs);
  for (const [label, value] of details) {
    drawLabelValueRow(renderer, fonts, label, value);
  }

  renderer.advance(10);
  drawTealDivider(renderer.get().page, renderer.get().y);
  renderer.advance(16);
};

const drawBreakdownSection = (renderer, fonts, title, rows, options = {}) => {
  if (!rows || rows.length === 0) return;
  renderer.ensureRoom(40);
  const { page } = renderer.get();
  drawSectionTitle(page, fonts, title, renderer.get().y);
  renderer.advance(18);

  const rightX = PAGE_WIDTH - MARGIN_X;
  const lineHeight = 16;
  for (const row of rows) {
    if (renderer.get().y - lineHeight < CONTENT_BOTTOM) {
      renderer.newPage();
    }
    const ny = renderer.get().y;
    const labelText = row.suffix ? `${row.label} ${row.suffix}` : row.label;
    drawText(renderer.get().page, labelText, MARGIN_X, ny, {
      font: fonts.regular,
      size: 10,
      color: BLACK,
    });
    drawRightAlignedText(
      renderer.get().page,
      row.overrideText || formatMoney(row.amount),
      rightX,
      ny,
      fonts.regular,
      10,
      row.overrideText ? MUTED : BLACK
    );
    renderer.advance(lineHeight);
  }

  if (options.subtotalLabel) {
    if (renderer.get().y - lineHeight < CONTENT_BOTTOM) renderer.newPage();
    const ny = renderer.get().y;
    drawText(renderer.get().page, options.subtotalLabel, MARGIN_X, ny, {
      font: fonts.bold,
      size: 10,
      color: NAVY,
    });
    drawRightAlignedText(
      renderer.get().page,
      formatMoney(options.subtotalAmount),
      rightX,
      ny,
      fonts.bold,
      10,
      NAVY
    );
    renderer.advance(lineHeight);
  }

  renderer.advance(8);
  drawTealDivider(renderer.get().page, renderer.get().y);
  renderer.advance(14);
};

// ── Enfranchisement-only sections ────────────────────────────────────
//
// These exist because an enfranchisement quote has to communicate three
// things a conveyancing quote never does: that the client may not
// qualify, that the largest sums involved are payable to other people
// and are outside the firm's control, and that a no-completion-no-fee
// promise does not extend to those other people's costs.

const drawWrappedParagraph = (renderer, fonts, text, opts = {}) => {
  const size = opts.size || 9;
  const font = opts.bold ? fonts.bold : fonts.regular;
  const color = opts.color || BLACK;
  const indent = opts.indent || 0;
  const usableWidth = PAGE_WIDTH - 2 * MARGIN_X - indent;
  const lines = wrapText(String(text || ""), font, size, usableWidth);
  const lineHeight = size + 3;
  for (const line of lines) {
    if (renderer.get().y - lineHeight < CONTENT_BOTTOM) renderer.newPage();
    drawText(renderer.get().page, line, MARGIN_X + indent, renderer.get().y, {
      font,
      size,
      color,
    });
    renderer.advance(lineHeight);
  }
};

const formatEstimateRange = (low, high) => {
  if (low == null && high == null) return "A valuation is required";
  if (low === high) return `${formatMoney(low)} (estimate)`;
  return `${formatMoney(low)} - ${formatMoney(high)} (estimate)`;
};

// Qualification and marriage-value warnings. Rendered before any money
// so a client who does not qualify, or whose lease is about to drop
// below eighty years, sees it first.
const drawEnfranchisementNotices = (renderer, fonts, output) => {
  const qualification = output?.qualification;
  const notices = [];

  if (qualification?.outcome === "needs_review") {
    notices.push({
      title: "This quote is provisional",
      body:
        "Some of the answers given need to be checked by a solicitor before this " +
        "quote can be confirmed. " +
        qualification.reasons
          .filter((r) => r.severity === "review")
          .map((r) => r.message)
          .join(" "),
    });
  }

  // No marriage value notice. It is part of the premium, and the premium
  // is excluded from this quote as a valuation matter — see
  // buildThirdPartyCosts in ../calculate-enfranchisement-quote.js.

  if (notices.length === 0) return;

  for (const notice of notices) {
    renderer.ensureRoom(50);
    drawText(renderer.get().page, notice.title, MARGIN_X, renderer.get().y, {
      font: fonts.bold,
      size: 10.5,
      color: EMPHASIS,
    });
    renderer.advance(15);
    drawWrappedParagraph(renderer, fonts, notice.body, { size: 9, color: BLACK });
    for (const footnote of notice.footnotes || []) {
      renderer.advance(3);
      drawWrappedParagraph(renderer, fonts, footnote, { size: 8.5, color: MUTED });
    }
    renderer.advance(8);
  }

  drawTealDivider(renderer.get().page, renderer.get().y);
  renderer.advance(14);
};

// The block that keeps the quote honest. Everything here is payable by
// the client to somebody else. It is rendered AFTER our grand total and
// visually separated, so the two can never be read as one figure.
const drawThirdPartyCostsSection = (renderer, fonts, output) => {
  const costs = output?.thirdPartyCosts || [];
  if (costs.length === 0) return;

  renderer.ensureRoom(90);
  drawSectionTitle(
    renderer.get().page,
    fonts,
    "Not included - payable by you to others",
    renderer.get().y
  );
  renderer.advance(18);

  drawWrappedParagraph(
    renderer,
    fonts,
    "The amounts below are not our fees. We do not set them, we do not control them " +
      "and we do not receive them. The figures shown are estimates only and the actual " +
      "amounts may be higher or lower.",
    { size: 9, bold: true, color: EMPHASIS }
  );
  renderer.advance(4);
  drawTealDivider(renderer.get().page, renderer.get().y);
  renderer.advance(10);

  const rightX = PAGE_WIDTH - MARGIN_X;
  const lineHeight = 15;

  for (const cost of costs) {
    if (renderer.get().y - lineHeight * 2 < CONTENT_BOTTOM) renderer.newPage();
    const ny = renderer.get().y;
    drawText(renderer.get().page, cost.label, MARGIN_X, ny, {
      font: fonts.bold,
      size: 10,
      color: NAVY,
    });
    drawRightAlignedText(
      renderer.get().page,
      formatEstimateRange(cost.amountLow, cost.amountHigh),
      rightX,
      ny,
      fonts.bold,
      10,
      NAVY
    );
    renderer.advance(lineHeight);

    if (cost.note) {
      drawWrappedParagraph(renderer, fonts, cost.note, {
        size: 8.5,
        color: MUTED,
        indent: 10,
      });
    }
    if (cost.statutoryRef) {
      drawWrappedParagraph(renderer, fonts, cost.statutoryRef, {
        size: 8.5,
        color: MUTED,
        indent: 10,
      });
    }
    if (cost.survivesWithdrawalNote) {
      drawWrappedParagraph(renderer, fonts, cost.survivesWithdrawalNote, {
        size: 8.5,
        color: EMPHASIS,
        indent: 10,
      });
    }
    renderer.advance(6);
  }

  const indicative = output?.indicativeTotalExcludingPremium;
  if (indicative) {
    if (renderer.get().y - 30 < CONTENT_BOTTOM) renderer.newPage();
    renderer.advance(4);
    const ny = renderer.get().y;
    drawText(
      renderer.get().page,
      "Indicative total, EXCLUDING the premium",
      MARGIN_X,
      ny,
      { font: fonts.bold, size: 10, color: NAVY }
    );
    drawRightAlignedText(
      renderer.get().page,
      `${formatMoney(indicative.low)} - ${formatMoney(indicative.high)}`,
      rightX,
      ny,
      fonts.bold,
      10,
      NAVY
    );
    renderer.advance(lineHeight);
    drawWrappedParagraph(renderer, fonts, indicative.note, {
      size: 8.5,
      color: MUTED,
      indent: 10,
    });
  }

  renderer.advance(8);
  drawTealDivider(renderer.get().page, renderer.get().y);
  renderer.advance(14);
};

const drawAbortivePolicySection = (renderer, fonts, output) => {
  const policy = output?.abortivePolicy;
  if (!policy) return;

  renderer.ensureRoom(70);
  drawSectionTitle(
    renderer.get().page,
    fonts,
    "If the matter does not complete",
    renderer.get().y
  );
  renderer.advance(18);

  if (policy.appliesToThisMatter) {
    drawWrappedParagraph(renderer, fonts, policy.summary, {
      size: 9.5,
      bold: true,
      color: NAVY,
    });
    renderer.advance(4);
    drawWrappedParagraph(renderer, fonts, "Our fee does become payable if:", {
      size: 9,
      color: BLACK,
    });
    for (const condition of policy.faultConditions || []) {
      drawWrappedParagraph(renderer, fonts, `\u2022  ${condition}`, {
        size: 9,
        color: BLACK,
        indent: 10,
      });
    }
  } else {
    drawWrappedParagraph(renderer, fonts, policy.disapplicationReason || "", {
      size: 9,
      color: EMPHASIS,
    });
  }

  renderer.advance(6);
  // The carve-out that matters most: our promise cannot reach other
  // people's costs, and s.60(3) liability survives withdrawal.
  drawWrappedParagraph(renderer, fonts, policy.thirdPartyDisclosure, {
    size: 9,
    bold: true,
    color: EMPHASIS,
  });

  renderer.advance(8);
  drawTealDivider(renderer.get().page, renderer.get().y);
  renderer.advance(14);
};

const drawExclusionsSection = (renderer, fonts, output) => {
  const exclusions = output?.exclusions || [];
  if (exclusions.length === 0) return;

  renderer.ensureRoom(60);
  drawSectionTitle(
    renderer.get().page,
    fonts,
    "Also not included in this fee",
    renderer.get().y
  );
  renderer.advance(18);

  for (const exclusion of exclusions) {
    drawWrappedParagraph(renderer, fonts, exclusion.label, {
      size: 9.5,
      bold: true,
      color: NAVY,
    });
    if (exclusion.note) {
      drawWrappedParagraph(renderer, fonts, exclusion.note, {
        size: 8.5,
        color: MUTED,
        indent: 10,
      });
    }
    renderer.advance(5);
  }

  renderer.advance(6);
  drawTealDivider(renderer.get().page, renderer.get().y);
  renderer.advance(14);
};

const drawGrandTotal = (renderer, fonts, grandTotal) => {
  renderer.ensureRoom(40);
  const ny = renderer.get().y;
  const rightX = PAGE_WIDTH - MARGIN_X;
  drawText(renderer.get().page, "Grand total", MARGIN_X, ny, {
    font: fonts.bold,
    size: 15,
    color: NAVY,
  });
  drawRightAlignedText(
    renderer.get().page,
    formatMoney(grandTotal),
    rightX,
    ny,
    fonts.bold,
    16,
    NAVY
  );
  renderer.advance(28);
};

const wrapText = (text, font, size, maxWidth) => {
  const clean = sanitiseForWinAnsi(text);
  const words = clean.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const trial = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(trial, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = trial;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const drawDisclaimerOnEveryPage = (renderer, fonts) => {
  const usableWidth = PAGE_WIDTH - 2 * MARGIN_X;
  const lines = wrapText(DISCLAIMER, fonts.regular, 8.5, usableWidth);
  for (const page of renderer.getPages()) {
    let y = 38;
    for (const line of lines) {
      page.drawText(line, {
        x: MARGIN_X,
        y,
        font: fonts.regular,
        size: 8.5,
        color: MUTED,
      });
      y -= 11;
    }
  }
};

const drawPageFooters = (renderer, fonts) => {
  const pages = renderer.getPages();
  const total = pages.length;
  pages.forEach((page, idx) => {
    drawRightAlignedText(
      page,
      "Powered by ConveyQuote - conveyquote.uk",
      PAGE_WIDTH - MARGIN_X,
      12,
      fonts.regular,
      8,
      MUTED
    );
    if (total > 1) {
      drawText(page, `Page ${idx + 1} of ${total}`, MARGIN_X, 12, {
        font: fonts.regular,
        size: 8,
        color: MUTED,
      });
    }
  });
};

// ── Main PDF builder ─────────────────────────────────────────────────

export async function buildQuotePdf({
  id,
  clientName,
  clientEmail,
  issuedAt,
  transactionType,
  inputs,
  output,
  branding,
}) {
  const pdfDoc = await PDFDocument.create();
  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };

  let logoImage = null;
  if (branding?.logoBytes && branding.logoMimeType) {
    try {
      logoImage =
        branding.logoMimeType === "image/png"
          ? await pdfDoc.embedPng(branding.logoBytes)
          : await pdfDoc.embedJpg(branding.logoBytes);
    } catch (err) {
      console.error("firm-quote-pdf: embed logo failed:", err);
      logoImage = null;
    }
  }

  const renderBranding = branding ? { ...branding, logoImage } : null;

  const renderer = createRenderer(pdfDoc, fonts, renderBranding);

  drawFirmContactBlock(renderer, fonts, renderBranding);

  drawMetadataBlock(renderer, fonts, {
    reference: buildReference(id, issuedAt),
    issuedFormatted: formatIssuedDate(issuedAt),
    clientName,
    clientEmail,
  });

  drawTransactionBlock(renderer, fonts, transactionType, inputs);

  const isEnfranchisement = isEnfranchisementType(transactionType);

  // Qualification and marriage-value warnings come before any figures.
  if (isEnfranchisement) {
    drawEnfranchisementNotices(renderer, fonts, output);
  }

  const legalFeeRows = (output?.legalFees || []).map((it) => ({
    label: it.label,
    amount: it.amount,
    suffix: it.vatApplicable ? "(+ VAT)" : "",
  }));
  if (legalFeeRows.length > 0) {
    drawBreakdownSection(renderer, fonts, "Legal fees", legalFeeRows, {
      subtotalLabel: "Legal fees subtotal (ex VAT)",
      subtotalAmount: Number(output?.legalFeesNet) || 0,
    });
  }

  // A disbursement flagged "tbc" (the Land Registry fee on a lease
  // extension, which cannot be calculated until the premium is agreed)
  // must render as "To be confirmed", never as £0.00.
  const disbursementRows = (output?.disbursements || []).map((it) => ({
    label: it.label,
    amount: it.amount,
    overrideText: it.status === "tbc" ? "To be confirmed" : null,
  }));
  if (disbursementRows.length > 0) {
    drawBreakdownSection(renderer, fonts, "Disbursements", disbursementRows, {
      subtotalLabel: "Disbursements subtotal",
      subtotalAmount: Number(output?.disbursementsTotal) || 0,
    });
  }

  const sdlt = Number(output?.sdlt) || 0;
  if (sdlt > 0) {
    drawBreakdownSection(
      renderer,
      fonts,
      "Stamp Duty Land Tax",
      [{ label: "Estimated SDLT", amount: sdlt }]
    );
  }

  const vat = Number(output?.vat) || 0;
  if (vat > 0) {
    drawBreakdownSection(renderer, fonts, "VAT", [
      { label: "VAT (20%)", amount: vat },
    ]);
  }

  drawGrandTotal(renderer, fonts, Number(output?.grandTotal) || 0);

  // Everything below the grand total is money the client owes to
  // someone other than us. Rendering it after, and under its own
  // headings, is what stops the two being read as a single figure.
  if (isEnfranchisement) {
    renderer.advance(10);
    drawThirdPartyCostsSection(renderer, fonts, output);
    drawAbortivePolicySection(renderer, fonts, output);
    drawExclusionsSection(renderer, fonts, output);
  }

  drawDisclaimerOnEveryPage(renderer, fonts);
  drawPageFooters(renderer, fonts);

  return pdfDoc.save();
}

// Load firm branding fields from panel_firms + (optionally) pull the
// logo bytes from R2. A failed R2 fetch logs and returns a branding
// object without logoBytes — never throws, so a PDF render can always
// proceed with a wordmark fallback.
export async function loadFirmBranding(env, firmId) {
  const firm = await env.DB.prepare(
    `SELECT brand_display_name, brand_address,
            brand_phone, brand_email, brand_logo_key
       FROM panel_firms
      WHERE id = ?
      LIMIT 1`
  )
    .bind(firmId)
    .first();

  const branding = {
    displayName: firm?.brand_display_name || "",
    address: firm?.brand_address || "",
    phone: firm?.brand_phone || "",
    email: firm?.brand_email || "",
    logoBytes: null,
    logoMimeType: null,
  };

  const logoKey =
    typeof firm?.brand_logo_key === "string" && firm.brand_logo_key
      ? firm.brand_logo_key
      : null;
  if (logoKey && env.FIRM_LOGOS_BUCKET) {
    try {
      const obj = await env.FIRM_LOGOS_BUCKET.get(logoKey);
      if (obj) {
        const arrayBuffer = await obj.arrayBuffer();
        branding.logoBytes = new Uint8Array(arrayBuffer);
        branding.logoMimeType =
          obj.httpMetadata?.contentType ||
          (logoKey.endsWith(".png") ? "image/png" : "image/jpeg");
      } else {
        console.error(
          `firm-quote-pdf-core: logo key ${logoKey} not found in R2 — falling back to wordmark.`
        );
      }
    } catch (err) {
      console.error(
        `firm-quote-pdf-core: logo fetch for ${logoKey} failed — falling back to wordmark:`,
        err
      );
    }
  }

  return branding;
}
