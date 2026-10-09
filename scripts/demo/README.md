# Referrer portal demo — Trusted Conveyancers

A step-by-step guide to running a live demo of the referrer portal with
David at Trusted Conveyancers. It follows one referral end to end:

1. David submits a lead in his portal.
2. The quote waits in the admin Quote Review queue (nothing goes to the client yet).
3. Admin ticks the four checks and presses Send.
4. The client receives the quote from `quotes@conveyquote.uk`, copied to
   `info@conveyquote.uk` and to David at `info@trustedconveyancers.co.uk`.

For the demo, the "client" is the ConveyQuote owner's own email address, so
no member of the public is emailed.

## Before the demo — create David's login (admin screen, about 2 minutes)

1. Log in to the admin area and open the **Referrers** tab.
2. Click to add a new referrer and fill in:
   - **Referrer name:** Trusted Conveyancers
   - **Contact email:** `info@trustedconveyancers.co.uk`
     (spelt *conveyancers*, with an **r** — this address is copied into every
     quote David refers)
   - **Portal email:** `info@trustedconveyancers.co.uk` (this is David's username)
   - **Referral fee:** 100
   - **Portal password:** type a new password of at least 8 characters. Do not
     reuse a password from anywhere else.
   - **Portal active:** ticked
3. Save. The password is stored only in scrambled (hashed) form.
4. Give David the password by phone or a separate message — never in the
   same email as the login link. The login page is
   `https://conveyquote.uk/referrer-login/`.

## During the demo

1. **David logs in** at `https://conveyquote.uk/referrer-login/`.
2. **David submits a lead.** He opens **+ New Referral** and enters:
   - Client name: Sample Client
   - Client email: *your own email address* (not a real client's)
   - Any property details — for example a £250,000 freehold purchase with a mortgage
   - A note, for example "Property has solar panels", to show how notes reach you
3. He sees an indicative quote, then presses **Submit Referral for Checking**.
   The screen confirms that ConveyQuote will check the quote and email the
   client, copying him in. **No email goes to the client at this point.**
4. **You receive an alert** at `info@conveyquote.uk` headed
   "New Referrer Enquiry", including David's note. Click **Review in Admin**.
5. **You review the quote** on the Quote Review screen, adjust anything that
   needs it, and press **Send Approved Quote**.
6. **The preview opens.** Check that it shows Cc: info@conveyquote.uk and the
   referrer (Trusted Conveyancers). Tick the four checks. The **Send** button
   stays greyed out until all four are ticked.
7. Press **Send**. Your inbox (as the client) receives the quote from
   `quotes@conveyquote.uk`, and David receives a copy.
8. Back in David's portal, the referral appears under **My Referrals**.

## After the demo

- The test referral is a real row in the system. To keep it out of your
  figures, open it in admin and archive it, or ask for a removal script.
- If David is not going live yet, open his referrer record and untick
  **Portal active**. His login will then be refused until you tick it again.
