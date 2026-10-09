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
   - **Portal password:** leave blank (David sets his own in Part 4)
   - **Portal access active:** leave **unticked** for now — this is what stops
     the welcome email going out before the sample cases are loaded
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

1. Open David's record in the **Referrers** tab (click **Edit**).
2. Tick **Portal access active** and click **Update Referrer**. Saving does
   **not** send anything by itself.
3. Open his record again and click **Send invite / reset link**. David
   receives an email from `noreply@conveyquote.uk` with a **Set your
   password** button. The link works once and lasts **4 days**. No
   password is ever emailed.
4. He chooses his password, then logs in at
   `https://conveyquote.uk/referrer-login/` and sees the five sample cases.

If the link expires or David forgets his password, he can use
**Forgot password?** on the login page (that link lasts **7 days**), or you
can press **Send invite / reset link** again (this cancels any earlier link).

Why the order matters: creating a referrer with **Portal access active**
ticked sends the welcome email immediately. Creating it unticked (Part 2)
sends nothing, so you can load the sample cases first.

## Testing the invite and password emails yourself first

Do this with a separate test referrer before inviting David, so you see
exactly what he will see. Use **your own email address** as the test
login. Replace `YOUR-TEST-EMAIL` below with it.

1. **Welcome email (4-day link).** In **Referrers**, add "Test Referrer"
   with **Portal login email** = your address and **Portal access active**
   ticked, then **Create Referrer**. The admin screen says the welcome email
   was sent. Check your inbox: the email says when the link expires (4 days
   from now).
2. **Set a password.** Click **Set your password**, type a password twice
   and save. Then log in at `/referrer-login/`.
3. **Link works once.** Click the same email button again. The page says
   the link has expired or has already been used.
4. **Forgot password (7-day link).** Log out, click **Forgot password?**,
   enter your address and press **Send link**. Check the new email says it
   expires 7 days from now. Pressing **Send link** again within 5 minutes
   sends nothing more (same on-screen reply).
5. **Unknown address.** Use **Forgot password?** with an address that has
   no account. You see the same reply and no email is sent.
6. **Expired link.** Request another link, then make it expire by pasting
   this in the D1 console before clicking it:

   ```sql
   UPDATE sessions SET expires_at = '2000-01-01T00:00:00Z' WHERE user_type = 'referrer_setup' AND user_id = (SELECT id FROM referrers WHERE portal_email = 'YOUR-TEST-EMAIL');
   ```

   Clicking the link now says it has expired.
7. **See the link dates** at any time:

   ```sql
   SELECT user_id, created_at, expires_at FROM sessions WHERE user_type = 'referrer_setup';
   ```

8. **Remove the test referrer** when finished (one statement at a time):

   ```sql
   DELETE FROM sessions WHERE user_type IN ('referrer', 'referrer_setup') AND user_id = (SELECT id FROM referrers WHERE portal_email = 'YOUR-TEST-EMAIL');
   ```

   ```sql
   DELETE FROM referrers WHERE portal_email = 'YOUR-TEST-EMAIL' AND referrer_name = 'Test Referrer';
   ```

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
