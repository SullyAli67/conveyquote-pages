// Design tokens for the ConveyQuote PDF guide system.
// A4, 20mm margins, navy/teal brand palette, Helvetica (metrically ~Arial,
// matches the site's "Arial, Helvetica, sans-serif" stack, no font embedding).

const PT_PER_MM = 72 / 25.4; // 2.8346
const PAGE = { w: 595.28, h: 841.89 }; // A4 in points
const MARGIN = 20 * PT_PER_MM; // ~56.69pt
const HEADER_H = 30; // reserved top zone for the running wordmark
const FOOTER_H = 22; // reserved bottom zone for the footer rule + text
const CONTENT_W = PAGE.w - 2 * MARGIN;

const COLORS = {
  navy: "#062a63",
  navyMid: "#0a3d6e",
  teal: "#0aa6b5",
  tealDark: "#078e9b",
  tealTint: "#e7f6f8", // callout / light-teal background
  tealTintMid: "#d3eef1",
  body: "#444444",
  muted: "#667085",
  grayHeader: "#eef2f7", // table header row
  grayRow: "#f7fafc", // zebra row
  border: "#d9e2ec",
  white: "#ffffff",
};

const FONTS = {
  reg: "Helvetica",
  bold: "Helvetica-Bold",
  oblique: "Helvetica-Oblique",
};

const SIZE = {
  body: 11,
  h1: 20,
  h2: 14,
  h3: 11.5,
  cover: 28,
  coverSub: 14,
  table: 9,
  footer: 8,
  small: 9.5,
  badge: 8,
};

// 1.5 line-height at 11pt ≈ 16.5pt leading; Helvetica default leading is
// ~1.15*size, so we add ~3.8pt of lineGap on body copy.
const LINE_GAP = 4;

const CONTACT = "ConveyQuote  |  conveyquote.uk  |  07592 654 666";
const VERSION = "Edition: June 2026";

module.exports = {
  PT_PER_MM, PAGE, MARGIN, HEADER_H, FOOTER_H, CONTENT_W,
  COLORS, FONTS, SIZE, LINE_GAP, CONTACT, VERSION,
};
