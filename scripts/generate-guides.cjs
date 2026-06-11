#!/usr/bin/env node
// Generates all 8 ConveyQuote PDF guides into public/guides/, then verifies
// each (page count vs target, file size, word count) by re-parsing with
// pdf-lib. Run: `npm run generate-guides`  (optional arg = guide id, e.g. 01)
const fs = require("fs");
const path = require("path");
const K = require("./guides/_components.cjs");

const MODULES = [
  "01-ftb-checklist", "02-cost-guide", "03-freehold-leasehold", "04-btl",
  "05-remortgage", "06-agents", "07-broker", "08-referral-overview",
];

const OUT = path.join(__dirname, "..", "public", "guides");
fs.mkdirSync(OUT, { recursive: true });

function countWords(g) {
  let n = 0;
  const add = (s) => { if (typeof s === "string") n += s.split(/\s+/).filter(Boolean).length; };
  for (const b of g.blocks) {
    add(b.text);
    (b.items || []).forEach(add);
    (b.stages || []).forEach((s) => { add(s.title); add(s.text); });
    (b.steps || []).forEach((s) => { add(s.title); add(s.text); });
    if (b.headers) b.headers.forEach(add);
    if (b.rows) b.rows.forEach((r) => r.forEach((c) => add(String(c))));
  }
  add(g.coverBlurb); add(g.subtitle);
  return n;
}

function build(g) {
  return new Promise((resolve, reject) => {
    const doc = K.startDoc();
    const fp = path.join(OUT, g.file);
    const stream = fs.createWriteStream(fp);
    doc.pipe(stream);
    K.coverPage(doc, g);
    doc.addPage(); // first content page
    K.renderBlocks(doc, g.blocks);
    K.finalize(doc, g);
    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

(async () => {
  const filter = process.argv[2];
  const mods = MODULES.filter((m) => !filter || m.startsWith(filter)).map((m) => require(`./guides/${m}.cjs`));
  const { PDFDocument } = require("pdf-lib");
  const rows = [];
  for (const g of mods) {
    await build(g);
    const buf = fs.readFileSync(path.join(OUT, g.file));
    const pdf = await PDFDocument.load(buf);
    const pages = pdf.getPageCount();
    const kb = Math.round(buf.length / 1024);
    const words = countWords(g);
    const okPages = Math.abs(pages - g.pagesTarget) <= 3;
    rows.push({ file: g.file, pages, target: g.pagesTarget, kb, words, ok: okPages });
  }
  console.log("\n  Guide".padEnd(52) + "Pages  Target   Size   Words");
  console.log("  " + "-".repeat(82));
  for (const r of rows) {
    console.log(
      "  " + r.file.padEnd(50) +
      String(r.pages).padEnd(7) + String(r.target).padEnd(9) +
      (r.kb + "KB").padEnd(8) + String(r.words).padEnd(7) + (r.ok ? "" : "  ⚠ page count off target")
    );
  }
  console.log("");
})().catch((e) => { console.error(e); process.exit(1); });
