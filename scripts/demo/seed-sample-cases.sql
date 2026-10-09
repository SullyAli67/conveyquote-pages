-- scripts/demo/seed-sample-cases.sql
--
-- Five fictional sample cases for the Trusted Conveyancers referrer
-- portal, so the Dashboard, My Referrals and Payments tabs all show
-- realistic content from day one.
--
--   SAMPLE-0001  Quote sent            Purchase     £75
--   SAMPLE-0002  Instructed            Sale         £75
--   SAMPLE-0003  In progress           Remortgage   £40   (searches ordered)
--   SAMPLE-0004  Exchanged             Sale         £75   (completes in 10 days)
--   SAMPLE-0005  Completed, fee paid   Purchase     £75   (paid 5 days ago)
--
-- How the sample rows are identified
-- ----------------------------------
--   enquiries              reference starts with "SAMPLE-"
--   referrer_workflow      enquiry_id belongs to a SAMPLE- enquiry
--   referrer_fee_payments  enquiry_id belongs to a SAMPLE- enquiry
-- The portal shows a grey "Sample" badge on every SAMPLE- case.
-- scripts/demo/remove-sample-cases.sql deletes exactly these rows.
--
-- Why these rows can never send an email
-- --------------------------------------
--   * Follow-up reminders (run-followups.js) only pick up enquiries with a
--     followup_state row. None is created here, and send-approved-quote.js
--     (the only thing that creates one) refuses SAMPLE- references.
--   * The admin 9am digest (check-pending-enquiries.js) only lists status
--     'new'. No sample has that status.
--   * Milestone emails, firm notifications, firm responses and invoices
--     need assigned_firm_id to match a logged-in panel firm. It is NULL
--     here; the solicitor name is plain text only. assign-panel-firm.js
--     refuses to link a SAMPLE- case to a firm.
--   * Request update shows the referrer a confirmation and sends nothing.
--     Request allocation and Re-quote refuse SAMPLE- cases.
--   * The accept / decline quote links refuse SAMPLE- references.
--
-- How to apply (Cloudflare dashboard → D1 → conveyquote-db → Console)
-- -------------------------------------------------------------------
-- Prerequisites: migration 0020 applied, and the Trusted Conveyancers
-- referrer created in the admin Referrers tab with portal email
-- info@trustedconveyancers.co.uk, referral fee 75 and remortgage /
-- transfer fee 40.
--
-- Paste ONE statement at a time, in order. Every INSERT only runs when
-- exactly one referrer has that portal email, so it cannot attach the
-- samples to the wrong account or to none.

-- ── STEP 1 — checks ───────────────────────────────────────────────

-- (1a) Expect exactly ONE row, with referral_fee 75 and remortgage_referral_fee 40.
SELECT id, referrer_name, referral_fee, remortgage_referral_fee, portal_active
FROM referrers
WHERE portal_email = 'info@trustedconveyancers.co.uk';

-- (1b) Expect 0. If not, run remove-sample-cases.sql first.
SELECT COUNT(*) AS existing_samples
FROM enquiries
WHERE substr(reference, 1, 7) = 'SAMPLE-';

-- ── STEP 2 — the five cases ───────────────────────────────────────

-- (2a) SAMPLE-0001 — quote sent, not yet instructed.
INSERT INTO enquiries (
  reference, client_name, client_email, client_phone, transaction_type,
  tenure, price, postcode, property_address, negotiator_name, mortgage,
  status, referrer_id, referral_fee_payable, referral_fee_amount,
  created_at, updated_at
)
SELECT
  'SAMPLE-0001', 'Sample Buyer One', 'sample.buyer.one@example.com', '07700 900101', 'purchase',
  'freehold', 285000, 'DT1 1AA', '1 Example Street, Demo Town', 'Sample Negotiator', 'mortgage',
  'quote_sent', r.id, 1, 75,
  datetime('now', '-3 days'), datetime('now', '-3 days')
FROM referrers r
WHERE r.portal_email = 'info@trustedconveyancers.co.uk'
  AND (SELECT COUNT(*) FROM referrers WHERE portal_email = 'info@trustedconveyancers.co.uk') = 1;

-- (2b) SAMPLE-0002 — instructed.
INSERT INTO enquiries (
  reference, client_name, client_email, client_phone, transaction_type,
  tenure, price, postcode, property_address, negotiator_name,
  status, panel_status, case_status, assigned_firm_name, firm_response,
  referred_at, eta_date, referrer_id, referral_fee_payable, referral_fee_amount,
  created_at, updated_at
)
SELECT
  'SAMPLE-0002', 'Sample Seller Two', 'sample.seller.two@example.com', '07700 900102', 'sale',
  'freehold', 240000, 'DT1 2BB', '2 Example Road, Demo Town', 'Sample Negotiator',
  'accepted', 'panel_referred', 'accepted', 'Sample Panel Solicitors', 'accepted',
  datetime('now', '-9 days'), date('now', '+55 days'), r.id, 1, 75,
  datetime('now', '-12 days'), datetime('now', '-9 days')
FROM referrers r
WHERE r.portal_email = 'info@trustedconveyancers.co.uk'
  AND (SELECT COUNT(*) FROM referrers WHERE portal_email = 'info@trustedconveyancers.co.uk') = 1;

-- (2c) SAMPLE-0003 — remortgage in progress (searches ordered), lower £40 fee.
INSERT INTO enquiries (
  reference, client_name, client_email, client_phone, transaction_type,
  tenure, price, postcode, property_address, negotiator_name,
  status, panel_status, case_status, assigned_firm_name, firm_response,
  referred_at, eta_date, referrer_id, referral_fee_payable, referral_fee_amount,
  created_at, updated_at
)
SELECT
  'SAMPLE-0003', 'Sample Owner Three', 'sample.owner.three@example.com', '07700 900103', 'remortgage',
  'leasehold', 320000, 'DT2 3CC', 'Flat 3, Example Court, Demo Town', 'Sample Negotiator',
  'accepted', 'panel_referred', 'searches_ordered', 'Sample Panel Solicitors', 'accepted',
  datetime('now', '-24 days'), date('now', '+20 days'), r.id, 1, 40,
  datetime('now', '-26 days'), datetime('now', '-4 days')
FROM referrers r
WHERE r.portal_email = 'info@trustedconveyancers.co.uk'
  AND (SELECT COUNT(*) FROM referrers WHERE portal_email = 'info@trustedconveyancers.co.uk') = 1;

-- (2d) SAMPLE-0004 — exchanged, completing in 10 days.
INSERT INTO enquiries (
  reference, client_name, client_email, client_phone, transaction_type,
  tenure, price, postcode, property_address, negotiator_name,
  status, panel_status, case_status, assigned_firm_name, firm_response,
  referred_at, eta_date, target_completion_date, referrer_id, referral_fee_payable, referral_fee_amount,
  created_at, updated_at
)
SELECT
  'SAMPLE-0004', 'Sample Seller Four', 'sample.seller.four@example.com', '07700 900104', 'sale',
  'freehold', 195000, 'DT3 4DD', '4 Example Avenue, Demo Town', 'Sample Negotiator',
  'accepted', 'panel_referred', 'exchanged', 'Sample Panel Solicitors', 'accepted',
  datetime('now', '-42 days'), date('now', '+10 days'), date('now', '+10 days'), r.id, 1, 75,
  datetime('now', '-45 days'), datetime('now', '-2 days')
FROM referrers r
WHERE r.portal_email = 'info@trustedconveyancers.co.uk'
  AND (SELECT COUNT(*) FROM referrers WHERE portal_email = 'info@trustedconveyancers.co.uk') = 1;

-- (2e) SAMPLE-0005 — completed.
INSERT INTO enquiries (
  reference, client_name, client_email, client_phone, transaction_type,
  tenure, price, postcode, property_address, negotiator_name, mortgage,
  status, panel_status, case_status, assigned_firm_name, firm_response,
  referred_at, referrer_id, referral_fee_payable, referral_fee_amount,
  created_at, updated_at
)
SELECT
  'SAMPLE-0005', 'Sample Buyer Five', 'sample.buyer.five@example.com', '07700 900105', 'purchase',
  'freehold', 310000, 'DT4 5EE', '5 Example Close, Demo Town', 'Sample Negotiator', 'mortgage',
  'accepted', 'panel_referred', 'completed', 'Sample Panel Solicitors', 'accepted',
  datetime('now', '-72 days'), r.id, 1, 75,
  datetime('now', '-75 days'), datetime('now', '-12 days')
FROM referrers r
WHERE r.portal_email = 'info@trustedconveyancers.co.uk'
  AND (SELECT COUNT(*) FROM referrers WHERE portal_email = 'info@trustedconveyancers.co.uk') = 1;

-- ── STEP 3 — workflow and payment rows ────────────────────────────

-- (3a) Mark SAMPLE-0002 to 0005 as allocated (hides Re-quote / Request
-- allocation on them, as for a real allocated case).
INSERT INTO referrer_workflow (enquiry_id, allocated_at)
SELECT id, strftime('%Y-%m-%dT%H:%M:%SZ', referred_at)
FROM enquiries
WHERE reference IN ('SAMPLE-0002', 'SAMPLE-0003', 'SAMPLE-0004', 'SAMPLE-0005');

-- (3b) Record the £75 fee on SAMPLE-0005 as paid 5 days ago.
INSERT INTO referrer_fee_payments (enquiry_id, amount, paid_at, payment_note)
SELECT id, 75, date('now', '-5 days'), 'Sample payment'
FROM enquiries
WHERE reference = 'SAMPLE-0005';

-- ── STEP 4 — confirm ──────────────────────────────────────────────

-- Expect 5 rows: stages as listed at the top, fees 75/75/40/75/75,
-- allocated on 0002–0005, paid only on 0005.
SELECT e.reference, e.transaction_type, e.status, e.case_status,
       e.referral_fee_amount, w.allocated_at, p.paid_at
FROM enquiries e
LEFT JOIN referrer_workflow w ON w.enquiry_id = e.id
LEFT JOIN referrer_fee_payments p ON p.enquiry_id = e.id
WHERE substr(e.reference, 1, 7) = 'SAMPLE-'
ORDER BY e.reference;
