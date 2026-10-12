// functions/lib/sample-cases.js
//
// Sample (demo) cases are seeded by hand with references starting
// "SAMPLE-" — see scripts/demo/seed-sample-cases.sql. They are fictional
// and must never send an email, so every endpoint that can email about a
// specific enquiry checks this before doing anything.

export const SAMPLE_REFERENCE_PREFIX = "SAMPLE-";

export const isSampleReference = (reference) =>
  String(reference || "").startsWith(SAMPLE_REFERENCE_PREFIX);

// ── Demo accounts (migration 0022) ──────────────────────────────────
// A referrer listed in referrer_demo_accounts is a demo login: its
// referrals become SAMPLE- cases that are priced and shown at once and
// never emailed or queued for review. If the table is missing (migration
// not yet applied) every referrer is treated as an ordinary one.
export async function isDemoReferrer(db, referrerId) {
  try {
    const row = await db
      .prepare(`SELECT referrer_id FROM referrer_demo_accounts WHERE referrer_id = ? LIMIT 1`)
      .bind(referrerId)
      .first();
    return Boolean(row);
  } catch {
    return false;
  }
}

// ── One-click sample cases ─────────────────────────────────────────
// The same five fictional cases as scripts/demo/seed-sample-cases.sql,
// attached to one referrer. References carry the referrer's id
// (SAMPLE-12-0001 …) so every referrer can have its own set. Fees come
// from the referrer's own rates. Nothing here can send an email: see the
// notes at the top of seed-sample-cases.sql.

const SAMPLE_ROWS = [
  {
    n: 1, client_name: "Sample Buyer One", type: "purchase", tenure: "freehold", price: 285000,
    postcode: "DT1 1AA", address: "1 Example Street, Demo Town", mortgage: "mortgage",
    status: "quote_sent", case_status: null, created: -3, updated: -3,
  },
  {
    n: 2, client_name: "Sample Seller Two", type: "sale", tenure: "freehold", price: 240000,
    postcode: "DT1 2BB", address: "2 Example Road, Demo Town",
    status: "accepted", case_status: "accepted", referred: -9, eta: 55, created: -12, updated: -9,
  },
  {
    n: 3, client_name: "Sample Owner Three", type: "remortgage", tenure: "leasehold", price: 320000,
    postcode: "DT2 3CC", address: "Flat 3, Example Court, Demo Town",
    status: "accepted", case_status: "searches_ordered", referred: -24, eta: 20, created: -26, updated: -4,
  },
  {
    n: 4, client_name: "Sample Seller Four", type: "sale", tenure: "freehold", price: 195000,
    postcode: "DT3 4DD", address: "4 Example Avenue, Demo Town",
    status: "accepted", case_status: "exchanged", referred: -42, eta: 10, target: 10, created: -45, updated: -2,
  },
  {
    n: 5, client_name: "Sample Buyer Five", type: "purchase", tenure: "freehold", price: 310000,
    postcode: "DT4 5EE", address: "5 Example Close, Demo Town", mortgage: "mortgage",
    status: "accepted", case_status: "completed", referred: -72, created: -75, updated: -12, paid: -5,
  },
];

const days = (n) => `${n >= 0 ? "+" : ""}${n} days`;
const MAIN_FEE_TYPES = new Set(["purchase", "sale", "sale_purchase"]);

export async function countSampleCases(db, referrerId) {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM enquiries WHERE referrer_id = ? AND substr(reference, 1, 7) = 'SAMPLE-'`)
    .bind(referrerId)
    .first();
  return Number(row?.n) || 0;
}

// referrer: { id, referral_fee, remortgage_referral_fee }
export async function loadSampleCases(db, referrer) {
  for (const s of SAMPLE_ROWS) {
    const reference = `SAMPLE-${referrer.id}-000${s.n}`;
    const allocated = s.case_status !== null;
    await db
      .prepare(
        `INSERT INTO enquiries (
           reference, client_name, client_email, client_phone, transaction_type,
           tenure, price, postcode, property_address, negotiator_name, mortgage,
           status, panel_status, case_status, assigned_firm_name, firm_response,
           referred_at, eta_date, target_completion_date,
           referrer_id, referral_fee_payable, referral_fee_amount, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Sample Negotiator', ?, ?, ?, ?, ?, ?,
           CASE WHEN ? IS NULL THEN NULL ELSE datetime('now', ?) END,
           CASE WHEN ? IS NULL THEN NULL ELSE date('now', ?) END,
           CASE WHEN ? IS NULL THEN NULL ELSE date('now', ?) END,
           ?, 0, 0, datetime('now', ?), datetime('now', ?))`
      )
      .bind(
        reference, s.client_name,
        `${s.client_name.toLowerCase().replace(/ /g, ".")}@example.com`,
        `07700 90010${s.n}`, s.type, s.tenure, s.price, s.postcode, s.address, s.mortgage || null,
        s.status, allocated ? "panel_referred" : null, s.case_status,
        allocated ? "Sample Panel Solicitors" : null, allocated ? "accepted" : null,
        s.referred ?? null, days(s.referred ?? 0),
        s.eta ?? null, days(s.eta ?? 0),
        s.target ?? null, days(s.target ?? 0),
        referrer.id, days(s.created), days(s.updated)
      )
      .run();

    const inserted = await db
      .prepare(`SELECT id, referred_at FROM enquiries WHERE reference = ? LIMIT 1`)
      .bind(reference)
      .first();
    if (!inserted) continue;

    const fee = MAIN_FEE_TYPES.has(s.type)
      ? Number(referrer.referral_fee) || 0
      : Number(referrer.remortgage_referral_fee) || 0;
    await db
      .prepare(`INSERT INTO referrer_case_fees (enquiry_id, amount) VALUES (?, ?)`)
      .bind(inserted.id, fee)
      .run();

    if (allocated) {
      await db
        .prepare(`INSERT INTO referrer_workflow (enquiry_id, allocated_at) VALUES (?, strftime('%Y-%m-%dT%H:%M:%SZ', ?))`)
        .bind(inserted.id, inserted.referred_at)
        .run();
    }
    if (s.paid !== undefined) {
      await db
        .prepare(`INSERT INTO referrer_fee_payments (enquiry_id, amount, paid_at, payment_note) VALUES (?, ?, date('now', ?), 'Sample payment')`)
        .bind(inserted.id, fee, days(s.paid))
        .run();
    }
  }
}

// Deletes this referrer's SAMPLE- cases (the five above and any referrals
// made from a demo account) and every row linked to them. Real cases and
// other referrers' samples are untouched.
export async function removeSampleCases(db, referrerId) {
  const ids = `(SELECT id FROM enquiries WHERE referrer_id = ? AND substr(reference, 1, 7) = 'SAMPLE-')`;
  const refs = `(SELECT reference FROM enquiries WHERE referrer_id = ? AND substr(reference, 1, 7) = 'SAMPLE-')`;
  const statements = [
    `DELETE FROM referrer_fee_payments WHERE enquiry_id IN ${ids}`,
    `DELETE FROM referrer_workflow WHERE enquiry_id IN ${ids}`,
    `DELETE FROM referrer_case_fees WHERE enquiry_id IN ${ids}`,
    `DELETE FROM followup_state WHERE enquiry_reference IN ${refs}`,
    `DELETE FROM admin_alerts WHERE enquiry_reference IN ${refs}`,
    `DELETE FROM invoices WHERE enquiry_id IN ${ids}`,
    `DELETE FROM audit_log WHERE reference IN ${refs}`,
  ];
  for (const sql of statements) {
    try {
      await db.prepare(sql).bind(referrerId).run();
    } catch (e) {
      // A table the live database doesn't have can't hold sample rows.
      if (!/no such table/i.test(String(e?.message || e))) throw e;
    }
  }
  const result = await db
    .prepare(`DELETE FROM enquiries WHERE referrer_id = ? AND substr(reference, 1, 7) = 'SAMPLE-'`)
    .bind(referrerId)
    .run();
  return Number(result?.meta?.changes) || 0;
}
