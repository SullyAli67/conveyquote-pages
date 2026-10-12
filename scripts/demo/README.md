# Referrers — set-up and demo guide

Plain-English steps for adding a referrer (for example David at Trusted
Conveyancers), giving them portal access, and running a demo. Everything
below is done in the admin **Referrers** tab; no SQL is needed except the
one-off database changes in Part 1.

## Part 1 — one-off database changes (Cloudflare D1 console)

Open Cloudflare → **D1** → **conveyquote-db** → **Console** and paste each
statement on its own, in order.

1. `migrations/0020_referrer_fees.sql` — already applied.
2. `migrations/0021_referrer_case_fees.sql` — already applied.
3. `migrations/0022_firm_remortgage_fee_and_demo_referrers.sql` — STEP 1,
   STEP 2, then the two STEP 3 checks, **before** the pull request that
   ships it is merged. STEP 4 (Cambridge's £200 remortgage fee) is
   optional; you can set it in the **Firms** tab instead.

## Part 2 — add a referrer

1. **Referrers** → **+ Add Referrer**.
2. **1. Details & fees**: name, contact email (the portal login email
   follows it unless you change it), phone, and **what you pay them**:
   - **Purchase / sale fee** — e.g. 150 (also used for sale & purchase)
   - **Remortgage / transfer fee** — e.g. 100
3. Press **Create referrer**. Nothing is emailed and portal access stays
   off. The referrer stays open with a **set-up checklist**.

## Part 3 — optional steps

- **3. Client pricing** — every matter type shows **Standard prices** (your
  public price book plus any quote markup) or **Custom prices** (fixed fees
  for this referrer). Press **Customise** → **Start custom prices**, adjust,
  then **Save**. **Use standard prices** puts a matter type back.
- **2. Portal access → Load sample cases** — five fictional cases with a
  grey **Sample** badge, so the portal looks lived-in. They never send an
  email. **Remove sample cases** deletes them (real cases are untouched).

## Part 4 — give them access

**2. Portal access → Send invite.** One click switches portal access on
and emails a **Set your password** link from `noreply@conveyquote.uk`
(works once, lasts **4 days**). No password is ever emailed.

Later, on the same tab:

- **Send password reset link** — they choose a new password (7 days).
- **Set a password for them** — you type it; it is never emailed, so give
  it to them by phone. It logs them out of any open sessions.
- **Turn off access** — logs them out straight away; their cases and fees
  are kept. **Turn on access (no email)** turns it back on.

The list on the left shows each referrer's status: **Not invited**,
**Invite sent** (with the link's expiry), **Invite expired**, **Active**
(with last login) or **Access off**.

## Part 5 — see what they see

**Preview their portal ↗** (top right of any referrer) opens their portal
in a new tab, read-only, for 30 minutes. Buttons are greyed out and
nothing can be submitted or sent. No password is needed.

**4. Cases** lists their cases with stage and fee (owed / paid), plus
**Open in Pipeline**, which filters the Pipeline tab to that referrer.

## Demo accounts

**+ New demo account** creates a ready-made login (£150 / £100 fees) with
the five sample cases already loaded. Type the name shown in the portal
and the login email of the person you are demoing to, then press **Send
invite** (or **Set a password for them**).

On a demo account, anything they refer through **+ New Referral** is
priced on screen and saved as a sample quote (reference
`SAMPLE-CQ-…`) in their **My Referrals**. It is never emailed to the
client, to you or to them, and never appears in Quote Review. The
**Demo account** tick box on **2. Portal access** turns this on or off for
any referrer.

## Before inviting David

Use **Preview their portal** on his account to check it, or invite
yourself first with a demo account using your own email address, then
delete the demo's cases with **Remove sample cases** and turn off its
access when finished.

## The SQL scripts in this folder

`seed-sample-cases.sql` still works (it loads `SAMPLE-0001` … for the
referrer whose portal email is `info@trustedconveyancers.co.uk`), but the
**Load sample cases** button does the same job for any referrer and is the
easier route. Note that `remove-sample-cases.sql` removes **every**
referrer's sample cases (including demo accounts' sample quotes); the
**Remove sample cases** button removes just one referrer's.
