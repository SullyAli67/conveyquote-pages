# Referrer portal set-up — Trusted Conveyancers

Plain-English steps to give David at Trusted Conveyancers a portal that
already shows five fictional sample cases, then take a real referral end
to end. Do the steps in order.

## Part 1 — one-off database change (Cloudflare D1 console)

Do this **before** the pull request that adds referrer fee payments is
merged. The new code reads the new table and column.

1. Open Cloudflare → **D1** → **conveyquote-db** → **Console**.
2. Open `migrations/0020_referrer_fees.sql` and paste each statement on its
   own, in order: STEP 1, STEP 2, then the two STEP 3 checks. The checks
   should each return one row.

## Part 2 — create David's account with portal access OFF

1. Log in to the admin area and open the **Referrers** tab.
2. Click **+ Add Referrer** and fill in:
   - **Name / Company:** Trusted Conveyancers
   - **Contact email:** `info@trustedconveyancers.co.uk`
     (spelt *conveyancers*, with an **r** — this address is copied into every
     quote David refers)
   - **Referral fee (£):** 75 — purchase, sale, sale & purchase
   - **Remortgage / transfer fee (£):** 40 — remortgage, transfer of equity
   - **Portal login email:** `info@trustedconveyancers.co.uk`
   - **Portal password:** leave blank
   - **Portal access active:** leave **unticked** for now
3. Click **Create Referrer**.

## Part 3 — load the five sample cases (Cloudflare D1 console)

1. Open `scripts/demo/seed-sample-cases.sql`.
2. Paste the two STEP 1 checks. The first must return exactly **one** row
   showing fees 75 and 40. The second must return **0**.
3. Paste the five STEP 2 inserts, one at a time.
4. Paste the two STEP 3 inserts.
5. Paste the STEP 4 check. It should list SAMPLE-0001 to SAMPLE-0005.

The sample cases are fictional, carry a grey **Sample** badge in the
portal, and can never send an email.

## Part 4 — give David access

1. Open David's record in the **Referrers** tab.
2. Type a new password of at least 8 characters in **Portal password**,
   tick **Portal access active** and click **Update Referrer**.
3. Give David the password by phone. His login page is
   `https://conveyquote.uk/referrer-login/`.

## Taking a real referral (optional, during the demo)

1. **David submits a lead** under **+ New Referral**, using *your own email
   address* as the client so no member of the public is emailed.
2. He presses **Submit Referral for Checking**. Nothing goes to the client yet.
3. **You receive an alert** at `info@conveyquote.uk`. Click **Review in Admin**.
4. **Review the quote**, press **Send Approved Quote**, tick the four checks
   and press **Send**. The quote goes from `quotes@conveyquote.uk`, copied
   to `info@conveyquote.uk` and to David.

## Afterwards

- To remove the sample cases, paste the statements in
  `scripts/demo/remove-sample-cases.sql` one at a time. Only `SAMPLE-` rows
  and rows linked to them are deleted; David's account stays.
- To record a real payment to David, see the example at the bottom of
  `migrations/0020_referrer_fees.sql`. His Payments tab then shows
  "Paid" with the date.
