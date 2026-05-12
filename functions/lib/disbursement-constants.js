// Single source of truth for tenure-based disbursement amounts that both
// the server-side JS engine (functions/lib/calculate-quote.js) and the
// customer-facing TS engine (src/priceConfig.ts + src/buildQuoteData.ts)
// must consume. Do NOT reintroduce a hardcoded office-copies constant in
// either engine — call this function instead.
//
// Treated as a tenure-based estimate (not an itemised per-document
// calculation) — the firm reconciles the actual figure on completion.

export function getOfficeCopyEntriesAmount(tenure) {
  if (tenure === "freehold") return 20;
  if (tenure === "leasehold") return 50;
  throw new Error(
    `getOfficeCopyEntriesAmount: invalid tenure '${tenure}' (expected 'freehold' or 'leasehold')`
  );
}
