#!/usr/bin/env node
//
// scripts/backfill-referrer-quote-json.js
//
// One-off backfill: inject form-body fields into quote_json for
// historical referrer-submitted enquiries created BEFORE PR #49.
//
// Why
// ---
// Before PR #49, functions/api/referrer-submit-enquiry.js stored
// quote_json as just JSON.stringify(quote) — the calculation output
// only. The form-body fields (e.g. saleMortgage) lived ONLY in the
// dedicated DB columns (enquiries.sale_mortgage, etc.). After PR #49
// the endpoint spreads the form body in: JSON.stringify({ ...body,
// ...quote }), so new rows are self-contained.
//
// Phase B's column-drop migration (0016) is about to delete 33 of
// those dedicated columns — including sale_mortgage. Without this
// backfill, sale_mortgage on legacy referrer-sale enquiries would be
// permanently lost: admin re-calculation would treat them as cash
// sales and produce wrong quotes.
//
// What it does
// ------------
//   1. Scans every enquiries row with referrer_id IS NOT NULL.
//   2. Reads the row's 33 about-to-be-dropped variant columns.
//   3. Maps any populated values from snake_case columns to the
//      camelCase keys that PR #49 spreads (sale_mortgage → saleMortgage,
//      etc. — full map below).
//   4. Rewrites quote_json = { ...reconstructedBody, ...originalQuote },
//      so calculation-output keys win on collision (spread quote last).
//   5. Idempotent: if quote_json already contains every reconstructed
//      key with the same value, the row is skipped. Re-running is safe.
//
// Safety
// ------
//   * DRY-RUN by default. Pass --apply to actually write.
//   * Only updates quote_json on referrer-submitted rows. Never drops,
//     alters schema, or touches any other table.
//   * Reports counts and sample before/after for human review.
//
// Usage
// -----
//   node scripts/backfill-referrer-quote-json.js              # dry-run
//   node scripts/backfill-referrer-quote-json.js --apply      # write
//
// Requires the wrangler CLI authenticated to the conveyquote-db D1
// binding (the same binding deployed Pages Functions use as env.DB).

import { execFileSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

const DB_NAME = "conveyquote-db";

// The 33 columns being dropped by migration 0016, paired with the
// camelCase form-body keys PR #49 spreads into quote_json. Order
// matches the migration. Source of truth for the mapping is
// referrer-submit-enquiry.js's destructure of `body` plus the
// shadowVariantFields object in get-enquiry.js.
const COLUMN_MAP = [
  // PR1's 17
  ["purchase_tenure", "purchaseTenure"],
  ["purchase_price", "purchasePrice"],
  ["purchase_postcode", "purchasePostcode"],
  ["purchase_mortgage", "purchaseMortgage"],
  ["purchase_lender", "purchaseLender"],
  ["purchase_ownership_type", "purchaseOwnershipType"],
  ["purchase_first_time_buyer", "purchaseFirstTimeBuyer"],
  ["purchase_new_build", "purchaseNewBuild"],
  ["purchase_shared_ownership", "purchaseSharedOwnership"],
  ["purchase_help_to_buy", "purchaseHelpToBuy"],
  ["purchase_is_company", "purchaseIsCompany"],
  ["purchase_buy_to_let", "purchaseBuyToLet"],
  ["purchase_gifted_deposit", "purchaseGiftedDeposit"],
  ["purchase_additional_property", "purchaseAdditionalProperty"],
  ["purchase_uk_resident_for_sdlt", "purchaseUkResidentForSdlt"],
  ["purchase_lifetime_isa", "purchaseLifetimeIsa"],
  ["remortgage_transfer_has_mortgage", "remortgageTransferHasMortgage"],
  // PR2's 16
  ["sale_tenure", "saleTenure"],
  ["sale_price", "salePrice"],
  ["sale_postcode", "salePostcode"],
  ["sale_mortgage", "saleMortgage"],
  ["sale_mortgage_combined", "saleMortgageCombined"],
  ["management_company_combined", "managementCompanyCombined"],
  ["tenanted_combined", "tenantedCombined"],
  ["number_of_sellers_combined", "numberOfSellersCombined"],
  ["remortgage_transfer_tenure", "remortgageTransferTenure"],
  ["remortgage_transfer_price", "remortgageTransferPrice"],
  ["remortgage_transfer_postcode", "remortgageTransferPostcode"],
  ["remortgage_transfer_current_lender", "remortgageTransferCurrentLender"],
  ["remortgage_transfer_new_lender", "remortgageTransferNewLender"],
  ["remortgage_transfer_additional_borrowing", "remortgageTransferAdditionalBorrowing"],
  ["remortgage_transfer_owners_changing", "remortgageTransferOwnersChanging"],
  ["remortgage_transfer_ownership_type", "remortgageTransferOwnershipType"],
];

const ARGS = process.argv.slice(2);
const APPLY = ARGS.includes("--apply");

function wranglerJson(sql) {
  const stdout = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", DB_NAME, "--remote", "--json", "--command", sql],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }
  );
  // wrangler emits a JSON array of result blocks. Be defensive about
  // any non-JSON banner lines wrangler might prefix.
  const firstBrace = stdout.indexOf("[");
  const payload = firstBrace >= 0 ? stdout.slice(firstBrace) : stdout;
  const parsed = JSON.parse(payload);
  return Array.isArray(parsed) ? parsed : [];
}

function wranglerApplyFile(path) {
  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", DB_NAME, "--remote", `--file=${path}`],
    { encoding: "utf8", stdio: ["ignore", "inherit", "inherit"] }
  );
}

function buildSelect() {
  const cols = ["id", "reference", "referrer_id", "quote_json", ...COLUMN_MAP.map(([s]) => s)];
  return `SELECT ${cols.join(", ")} FROM enquiries WHERE referrer_id IS NOT NULL`;
}

function reconstructBody(row) {
  const out = {};
  for (const [snake, camel] of COLUMN_MAP) {
    const v = row[snake];
    if (v !== null && v !== undefined && v !== "") {
      out[camel] = v;
    }
  }
  return out;
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function summarise(obj, limit = 5) {
  const keys = Object.keys(obj);
  const head = keys.slice(0, limit).map((k) => `${k}=${JSON.stringify(obj[k])}`);
  const tail = keys.length > limit ? `, +${keys.length - limit} more` : "";
  return `{ ${head.join(", ")}${tail} }`;
}

function previewKeys(obj, limit = 12) {
  const keys = Object.keys(obj);
  const head = keys.slice(0, limit).join(", ");
  const tail = keys.length > limit ? ", ..." : "";
  return head + tail;
}

async function main() {
  console.log(`\n[backfill-referrer-quote-json] mode: ${APPLY ? "APPLY (will write)" : "DRY-RUN (no writes)"}`);
  console.log(`Database: ${DB_NAME} (remote)`);
  console.log("Querying referrer-submitted enquiries...");

  const result = wranglerJson(buildSelect());
  const rows = result?.[0]?.results || [];
  console.log(`  scanned: ${rows.length} referrer-submitted rows`);

  const toUpdate = [];
  const skippedNoData = [];
  const skippedAlreadyDone = [];
  const skippedBadJson = [];

  for (const row of rows) {
    const reconstructed = reconstructBody(row);

    if (Object.keys(reconstructed).length === 0) {
      // Nothing in the 33 columns to recover. The data isn't being
      // lost, so the row needs no rewrite.
      skippedNoData.push(row.id);
      continue;
    }

    let parsed = null;
    if (row.quote_json) {
      try { parsed = JSON.parse(row.quote_json); } catch { /* handled below */ }
    }
    if (parsed === null || typeof parsed !== "object") {
      skippedBadJson.push(row.id);
      continue;
    }

    // Idempotency check: skip if every key we would inject is already
    // present in quote_json with a matching value. Compared as strings
    // because DB columns surface as strings (or numbers for INTEGER /
    // REAL) and JSON.parse round-trips numbers as numbers.
    const allMatch = Object.entries(reconstructed).every(([k, v]) => {
      const existing = parsed[k];
      return existing !== undefined && String(existing) === String(v);
    });
    if (allMatch) {
      skippedAlreadyDone.push(row.id);
      continue;
    }

    // PR #49's shape: form body first, calculation output spread last
    // so calc-output keys win on collision.
    const newQuote = { ...reconstructed, ...parsed };
    toUpdate.push({
      id: row.id,
      reference: row.reference,
      injected: reconstructed,
      before: parsed,
      after: newQuote,
    });
  }

  console.log(`  needing backfill: ${toUpdate.length}`);
  console.log(`  already idempotent: ${skippedAlreadyDone.length}`);
  console.log(`  no recoverable data in dropped columns: ${skippedNoData.length}`);
  console.log(`  unparseable quote_json (skipped): ${skippedBadJson.length}`);
  if (skippedBadJson.length > 0) {
    console.log(`    -> ids: ${skippedBadJson.join(", ")}`);
  }

  if (toUpdate.length === 0) {
    console.log("\nNothing to do. Exiting.\n");
    return;
  }

  console.log("\nSample (up to 3) before / after:");
  for (const s of toUpdate.slice(0, 3)) {
    console.log(`  id=${s.id} ref=${s.reference}`);
    console.log(`    injecting: ${summarise(s.injected)}`);
    console.log(`    before keys: ${previewKeys(s.before)}`);
    console.log(`    after  keys: ${previewKeys(s.after)}`);
  }

  if (!APPLY) {
    console.log("\nDRY-RUN complete. Re-run with --apply to write these changes.\n");
    return;
  }

  console.log(`\nApplying ${toUpdate.length} UPDATEs via wrangler d1 execute --file ...`);
  const tmpFile = resolve(process.cwd(), `.tmp-backfill-${Date.now()}.sql`);
  const lines = toUpdate.map(
    (u) => `UPDATE enquiries SET quote_json = ${sqlString(JSON.stringify(u.after))} WHERE id = ${Number(u.id)};`
  );
  writeFileSync(tmpFile, lines.join("\n") + "\n", "utf8");

  try {
    wranglerApplyFile(tmpFile);
    console.log(`  wrote ${toUpdate.length} rows`);
  } finally {
    try { unlinkSync(tmpFile); } catch { /* ignore */ }
  }

  console.log("\nDone.\n");
}

main().catch((error) => {
  console.error("\n[backfill-referrer-quote-json] FAILED:", error);
  process.exit(1);
});
