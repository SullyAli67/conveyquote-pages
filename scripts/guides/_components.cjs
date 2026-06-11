// Reusable PDF renderers for the ConveyQuote guide system. Flowing content
// with manual page-break management; header/footer chrome post-stamped onto
// every page except the cover via bufferPages + switchToPage.
const D = require("./_design.cjs");
const { COLORS, FONTS, SIZE, PAGE, MARGIN, HEADER_H, FOOTER_H, CONTENT_W, LINE_GAP, CONTACT, VERSION } = D;

function startDoc() {
  const PDFDocument = require("pdfkit");
  return new PDFDocument({
    size: "A4",
    autoFirstPage: false,
    bufferPages: true,
    margins: { top: MARGIN + HEADER_H, bottom: MARGIN + FOOTER_H, left: MARGIN, right: MARGIN },
    info: { Author: "ConveyQuote", Creator: "ConveyQuote Guide Generator" },
  });
}

const contentBottom = (doc) => PAGE.h - doc.page.margins.bottom;
function ensureSpace(doc, h) {
  if (doc.y + h > contentBottom(doc)) doc.addPage();
}
const resetX = (doc) => { doc.x = MARGIN; };

// ── Icons (simple 1-colour vector glyphs in an s×s box) ─────────────
function drawIcon(doc, name, x, y, s, color) {
  doc.save();
  const lw = Math.max(1, s * 0.11);
  doc.lineWidth(lw).strokeColor(color).fillColor(color).lineJoin("round").lineCap("round");
  switch (name) {
    case "house":
      doc.path(`M ${x + s * 0.06} ${y + s * 0.5} L ${x + s / 2} ${y + s * 0.08} L ${x + s * 0.94} ${y + s * 0.5}`).stroke();
      doc.path(`M ${x + s * 0.2} ${y + s * 0.46} L ${x + s * 0.2} ${y + s * 0.92} L ${x + s * 0.8} ${y + s * 0.92} L ${x + s * 0.8} ${y + s * 0.46}`).stroke();
      break;
    case "key":
      doc.circle(x + s * 0.3, y + s * 0.3, s * 0.2).stroke();
      doc.path(`M ${x + s * 0.44} ${y + s * 0.44} L ${x + s * 0.9} ${y + s * 0.9}`).stroke();
      doc.path(`M ${x + s * 0.72} ${y + s * 0.72} L ${x + s * 0.86} ${y + s * 0.58}`).stroke();
      break;
    case "check":
      doc.path(`M ${x + s * 0.12} ${y + s * 0.55} L ${x + s * 0.4} ${y + s * 0.82} L ${x + s * 0.9} ${y + s * 0.2}`).stroke();
      break;
    case "clock":
      doc.circle(x + s / 2, y + s / 2, s * 0.42).stroke();
      doc.path(`M ${x + s / 2} ${y + s * 0.28} L ${x + s / 2} ${y + s / 2} L ${x + s * 0.7} ${y + s * 0.6}`).stroke();
      break;
    case "pound":
      doc.font(FONTS.bold).fontSize(s).fillColor(color).text("£", x, y + s * 0.04, { width: s, align: "center", lineBreak: false });
      break;
    case "doc":
      doc.path(`M ${x + s * 0.22} ${y + s * 0.06} L ${x + s * 0.62} ${y + s * 0.06} L ${x + s * 0.8} ${y + s * 0.24} L ${x + s * 0.8} ${y + s * 0.94} L ${x + s * 0.22} ${y + s * 0.94} Z`).stroke();
      doc.path(`M ${x + s * 0.35} ${y + s * 0.45} L ${x + s * 0.67} ${y + s * 0.45}`).stroke();
      doc.path(`M ${x + s * 0.35} ${y + s * 0.62} L ${x + s * 0.67} ${y + s * 0.62}`).stroke();
      break;
    case "coins":
      doc.ellipse(x + s * 0.5, y + s * 0.28, s * 0.36, s * 0.16).stroke();
      doc.path(`M ${x + s * 0.14} ${y + s * 0.28} L ${x + s * 0.14} ${y + s * 0.66}`).stroke();
      doc.path(`M ${x + s * 0.86} ${y + s * 0.28} L ${x + s * 0.86} ${y + s * 0.66}`).stroke();
      doc.ellipse(x + s * 0.5, y + s * 0.66, s * 0.36, s * 0.16).stroke();
      break;
    case "shield":
      doc.path(`M ${x + s / 2} ${y + s * 0.06} L ${x + s * 0.9} ${y + s * 0.22} L ${x + s * 0.9} ${y + s * 0.5} Q ${x + s * 0.9} ${y + s * 0.86} ${x + s / 2} ${y + s * 0.96} Q ${x + s * 0.1} ${y + s * 0.86} ${x + s * 0.1} ${y + s * 0.5} L ${x + s * 0.1} ${y + s * 0.22} Z`).stroke();
      doc.path(`M ${x + s * 0.32} ${y + s * 0.5} L ${x + s * 0.46} ${y + s * 0.64} L ${x + s * 0.72} ${y + s * 0.34}`).stroke();
      break;
    case "chart":
      doc.path(`M ${x + s * 0.12} ${y + s * 0.92} L ${x + s * 0.12} ${y + s * 0.08}`).stroke();
      doc.path(`M ${x + s * 0.12} ${y + s * 0.92} L ${x + s * 0.92} ${y + s * 0.92}`).stroke();
      doc.path(`M ${x + s * 0.3} ${y + s * 0.92} L ${x + s * 0.3} ${y + s * 0.6}`).stroke();
      doc.path(`M ${x + s * 0.52} ${y + s * 0.92} L ${x + s * 0.52} ${y + s * 0.4}`).stroke();
      doc.path(`M ${x + s * 0.74} ${y + s * 0.92} L ${x + s * 0.74} ${y + s * 0.22}`).stroke();
      break;
    default:
      doc.circle(x + s / 2, y + s / 2, s * 0.45).fill(color);
  }
  doc.restore();
}

// ── Brand lockup (vector wordmark + teal tile) ──────────────────────
function brandLockup(doc, leftX, topY, scale, onDark) {
  const tile = 30 * scale;
  doc.roundedRect(leftX, topY, tile, tile, 6 * scale).fill(COLORS.teal);
  drawIcon(doc, "house", leftX + tile * 0.2, topY + tile * 0.2, tile * 0.6, COLORS.white);
  doc.font(FONTS.bold).fontSize(20 * scale).fillColor(onDark ? COLORS.white : COLORS.navy)
    .text("ConveyQuote", leftX + tile + 8 * scale, topY + tile * 0.18, { lineBreak: false });
}

// ── Cover page ──────────────────────────────────────────────────────
function coverPage(doc, g) {
  doc.addPage();
  // Cover is fully hand-positioned — zero margins so absolute-placed text
  // (e.g. the bottom strip) never trips PDFKit's auto-pagination.
  doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };
  const W = PAGE.w, H = PAGE.h;
  doc.rect(0, 0, W, 250).fill(COLORS.navy);
  doc.rect(0, 250, W, 5).fill(COLORS.teal);
  brandLockup(doc, MARGIN, 52, 1, true);
  doc.fillColor(COLORS.teal).font(FONTS.bold).fontSize(10)
    .text((g.category || "GUIDE").toUpperCase(), MARGIN, 140, { width: W - 2 * MARGIN, align: "center", characterSpacing: 3 });
  doc.fillColor(COLORS.white).font(FONTS.bold).fontSize(SIZE.cover)
    .text(g.title, MARGIN + 20, 168, { width: W - 2 * MARGIN - 40, align: "center" });

  // big teal icon in a tinted disc
  const cy = 370;
  doc.circle(W / 2, cy, 52).fill(COLORS.tealTint);
  drawIcon(doc, g.icon || "house", W / 2 - 28, cy - 28, 56, COLORS.tealDark);

  doc.fillColor(COLORS.navy).font(FONTS.bold).fontSize(SIZE.coverSub)
    .text(g.subtitle, MARGIN + 30, 460, { width: W - 2 * MARGIN - 60, align: "center" });
  doc.fillColor(COLORS.body).font(FONTS.reg).fontSize(SIZE.body)
    .text(g.coverBlurb, MARGIN + 50, doc.y + 12, { width: W - 2 * MARGIN - 100, align: "center", lineGap: 4 });

  // bottom strip
  doc.rect(0, H - 70, W, 70).fill(COLORS.navy);
  doc.fillColor("#9fb6d6").font(FONTS.reg).fontSize(9)
    .text(VERSION + "        conveyquote.uk        " + (g.coverFootCta || "Get your free quote at conveyquote.uk"),
      MARGIN, H - 44, { width: W - 2 * MARGIN, align: "center" });
}

// ── Headings ────────────────────────────────────────────────────────
function h1(doc, text, icon) {
  // Each major section starts at the top of a fresh page. The first section
  // lands on the already-fresh first content page (no extra break).
  const atTop = doc.y <= doc.page.margins.top + 1;
  if (!atTop) doc.addPage();
  resetX(doc);
  const y = doc.y;
  let tx = MARGIN;
  if (icon) { drawIcon(doc, icon, MARGIN, y + 1, 20, COLORS.teal); tx = MARGIN + 30; }
  doc.font(FONTS.bold).fontSize(SIZE.h1).fillColor(COLORS.navy).text(text, tx, y, { width: CONTENT_W - (tx - MARGIN) });
  doc.moveDown(0.25);
  const dy = doc.y;
  doc.moveTo(MARGIN, dy).lineTo(MARGIN + 46, dy).lineWidth(3).strokeColor(COLORS.teal).stroke();
  doc.moveDown(0.7);
  resetX(doc);
}
function h2(doc, text) {
  ensureSpace(doc, 44);
  doc.moveDown(0.5); resetX(doc);
  doc.font(FONTS.bold).fontSize(SIZE.h2).fillColor(COLORS.navy).text(text, MARGIN, doc.y, { width: CONTENT_W });
  doc.moveDown(0.5); resetX(doc);
}
function h3(doc, text) {
  ensureSpace(doc, 30); doc.moveDown(0.3); resetX(doc);
  doc.font(FONTS.bold).fontSize(SIZE.h3).fillColor(COLORS.navyMid).text(text, MARGIN, doc.y, { width: CONTENT_W });
  doc.moveDown(0.25); resetX(doc);
}

// ── Text ────────────────────────────────────────────────────────────
function para(doc, text, opt = {}) {
  resetX(doc);
  doc.font(opt.bold ? FONTS.bold : FONTS.reg).fontSize(opt.size || SIZE.body).fillColor(opt.color || COLORS.body);
  doc.text(text, MARGIN, doc.y, { width: CONTENT_W, align: opt.align || "left", lineGap: LINE_GAP });
  doc.moveDown(opt.gap != null ? opt.gap : 0.55);
}
function bullets(doc, items) {
  items.forEach((it) => {
    doc.font(FONTS.reg).fontSize(SIZE.body).fillColor(COLORS.body);
    const w = CONTENT_W - 16;
    const h = doc.heightOfString(it, { width: w, lineGap: LINE_GAP });
    ensureSpace(doc, h + 5);
    const y = doc.y;
    doc.circle(MARGIN + 3, y + 5.5, 1.9).fill(COLORS.teal);
    doc.fillColor(COLORS.body).font(FONTS.reg).fontSize(SIZE.body).text(it, MARGIN + 14, y, { width: w, lineGap: LINE_GAP });
    doc.y = Math.max(doc.y, y + h) + 4; resetX(doc);
  });
  doc.moveDown(0.3);
}

// ── Callout ─────────────────────────────────────────────────────────
function callout(doc, title, text) {
  const innerW = CONTENT_W - 30;
  doc.font(FONTS.reg).fontSize(SIZE.body);
  const titleH = title ? 17 : 0;
  const textH = doc.heightOfString(text, { width: innerW, lineGap: 3 });
  const boxH = titleH + textH + 22;
  ensureSpace(doc, boxH + 8);
  const y = doc.y;
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 8).fill(COLORS.tealTint);
  doc.roundedRect(MARGIN, y, 5, boxH, 2).fill(COLORS.teal);
  let ty = y + 11;
  if (title) {
    doc.font(FONTS.bold).fontSize(SIZE.body).fillColor(COLORS.tealDark).text(title, MARGIN + 16, ty, { width: innerW });
    ty += titleH;
  }
  doc.font(FONTS.reg).fontSize(SIZE.body).fillColor(COLORS.body).text(text, MARGIN + 16, ty, { width: innerW, lineGap: 3 });
  doc.y = y + boxH + 10; resetX(doc);
}

// ── Table (gray header, zebra rows, page-break aware) ───────────────
function table(doc, { headers, rows, widths }) {
  const total = widths.reduce((a, b) => a + b, 0);
  const cols = widths.map((w) => (w / total) * CONTENT_W);
  const padX = 6, padY = 5;
  const drawHeader = (y) => {
    doc.rect(MARGIN, y, CONTENT_W, headerH).fill(COLORS.grayHeader);
    let x = MARGIN;
    doc.font(FONTS.bold).fontSize(SIZE.table).fillColor(COLORS.navy);
    headers.forEach((hh, i) => { doc.text(hh, x + padX, y + padY, { width: cols[i] - 2 * padX }); x += cols[i]; });
    return y + headerH;
  };
  doc.font(FONTS.bold).fontSize(SIZE.table);
  const headerH = Math.max(...headers.map((hh, i) => doc.heightOfString(hh, { width: cols[i] - 2 * padX }))) + 2 * padY;
  ensureSpace(doc, headerH + 26);
  let y = drawHeader(doc.y);
  rows.forEach((row, ri) => {
    doc.font(FONTS.reg).fontSize(SIZE.table);
    const rowH = Math.max(...row.map((c, i) => doc.heightOfString(String(c), { width: cols[i] - 2 * padX, lineGap: 2 }))) + 2 * padY;
    if (y + rowH > contentBottom(doc)) { doc.addPage(); y = drawHeader(doc.y); }
    if (ri % 2 === 1) doc.rect(MARGIN, y, CONTENT_W, rowH).fill(COLORS.grayRow);
    let cx = MARGIN;
    doc.font(FONTS.reg).fontSize(SIZE.table).fillColor(COLORS.body);
    row.forEach((c, i) => {
      const bold = typeof c === "string" && c.startsWith("**");
      const val = bold ? c.replace(/\*\*/g, "") : String(c);
      doc.font(bold ? FONTS.bold : FONTS.reg).fillColor(bold ? COLORS.navy : COLORS.body)
        .text(val, cx + padX, y + padY, { width: cols[i] - 2 * padX, lineGap: 2 });
      cx += cols[i];
    });
    doc.moveTo(MARGIN, y + rowH).lineTo(MARGIN + CONTENT_W, y + rowH).lineWidth(0.4).strokeColor(COLORS.border).stroke();
    y += rowH;
  });
  doc.rect(MARGIN, doc.y, 0, 0); // no-op to settle state
  doc.y = y + 12; resetX(doc);
}

// ── Checklist ───────────────────────────────────────────────────────
function checklist(doc, items) {
  items.forEach((it) => {
    doc.font(FONTS.reg).fontSize(SIZE.body);
    const w = CONTENT_W - 26;
    const h = Math.max(15, doc.heightOfString(it, { width: w, lineGap: 3 }));
    ensureSpace(doc, h + 7);
    const y = doc.y;
    doc.roundedRect(MARGIN, y + 1, 12, 12, 2).lineWidth(1.2).strokeColor(COLORS.teal).stroke();
    doc.fillColor(COLORS.body).font(FONTS.reg).fontSize(SIZE.body).text(it, MARGIN + 22, y, { width: w, lineGap: 3 });
    doc.y = Math.max(doc.y, y + h) + 7; resetX(doc);
  });
  doc.moveDown(0.2);
}

// ── Timeline ────────────────────────────────────────────────────────
function timeline(doc, stages) {
  const nodeR = 13, gapX = 18;
  stages.forEach((s, idx) => {
    const txtW = CONTENT_W - (nodeR * 2 + gapX);
    doc.font(FONTS.reg).fontSize(SIZE.small);
    const bodyH = s.text ? doc.heightOfString(s.text, { width: txtW, lineGap: 3 }) : 0;
    const stageH = Math.max(nodeR * 2, 16 + (s.dur ? 11 : 0) + bodyH) + 14;
    ensureSpace(doc, stageH + 4);
    const y = doc.y;
    const cx = MARGIN + nodeR;
    if (idx < stages.length - 1) doc.moveTo(cx, y + nodeR * 2).lineTo(cx, y + stageH + 6).lineWidth(2).strokeColor(COLORS.border).stroke();
    doc.circle(cx, y + nodeR, nodeR).fill(COLORS.navy);
    doc.fillColor(COLORS.teal).font(FONTS.bold).fontSize(SIZE.body).text(String(s.n != null ? s.n : idx + 1), cx - nodeR, y + nodeR - 6, { width: nodeR * 2, align: "center" });
    const tx = MARGIN + nodeR * 2 + gapX;
    doc.fillColor(COLORS.navy).font(FONTS.bold).fontSize(SIZE.body).text(s.title, tx, y, { width: txtW });
    if (s.dur) doc.fillColor(COLORS.tealDark).font(FONTS.bold).fontSize(SIZE.badge).text(s.dur.toUpperCase(), tx, doc.y + 1, { width: txtW, characterSpacing: 0.5 });
    if (s.text) doc.fillColor(COLORS.body).font(FONTS.reg).fontSize(SIZE.small).text(s.text, tx, doc.y + 3, { width: txtW, lineGap: 3 });
    doc.y = y + stageH; resetX(doc);
  });
  doc.moveDown(0.3);
}

// ── Process flow (horizontal numbered boxes + chevrons) ─────────────
function processFlow(doc, steps) {
  const n = steps.length, gap = 14, boxW = (CONTENT_W - (n - 1) * gap) / n, boxH = 80;
  ensureSpace(doc, boxH + 18);
  const y = doc.y; let x = MARGIN;
  steps.forEach((st, i) => {
    doc.roundedRect(x, y, boxW, boxH, 8).fill(COLORS.tealTint);
    doc.roundedRect(x, y, boxW, 4, 2).fill(COLORS.teal);
    doc.circle(x + boxW / 2, y + 20, 11).fill(COLORS.navy);
    doc.fillColor(COLORS.teal).font(FONTS.bold).fontSize(SIZE.small).text(String(i + 1), x + boxW / 2 - 11, y + 15, { width: 22, align: "center" });
    doc.fillColor(COLORS.navy).font(FONTS.bold).fontSize(SIZE.small).text(st.title, x + 6, y + 37, { width: boxW - 12, align: "center" });
    if (st.text) doc.fillColor(COLORS.body).font(FONTS.reg).fontSize(8).text(st.text, x + 6, y + 52, { width: boxW - 12, align: "center", lineGap: 1.5 });
    if (i < n - 1) doc.fillColor(COLORS.teal).font(FONTS.bold).fontSize(16).text("›", x + boxW + 1, y + boxH / 2 - 9, { width: gap, align: "center", lineBreak: false });
    x += boxW + gap;
  });
  doc.y = y + boxH + 14; resetX(doc);
}

// ── Dashboard mockup (guide 8) ──────────────────────────────────────
function dashboardMockup(doc) {
  const W = CONTENT_W, boxH = 210;
  ensureSpace(doc, boxH + 16);
  const y = doc.y;
  doc.roundedRect(MARGIN, y, W, boxH, 10).fill(COLORS.white);
  doc.roundedRect(MARGIN, y, W, boxH, 10).lineWidth(1).strokeColor(COLORS.border).stroke();
  doc.roundedRect(MARGIN, y, W, 30, 10).fill(COLORS.navy);
  doc.rect(MARGIN, y + 20, W, 10).fill(COLORS.navy);
  doc.fillColor(COLORS.white).font(FONTS.bold).fontSize(9).text("ConveyQuote  ·  Partner Portal", MARGIN + 12, y + 10);
  doc.fillColor(COLORS.teal).font(FONTS.reg).fontSize(8).text("Dashboard", MARGIN + W - 80, y + 11, { width: 68, align: "right" });
  const cards = [["Referrals this month", "14"], ["Active matters", "9"], ["Completed", "27"], ["Fees earned", "£4,920"]];
  const cw = (W - 48) / 4; let cx = MARGIN + 12;
  cards.forEach((c) => {
    const cyy = y + 42;
    doc.roundedRect(cx, cyy, cw, 48, 6).fill(COLORS.tealTint);
    doc.fillColor(COLORS.muted).font(FONTS.bold).fontSize(6).text(c[0].toUpperCase(), cx + 7, cyy + 8, { width: cw - 14, characterSpacing: 0.4 });
    doc.fillColor(COLORS.navy).font(FONTS.bold).fontSize(16).text(c[1], cx + 7, cyy + 20, { width: cw - 14 });
    cx += cw + 4;
  });
  const ty = y + 102, tw = W - 24;
  doc.rect(MARGIN + 12, ty, tw, 16).fill(COLORS.grayHeader);
  doc.fillColor(COLORS.navy).font(FONTS.bold).fontSize(7);
  ["CLIENT", "TYPE", "STATUS", "FEE"].forEach((hh, i) => doc.text(hh, MARGIN + 18 + i * (tw / 4), ty + 5, { width: tw / 4 - 6 }));
  const rowsD = [["J. Patel", "Purchase", "Searches", "£180"], ["Acme Lettings", "Remortgage", "Completed", "£140"], ["S. Okafor", "Sale & purchase", "Exchanged", "£300"], ["M. Hughes", "Purchase", "Quote sent", "—"]];
  rowsD.forEach((r, i) => {
    const ry = ty + 16 + i * 18;
    if (i % 2 === 1) doc.rect(MARGIN + 12, ry, tw, 18).fill(COLORS.grayRow);
    doc.fillColor(COLORS.body).font(FONTS.reg).fontSize(7.5);
    r.forEach((c, ci) => doc.text(c, MARGIN + 18 + ci * (tw / 4), ry + 5, { width: tw / 4 - 6 }));
  });
  doc.y = y + boxH + 14; resetX(doc);
}

// ── CTA box ─────────────────────────────────────────────────────────
function ctaBox(doc, { heading, text, url }) {
  const innerW = CONTENT_W - 32;
  doc.font(FONTS.reg).fontSize(SIZE.body);
  const th = doc.heightOfString(text, { width: innerW, lineGap: 3 });
  const boxH = 24 + 22 + th + 12 + 22;
  ensureSpace(doc, boxH + 8);
  const y = doc.y;
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 10).fill(COLORS.navy);
  doc.fillColor(COLORS.white).font(FONTS.bold).fontSize(15).text(heading, MARGIN + 16, y + 16, { width: innerW });
  doc.fillColor("#cfe0f5").font(FONTS.reg).fontSize(SIZE.body).text(text, MARGIN + 16, y + 40, { width: innerW, lineGap: 3 });
  const by = y + 40 + th + 10;
  const pillW = doc.widthOfString(url) + 28;
  doc.roundedRect(MARGIN + 16, by, pillW, 20, 10).fill(COLORS.teal);
  doc.fillColor(COLORS.white).font(FONTS.bold).fontSize(10).text(url, MARGIN + 16, by + 5.5, { width: pillW, align: "center" });
  doc.y = y + boxH + 12; resetX(doc);
}

// ── Post-stamp header/footer onto every page except the cover ───────
function finalize(doc, g) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    const idx = range.start + i;
    doc.switchToPage(idx);
    // Drop margins to zero so stamping in the former header/footer zones
    // doesn't trip PDFKit's auto-pagination (which would add blank pages).
    doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };
    if (i === 0) continue; // cover
    doc.font(FONTS.bold).fontSize(11).fillColor(COLORS.navy).text("ConveyQuote", MARGIN, MARGIN - 3, { width: 200, lineBreak: false });
    if (g.headerLabel) doc.font(FONTS.reg).fontSize(8).fillColor(COLORS.muted).text(g.headerLabel, PAGE.w - MARGIN - 240, MARGIN + 1, { width: 240, align: "right" });
    doc.moveTo(MARGIN, MARGIN + HEADER_H - 10).lineTo(PAGE.w - MARGIN, MARGIN + HEADER_H - 10).lineWidth(0.5).strokeColor(COLORS.border).stroke();
    const fy = PAGE.h - MARGIN - FOOTER_H + 4;
    doc.moveTo(MARGIN, fy).lineTo(PAGE.w - MARGIN, fy).lineWidth(0.5).strokeColor(COLORS.border).stroke();
    doc.font(FONTS.reg).fontSize(SIZE.footer).fillColor(COLORS.muted).text(CONTACT, MARGIN, fy + 5, { width: CONTENT_W - 60, lineBreak: false });
    doc.font(FONTS.reg).fontSize(SIZE.footer).fillColor(COLORS.muted).text(String(i + 1), PAGE.w - MARGIN - 40, fy + 5, { width: 40, align: "right" });
  }
}

function renderBlocks(doc, blocks) {
  for (const b of blocks) {
    switch (b.type) {
      case "h1": h1(doc, b.text, b.icon); break;
      case "h2": h2(doc, b.text); break;
      case "h3": h3(doc, b.text); break;
      case "lead": para(doc, b.text, { size: 12, color: COLORS.navyMid, gap: 0.8 }); break;
      case "para": para(doc, b.text, b); break;
      case "bullets": bullets(doc, b.items); break;
      case "callout": callout(doc, b.title, b.text); break;
      case "table": table(doc, b); break;
      case "checklist": checklist(doc, b.items); break;
      case "timeline": timeline(doc, b.stages); break;
      case "processflow": processFlow(doc, b.steps); break;
      case "dashboard": dashboardMockup(doc); break;
      case "cta": ctaBox(doc, b); break;
      case "pagebreak": doc.addPage(); break;
      case "space": doc.moveDown(b.n || 1); break;
      default: break;
    }
  }
}

module.exports = { startDoc, coverPage, finalize, renderBlocks };
