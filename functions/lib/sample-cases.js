// functions/lib/sample-cases.js
//
// Sample (demo) cases are seeded by hand with references starting
// "SAMPLE-" — see scripts/demo/seed-sample-cases.sql. They are fictional
// and must never send an email, so every endpoint that can email about a
// specific enquiry checks this before doing anything.

export const SAMPLE_REFERENCE_PREFIX = "SAMPLE-";

export const isSampleReference = (reference) =>
  String(reference || "").startsWith(SAMPLE_REFERENCE_PREFIX);
