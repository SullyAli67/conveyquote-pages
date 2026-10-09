// functions/lib/enquiry-reference.js
//
// Enquiry references look like CQ-20261009-4821: the UTC date plus four
// random digits. They used to be generated with no uniqueness check, so
// two enquiries on the same day could share one — and everything from
// sending the quote to the accept link identifies an enquiry by reference.
//
// insertEnquiryWithUniqueReference() picks a reference no existing enquiry
// uses, then inserts the row with it. Migration 0019 adds a UNIQUE index on
// enquiries.reference as the hard guarantee; if two requests race to the
// same reference, the loser's INSERT hits that index and is retried here
// with a fresh reference.

const MAX_INSERT_ATTEMPTS = 3;
// After this many taken four-digit references in one day, widen to six
// digits rather than fail — a day would need thousands of enquiries first.
const FOUR_DIGIT_TRIES = 10;
const SIX_DIGIT_TRIES = 10;

const randomDigits = (count) => {
  const min = 10 ** (count - 1);
  return String(min + Math.floor(Math.random() * 9 * min));
};

async function referenceIsTaken(db, reference) {
  const row = await db
    .prepare(`SELECT 1 AS taken FROM enquiries WHERE reference = ? LIMIT 1`)
    .bind(reference)
    .first();
  return Boolean(row);
}

export async function generateUniqueReference(db, now = new Date()) {
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const plan = [
    ...Array(FOUR_DIGIT_TRIES).fill(4),
    ...Array(SIX_DIGIT_TRIES).fill(6),
  ];
  for (const digits of plan) {
    const reference = `CQ-${date}-${randomDigits(digits)}`;
    if (!(await referenceIsTaken(db, reference))) return reference;
  }
  throw new Error("Could not allocate a unique enquiry reference.");
}

const isUniqueReferenceError = (err) =>
  /UNIQUE constraint failed: enquiries\.reference/i.test(
    String(err instanceof Error ? err.message : err)
  );

// insertRow(db, row) does the actual INSERT; each endpoint keeps its own
// column-filtering insert helper. Returns the reference that was saved.
export async function insertEnquiryWithUniqueReference(db, row, insertRow) {
  for (let attempt = 1; ; attempt++) {
    const reference = await generateUniqueReference(db);
    try {
      await insertRow(db, { ...row, reference });
      return reference;
    } catch (err) {
      if (attempt >= MAX_INSERT_ATTEMPTS || !isUniqueReferenceError(err)) throw err;
    }
  }
}
