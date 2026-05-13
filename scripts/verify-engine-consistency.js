#!/usr/bin/env node
//
// scripts/verify-engine-consistency.js
//
// Runs a canonical set of quote scenarios through both quote engines —
// the server-side JS engine (functions/lib/calculate-quote.js, called by
// send-quote.js and send-approved-quote.js) and the customer-facing TS
// engine (src/buildQuoteData.ts, used by the public preview on
// conveyquote.uk) — and reports any per-line or grand-total divergence.
//
// Why both: pricing logic is duplicated across two engines today (server
// JS and client TS). They must produce identical output for the same
// inputs. Drift between them = customer sees one number on the website
// and gets billed another. This harness catches drift early.
//
// Run with: npm run verify-engines
//
// Exit code: 0 if both engines produce identical output for every
// scenario, 1 if any divergence (per-line amount, missing line, or
// grand-total mismatch beyond a 1p rounding tolerance).
//
// ── Known pre-existing divergences (tracked separately, NOT fixed here)
// At time of writing, the following divergences are known and will cause
// non-zero exit until they're fixed in their own PRs:
//   1. Leasehold supplement on purchase: JS hardcodes £350,
//      TS reads £300 from priceConfig.ts. Affects every leasehold purchase
//      and the purchase leg of every leasehold sale_purchase.
//   2. Telegraphic Transfer fee on remortgage: TS adds a £45 line, JS
//      does not. Affects every remortgage (single or combined).
//   3. remortgage_transfer composition: JS uses a dedicated function
//      with a minimal fee set; TS composes buildRemortgage + buildTransfer
//      and emits a richer fee list (two TT fees, two leasehold supplements
//      on leasehold matters, etc.). Affects every remortgage_transfer.
// If you fix one of the above, the harness will start passing for that
// scenario row. When all three are fixed, exit code becomes 0.

import * as esbuild from "esbuild";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildQuoteData as buildJsEngine } from "../functions/lib/calculate-quote.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const TMP_DIR = resolve(REPO_ROOT, ".tmp-verify-engines");
const ROUNDING_TOLERANCE = 0.005; // half a penny

// ── ANSI colours (cheap, no dep) ────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

// Re-usable defaults so each fixture only states what differs.
const purchaseDefaults = {
  type: "purchase",
  tenure: "freehold",
  mortgage: "mortgage",
  ownershipType: "individual",
  firstTimeBuyer: "no",
  additionalProperty: "no",
  ukResidentForSdlt: "yes",
};

const remortgageDefaults = {
  type: "remortgage",
  tenure: "freehold",
  ownershipType: "individual",
};

const transferDefaults = {
  type: "transfer",
  tenure: "freehold",
  transferMortgage: "yes",
  ownersChanging: "one",
};

const remortgageTransferDefaults = {
  type: "remortgage_transfer",
  remortgageTransferTenure: "freehold",
  remortgageTransferOwnershipType: "individual",
  remortgageTransferOwnersChanging: "one",
  remortgageTransferHasMortgage: "yes",
};

const salePurchaseDefaults = {
  type: "sale_purchase",
  saleTenure: "freehold",
  purchaseTenure: "freehold",
  purchaseOwnershipType: "individual",
  purchaseMortgage: "mortgage",
  purchaseFirstTimeBuyer: "no",
  purchaseAdditionalProperty: "no",
  purchaseUkResidentForSdlt: "yes",
  numberOfSellersCombined: "1",
};

const SCENARIOS = [
  // ── Original scenarios (kept for general drift coverage) ─────────
  { name: "Freehold purchase £255k", input: { ...purchaseDefaults, price: "255000" } },
  { name: "Leasehold purchase £255k", input: { ...purchaseDefaults, price: "255000", tenure: "leasehold" } },
  { name: "Freehold sale £255k", input: { type: "sale", price: "255000", tenure: "freehold", numberOfSellers: "1" } },
  { name: "Leasehold sale £255k", input: { type: "sale", price: "255000", tenure: "leasehold", numberOfSellers: "1" } },
  { name: "Freehold remortgage £200k", input: { ...remortgageDefaults, price: "200000", mortgageAmount: "150000" } },
  { name: "Leasehold remortgage £200k", input: { ...remortgageDefaults, price: "200000", tenure: "leasehold", mortgageAmount: "150000" } },
  { name: "Freehold transfer £200k", input: { ...transferDefaults, price: "200000" } },
  { name: "Leasehold transfer £200k", input: { ...transferDefaults, price: "200000", tenure: "leasehold" } },
  {
    name: "Freehold remortgage+transfer £200k",
    input: {
      ...remortgageTransferDefaults,
      remortgageTransferPrice: "200000",
      remortgageTransferMortgageAmount: "150000",
    },
  },
  {
    name: "Leasehold remortgage+transfer £200k",
    input: {
      ...remortgageTransferDefaults,
      remortgageTransferPrice: "200000",
      remortgageTransferTenure: "leasehold",
      remortgageTransferMortgageAmount: "150000",
    },
  },
  {
    name: "Freehold sale+purchase £255k+£255k",
    input: { ...salePurchaseDefaults, salePrice: "255000", purchasePrice: "255000" },
  },
  {
    name: "Leasehold sale+purchase £255k+£255k",
    input: {
      ...salePurchaseDefaults,
      salePrice: "255000",
      purchasePrice: "255000",
      saleTenure: "leasehold",
      purchaseTenure: "leasehold",
    },
  },

  // ── HMLR Scale 1 bracket coverage (purchase) ─────────────────────
  // Each price sits inside a different Scale 1 band so both engines
  // must produce the same Land Registry fee: 20, 100, 150, 295, 500.
  { name: "Purchase £75k (Scale 1 → £20)", input: { ...purchaseDefaults, price: "75000" } },
  { name: "Purchase £150k (Scale 1 → £100)", input: { ...purchaseDefaults, price: "150000" } },
  { name: "Purchase £350k (Scale 1 → £150)", input: { ...purchaseDefaults, price: "350000" } },
  { name: "Purchase £750k (Scale 1 → £295)", input: { ...purchaseDefaults, price: "750000" } },
  { name: "Purchase £1.2m (Scale 1 → £500)", input: { ...purchaseDefaults, price: "1200000" } },

  // ── HMLR Scale 1 via sale_purchase (purchase leg drives LR) ──────
  {
    name: "Sale+Purchase £350k/£350k (Scale 1 on purchase → £150)",
    input: { ...salePurchaseDefaults, salePrice: "350000", purchasePrice: "350000" },
  },
  {
    name: "Sale+Purchase £750k/£750k (Scale 1 on purchase → £295)",
    input: { ...salePurchaseDefaults, salePrice: "750000", purchasePrice: "750000" },
  },

  // ── HMLR Scale 2 bracket coverage (remortgage on mortgage amount) ─
  { name: "Remortgage £80k mortgage (Scale 2 → £20)", input: { ...remortgageDefaults, price: "200000", mortgageAmount: "80000" } },
  { name: "Remortgage £250k mortgage (Scale 2 → £45)", input: { ...remortgageDefaults, price: "400000", mortgageAmount: "250000" } },
  { name: "Remortgage £600k mortgage (Scale 2 → £65)", input: { ...remortgageDefaults, price: "800000", mortgageAmount: "600000" } },

  // ── HMLR Scale 2 via transfer (property value drives LR) ─────────
  { name: "Transfer £200k property (Scale 2 → £30)", input: { ...transferDefaults, price: "200000" } },
  { name: "Transfer £450k property (Scale 2 → £45)", input: { ...transferDefaults, price: "450000" } },

  // ── HMLR remortgage_transfer: max(Scale 2 mortgage, Scale 2 value) ─
  {
    name: "Remortgage+Transfer £400k value / £80k mortgage (value wins → £45)",
    input: {
      ...remortgageTransferDefaults,
      remortgageTransferPrice: "400000",
      remortgageTransferMortgageAmount: "80000",
    },
  },
  {
    name: "Remortgage+Transfer £150k value / £600k mortgage (mortgage wins → £65)",
    input: {
      ...remortgageTransferDefaults,
      remortgageTransferPrice: "150000",
      remortgageTransferMortgageAmount: "600000",
    },
  },

  // ── Sale-only must NOT bill an LR fee (helper returns 0) ─────────
  {
    name: "Sale £350k (no LR fee)",
    input: { type: "sale", price: "350000", tenure: "freehold", numberOfSellers: "1" },
  },
];

// ── Bundle the TS engine via esbuild and dynamically import it ──────
async function loadTsEngine() {
  if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR);
  const outfile = resolve(TMP_DIR, "build-quote-bundle.mjs");
  await esbuild.build({
    entryPoints: [resolve(REPO_ROOT, "src", "buildQuoteData.ts")],
    outfile,
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "esnext",
    logLevel: "silent",
  });
  const mod = await import(pathToFileURL(outfile).href);
  if (typeof mod.buildQuoteData !== "function") {
    throw new Error("TS engine bundle did not export `buildQuoteData`");
  }
  return mod.buildQuoteData;
}

const fmtGbp = (n) => `£${Number(n || 0).toFixed(2)}`;

function getGrandTotal(quote) {
  const base = Number(quote.grandTotal || 0);
  const sdlt = Number(quote.sdltAmount || 0);
  return Number((base + sdlt).toFixed(2));
}

// Items are equal iff same label + same amount (to nearest penny). We
// don't compare `note` — that's incidental display text, not a value.
function itemsByLabel(items) {
  const map = new Map();
  for (const item of items || []) {
    map.set(String(item.label || ""), Number(Number(item.amount || 0).toFixed(2)));
  }
  return map;
}

function diffLineItems(jsItems, tsItems) {
  const jsMap = itemsByLabel(jsItems);
  const tsMap = itemsByLabel(tsItems);
  const allLabels = new Set([...jsMap.keys(), ...tsMap.keys()]);
  const diffs = [];
  for (const label of allLabels) {
    const jsAmt = jsMap.get(label);
    const tsAmt = tsMap.get(label);
    if (jsAmt === undefined && tsAmt !== undefined) {
      diffs.push({ label, kind: "ts-only", ts: tsAmt });
    } else if (tsAmt === undefined && jsAmt !== undefined) {
      diffs.push({ label, kind: "js-only", js: jsAmt });
    } else if (Math.abs(jsAmt - tsAmt) > ROUNDING_TOLERANCE) {
      diffs.push({ label, kind: "amount-diff", js: jsAmt, ts: tsAmt });
    }
  }
  // Stable order: alphabetical by label.
  diffs.sort((a, b) => a.label.localeCompare(b.label));
  return diffs;
}

function compareScenario(scenario, buildTs) {
  const jsQ = buildJsEngine(scenario.input);
  const tsQ = buildTs(scenario.input);

  const legalDiffs = diffLineItems(jsQ.legalFees, tsQ.legalFees);
  const disbDiffs = diffLineItems(jsQ.disbursements, tsQ.disbursements);
  const jsTotal = getGrandTotal(jsQ);
  const tsTotal = getGrandTotal(tsQ);
  const totalDelta = Number((tsTotal - jsTotal).toFixed(2));
  const totalsMatch = Math.abs(totalDelta) <= ROUNDING_TOLERANCE;

  return {
    name: scenario.name,
    jsTotal,
    tsTotal,
    totalDelta,
    totalsMatch,
    legalDiffs,
    disbDiffs,
    matches: totalsMatch && legalDiffs.length === 0 && disbDiffs.length === 0,
  };
}

function describeDiff(d) {
  if (d.kind === "ts-only") return `+ TS only:   ${d.label.padEnd(38)} ${fmtGbp(d.ts)}`;
  if (d.kind === "js-only") return `+ JS only:   ${d.label.padEnd(38)} ${fmtGbp(d.js)}`;
  return `~ amount:    ${d.label.padEnd(38)} JS ${fmtGbp(d.js)} vs TS ${fmtGbp(d.ts)}`;
}

function printResults(results) {
  console.log("");
  console.log(c.bold + "Quote engine consistency check" + c.reset);
  console.log(c.dim + "JS engine: functions/lib/calculate-quote.js" + c.reset);
  console.log(c.dim + "TS engine: src/buildQuoteData.ts" + c.reset);
  console.log("");

  const pad = 38;
  console.log(
    "Scenario".padEnd(pad) +
      "JS total".padEnd(13) +
      "TS total".padEnd(13) +
      "Δ".padEnd(10) +
      "Result"
  );
  console.log("─".repeat(pad + 13 + 13 + 10 + 10));

  for (const r of results) {
    const status = r.matches
      ? c.green + "OK" + c.reset
      : c.red + "DIVERGES" + c.reset;
    const deltaStr = r.totalDelta === 0 ? "—" : fmtGbp(r.totalDelta);
    console.log(
      r.name.padEnd(pad) +
        fmtGbp(r.jsTotal).padEnd(13) +
        fmtGbp(r.tsTotal).padEnd(13) +
        deltaStr.padEnd(10) +
        status
    );
  }

  // Per-scenario detail for any divergence.
  const failing = results.filter((r) => !r.matches);
  if (failing.length > 0) {
    console.log("");
    console.log(c.bold + "Per-scenario detail:" + c.reset);
    for (const r of failing) {
      console.log("");
      console.log(c.cyan + "  " + r.name + c.reset);
      if (!r.totalsMatch) {
        console.log(
          `    grand total: JS ${fmtGbp(r.jsTotal)} vs TS ${fmtGbp(r.tsTotal)} (Δ ${fmtGbp(r.totalDelta)})`
        );
      }
      if (r.legalDiffs.length > 0) {
        console.log("    legal fees:");
        for (const d of r.legalDiffs) console.log("      " + describeDiff(d));
      }
      if (r.disbDiffs.length > 0) {
        console.log("    disbursements:");
        for (const d of r.disbDiffs) console.log("      " + describeDiff(d));
      }
    }
  }

  console.log("");
  const matchCount = results.length - failing.length;
  if (failing.length === 0) {
    console.log(
      c.green +
        c.bold +
        `✓ All ${results.length} scenarios match across both engines.` +
        c.reset
    );
  } else {
    console.log(
      c.red +
        c.bold +
        `✗ ${failing.length} of ${results.length} scenarios diverge (${matchCount} OK).` +
        c.reset
    );
    console.log(
      c.dim +
        "  See script header for the list of known pre-existing divergences." +
        c.reset
    );
  }
  console.log("");
}

// ── Main ────────────────────────────────────────────────────────────
let exitCode = 0;
try {
  const buildTs = await loadTsEngine();
  const results = SCENARIOS.map((s) => compareScenario(s, buildTs));
  printResults(results);
  exitCode = results.every((r) => r.matches) ? 0 : 1;
} catch (error) {
  console.error(c.red + "verify-engines failed:" + c.reset, error);
  exitCode = 2;
} finally {
  // Always clean up the tmp bundle.
  if (existsSync(TMP_DIR)) {
    rmSync(TMP_DIR, { recursive: true, force: true });
  }
}

process.exit(exitCode);
