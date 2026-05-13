// functions/api/firm-quote-pdf.js
//
// Phase 3 of Type 2 firm-quoting product.
//
// Generates a ConveyQuote-branded PDF of a saved firm-issued quote.
// PDFs are not stored — every request renders fresh from the
// firm_issued_quotes row. Neutral template (Phase 3); firm-specific
// branding (logo, contact details) is Phase 4.
//
// Route: GET /api/firm-quote-pdf?id=<id>
// Auth: firm session (Bearer token), is_saas_firm = 1 required, firm
// must own the quote (cross-firm requests get 404 — same posture as
// firm-quote-saved.js to avoid leaking quote-id existence).

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  getTokenFromRequest,
  validateSession,
  jsonResponse,
  unauthorised,
} from "../lib/auth.js";

// ── Brand constants ──────────────────────────────────────────────────
const NAVY = rgb(0x06 / 255, 0x2a / 255, 0x63 / 255);
const TEAL = rgb(0x0a / 255, 0xa6 / 255, 0xb5 / 255);
const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0, 0, 0);
const MUTED = rgb(0.42, 0.45, 0.5);

// A4 in points (1/72 inch).
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 50;
const HEADER_BAND_HEIGHT = 70;
const FOOTER_RESERVE = 60; // bottom space reserved for disclaimer + page footer
const CONTENT_TOP = PAGE_HEIGHT - HEADER_BAND_HEIGHT - 30;
const CONTENT_BOTTOM = FOOTER_RESERVE;

const TRANSACTION_LABELS = {
  purchase: "Purchase",
  sale: "Sale",
  remortgage: "Remortgage",
  transfer: "Transfer of equity",
  sale_purchase: "Sale and purchase",
  remortgage_transfer: "Remortgage and transfer of equity",
};

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

// "2026-05-13T11:00:00Z" or "2026-05-13 11:00:00" → "13 May 2026"
const formatIssuedDate = (iso) => {
  if (!iso) return "";
  // SQLite datetime('now') returns "YYYY-MM-DD HH:MM:SS" (no T, no Z).
  // Normalise so Date.parse interprets it as UTC and not local.
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

// pdf-lib's WinAnsi-encoded Helvetica doesn't include the £ glyph as a
// browser-rendered Unicode character — but WinAnsi DOES support £ at
// code point 0xA3. Just normalise common Unicode quotes and dashes to
// ASCII so we don't blow up on apostrophes in client names etc.
const sanitiseForWinAnsi = (s) =>
  String(s == null ? "" : s)
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/ /g, " ");

// ── Drawing primitives ───────────────────────────────────────────────

const drawText = (page, text, x, y, opts) =>
  page.drawText(sanitiseForWinAnsi(text), { x, y, ...opts });

const drawRightAlignedText = (page, text, rightX, y, font, size, color) => {
  const clean = sanitiseForWinAnsi(text);
  const width = font.widthOfTextAtSize(clean, size);
  page.drawText(clean, { x: rightX - width, y, font, size, color });
};

const drawCenteredText = (page, text, centerX, y, font, size, color) => {
  const clean = sanitiseForWinAnsi(text);
  const width = font.widthOfTextAtSize(clean, size);
  page.drawText(clean, { x: centerX - width / 2, y, font, size, color });
};

const drawHeaderBand = (page, fonts) => {
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - HEADER_BAND_HEIGHT,
    width: PAGE_WIDTH,
    height: HEADER_BAND_HEIGHT,
    color: NAVY,
  });
  drawText(page, "ConveyQuote", MARGIN_X, PAGE_HEIGHT - 45, {
    font: fonts.bold,
    size: 26,
    color: WHITE,
  });
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

const buildFilename = (id, clientName, issuedAt) => {
  const namePart = sanitiseFilenamePart(clientName);
  const datePart = sanitiseFilenamePart(
    (issuedAt || "").slice(0, 10) || String(formatYearFromIso(issuedAt))
  );
  const idPart = String(id);
  return namePart
    ? `ConveyQuote-${namePart}-${idPart}.pdf`
    : `ConveyQuote-${idPart}-${datePart}.pdf`;
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
      break;
    case "remortgage_transfer":
      if (i.price) details.push(["Property value", formatPriceLarge(i.price)]);
      if (i.mortgageAmount)
        details.push(["Mortgage amount", formatPriceLarge(i.mortgageAmount)]);
      if (tenureLabel) details.push(["Tenure", tenureLabel]);
      break;
    default:
      if (i.price) details.push(["Amount", formatPriceLarge(i.price)]);
      if (tenureLabel) details.push(["Tenure", tenureLabel]);
  }

  if (i.postcode) details.push(["Postcode", String(i.postcode)]);
  return details;
};

// Renderer with cursor management + automatic page break.
const createRenderer = (pdfDoc, fonts) => {
  const pages = [];
  let state = null;

  const startPage = () => {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawHeaderBand(page, fonts);
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

  const typeLabel =
    TRANSACTION_LABELS[transactionType] || String(transactionType || "");
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
      formatMoney(row.amount),
      rightX,
      ny,
      fonts.regular,
      10,
      BLACK
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
    drawCenteredText(
      page,
      "Generated by ConveyQuote - conveyquote.uk",
      PAGE_WIDTH / 2,
      12,
      fonts.regular,
      8,
      MUTED
    );
    if (total > 1) {
      drawRightAlignedText(
        page,
        `Page ${idx + 1} of ${total}`,
        PAGE_WIDTH - MARGIN_X,
        12,
        fonts.regular,
        8,
        MUTED
      );
    }
  });
};

// ── Main PDF builder ─────────────────────────────────────────────────

async function buildQuotePdf({ id, clientName, clientEmail, issuedAt, transactionType, inputs, output }) {
  const pdfDoc = await PDFDocument.create();
  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };

  const renderer = createRenderer(pdfDoc, fonts);

  // Metadata
  drawMetadataBlock(renderer, fonts, {
    reference: buildReference(id, issuedAt),
    issuedFormatted: formatIssuedDate(issuedAt),
    clientName,
    clientEmail,
  });

  // Transaction details
  drawTransactionBlock(renderer, fonts, transactionType, inputs);

  // Legal fees
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

  // Disbursements
  const disbursementRows = (output?.disbursements || []).map((it) => ({
    label: it.label,
    amount: it.amount,
  }));
  if (disbursementRows.length > 0) {
    drawBreakdownSection(renderer, fonts, "Disbursements", disbursementRows, {
      subtotalLabel: "Disbursements subtotal",
      subtotalAmount: Number(output?.disbursementsTotal) || 0,
    });
  }

  // SDLT
  const sdlt = Number(output?.sdlt) || 0;
  if (sdlt > 0) {
    drawBreakdownSection(
      renderer,
      fonts,
      "Stamp Duty Land Tax",
      [{ label: "Estimated SDLT", amount: sdlt }]
    );
  }

  // VAT
  const vat = Number(output?.vat) || 0;
  if (vat > 0) {
    drawBreakdownSection(renderer, fonts, "VAT", [
      { label: "VAT (20%)", amount: vat },
    ]);
  }

  // Grand total
  drawGrandTotal(renderer, fonts, Number(output?.grandTotal) || 0);

  // Disclaimer + page footer on every page
  drawDisclaimerOnEveryPage(renderer, fonts);
  drawPageFooters(renderer, fonts);

  return pdfDoc.save();
}

// ── HTTP handler ─────────────────────────────────────────────────────

export async function onRequestGet(context) {
  const { request, env } = context;
  let quoteId = null;

  try {
    const token = getTokenFromRequest(request);
    const session = await validateSession(env.DB, token, "firm");
    if (!session) return unauthorised();

    const firmId = session.user_id;

    const firm = await env.DB.prepare(
      `SELECT id, is_saas_firm FROM panel_firms WHERE id = ? LIMIT 1`
    )
      .bind(firmId)
      .first();

    if (!firm) {
      return jsonResponse({ success: false, error: "Firm not found." }, 404);
    }
    if (Number(firm.is_saas_firm) !== 1) {
      return jsonResponse(
        {
          success: false,
          error: "This firm is not enabled for the quoting product.",
        },
        403
      );
    }

    const url = new URL(request.url);
    const rawIdParam = url.searchParams.get("id");
    const rawId = Number(rawIdParam);
    if (
      rawIdParam === null ||
      rawIdParam === "" ||
      !Number.isFinite(rawId) ||
      !Number.isInteger(rawId) ||
      rawId <= 0
    ) {
      return jsonResponse({ success: false, error: "Invalid quote id" }, 400);
    }
    quoteId = rawId;

    const row = await env.DB.prepare(
      `SELECT id, firm_id, client_name, client_email, transaction_type,
              quote_inputs, quote_output, grand_total, issued_at, notes
         FROM firm_issued_quotes
        WHERE id = ?
        LIMIT 1`
    )
      .bind(quoteId)
      .first();

    // Same posture as firm-quote-saved.js: surface other-firm rows as 404
    // so the endpoint doesn't leak the id space.
    if (!row || Number(row.firm_id) !== Number(firmId)) {
      return jsonResponse({ success: false, error: "Quote not found." }, 404);
    }

    let inputs = null;
    let output = null;
    try {
      inputs = JSON.parse(row.quote_inputs);
    } catch {
      inputs = null;
    }
    try {
      output = JSON.parse(row.quote_output);
    } catch {
      output = null;
    }

    if (!output || typeof output !== "object") {
      console.error(
        `firm-quote-pdf: quote ${quoteId} has unparseable quote_output`
      );
      return jsonResponse(
        { success: false, error: "PDF generation failed - contact support." },
        500
      );
    }

    const clientName = String(row.client_name || "");
    const clientEmail = String(row.client_email || "");
    const issuedAt = String(row.issued_at || "");
    const transactionType = String(row.transaction_type || "");

    const pdfBytes = await buildQuotePdf({
      id: Number(row.id),
      clientName,
      clientEmail,
      issuedAt,
      transactionType,
      inputs,
      output,
    });

    const filename = buildFilename(Number(row.id), clientName, issuedAt);

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error(
      `firm-quote-pdf error (quoteId=${quoteId}):`,
      error
    );
    return jsonResponse(
      { success: false, error: "PDF generation failed - contact support." },
      500
    );
  }
}
