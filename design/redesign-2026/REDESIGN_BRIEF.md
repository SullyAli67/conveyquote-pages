# ConveyQuote homepage redesign 2026: brief for Claude Code

## 0. Read this first

This is a **visual redesign of the homepage only**. ConveyQuote's quote engine, fee calculations, database (Cloudflare D1), Workers/Functions, email templates and admin tools have been carefully debugged and are **out of scope**. Do not modify them.

Before writing any code:

1. Inspect the repository and tell me how the homepage is currently built (plain HTML/CSS/JS or a framework, where styles live, how the quote form hands off to the quote flow, which element IDs, classes and field names the existing JavaScript depends on).
2. Propose a short plan that fits the existing structure. Do not introduce a new framework, bundler or build step unless one already exists.
3. Work on a new branch named `redesign-2026`. Never commit directly to `main`.
4. Stop at the end of each phase in section 9 and wait for my review before continuing.

All approved assets are in `design/redesign-2026/`.

## 1. Brand direction

A premium, trustworthy, distinctly British property brand. The signature object is a 3D Victorian London terrace (yellow stock brick, white stucco bay, navy front door). Clean layouts, generous white space, large confident type. No stock photography, no gradients, no neon, no generic SaaS blobs or illustrations.

## 2. Design tokens

Define these once as CSS custom properties on `:root` and use them everywhere.

| Token | Hex | Use |
| --- | --- | --- |
| `--cq-midnight` | `#062A52` | Dark sections, text on teal buttons |
| `--cq-navy` | `#073B70` | Headings, icons, primary brand colour |
| `--cq-teal` | `#00A7B5` | Primary actions and interactive accents only |
| `--cq-teal-bright` | `#20D5D0` | Accents on dark backgrounds only |
| `--cq-ice` | `#F3FAFC` | Page background |
| `--cq-white` | `#FFFFFF` | Cards |
| `--cq-ink` | `#10243A` | Body text |
| `--cq-gold` | `#E7B85C` | Very sparing accent (at most one or two uses on the page) |

**Contrast rule (important):** white text on `#00A7B5` fails WCAG AA (about 2.9:1). Primary buttons must use **Midnight `#062A52` text on teal** (about 4.9:1, passes). Check every text/background pair meets WCAG 2.2 AA.

**Typography:** Manrope (headings, weights 600 and 700) and Inter (body, 400 and 500) from Google Fonts with `display=swap`, falling back to system sans-serif. Suggested scale: hero heading `clamp(44px, 6vw, 80px)` with tight letter-spacing (about -0.02em); section headings `clamp(28px, 4vw, 44px)`; body 17 to 18px, line-height about 1.6.

**Shape:** cards 20px radius with a 1px hairline border; buttons 14px radius, 56px tall.

## 3. Copy

- Hero heading: **Your move, made clear.**
- Hero supporting line: *Transparent, itemised conveyancing quotes from regulated solicitors across England and Wales.*
- Primary button: **Get my quote →**
- Trust strip (quiet, small caps style): *Regulated solicitors · Fully itemised · No obligation · England and Wales*

### Regulatory and accuracy rules (non-negotiable)

ConveyQuote is a referral platform operated by Essentially Law Ltd. It is not a law firm and does not act for clients.

- Keep every existing regulatory statement, disclaimer, privacy and cookie link, and company information exactly as it is today.
- **Do not invent** statistics, ratings, review scores, testimonials, customer numbers, awards, regulator logos or guarantees (for example "No move, no fee" or "fixed fee guarantee"). The earlier design concepts contained placeholder numbers such as "50,000+ moves" and "4.9 Trustpilot". **None of these may ship.** If a section needs real data we do not have, leave it out and flag it to me.
- Only reference a regulator or scheme by name if the current site already does.

## 4. Page structure

1. **Navigation:** logo left; existing links; "Get my quote" button right.
2. **Hero:** heading, supporting line, button and trust strip on the left (about 55%); the 3D terrace on the right (about 45%). On mobile, stack text above the house.
3. **Transaction selector:** heading "What are you doing with your property?" with four cards: Buying, Selling, Buying and selling, Remortgaging, using the SVG icons in `design/redesign-2026/icons/`. Each card links into the existing quote flow. If the current flow accepts a transaction-type parameter, pre-select it; if not, link to the quote start and tell me.
4. **How it works:** three steps (tell us about your property, compare itemised quotes, instruct a regulated solicitor) in the existing wording where possible.
5. **Quote breakdown:** dark Midnight section showing how a quote is itemised (legal fee, disbursements, VAT, total). It must be clearly labelled **"Example quote"** and use figures produced by the real fee logic, or leave numbers out. Do not hard-code made-up firms or prices.
6. **Why ConveyQuote:** short points on itemised pricing, regulated firms, no obligation.
7. **FAQ:** accessible accordion using existing FAQ content if any.
8. **Final call to action band** in Midnight with the teal button.
9. **Footer:** unchanged legal and regulatory content, restyled only.

`design/redesign-2026/reference/transaction-selector.html` is a working reference for the card styling and behaviour.

## 5. The 3D hero: implementation

Source: `design/redesign-2026/3d/victorian-terrace.html` (a standalone Three.js r128 scene).

1. Extract the scene into `hero-house.js` exporting `mountHeroHouse(containerElement)`. Remove the information panel, the light/dark toggle and full-page styles. Transparent background.
2. Self-host Three.js from `design/redesign-2026/vendor/three.min.js` (r128, MIT licence) rather than a CDN.
3. **Show the still image first.** Render `images/victorian-terrace-still.webp` (with the PNG as a fallback via `<picture>`) in the hero container immediately, with explicit width and height to prevent layout shift. Only after the page has loaded (use `requestIdleCallback`, falling back to `setTimeout`) load Three.js, render the first frame, then cross-fade from the still to the live canvas over about 400ms.
4. **Keep the still image and never load Three.js** when any of these is true: WebGL is unavailable; `prefers-reduced-motion: reduce`; `navigator.connection.saveData` is true; `navigator.deviceMemory` is below 4.
5. Pause the render loop when the hero is off-screen (IntersectionObserver) or the tab is hidden (`visibilitychange`).
6. Cap device pixel ratio at 2 (1.5 on screens narrower than 768px). Size from the container with ResizeObserver, not the window.
7. Pointer-follow rotation only for `(pointer: fine)` devices; touch devices get the gentle idle sway only.
8. The canvas and still image are decorative: `aria-hidden="true"` on the canvas, empty `alt=""` on the still.
9. The hero heading must be the Largest Contentful Paint element, not the canvas.

## 6. Performance and quality targets

- Lighthouse mobile: Performance 90+, Accessibility 95+, Best Practices 95+, SEO unchanged or better.
- Largest Contentful Paint under 2.5 seconds on a mid-range phone; Cumulative Layout Shift under 0.1.
- Keyboard navigable with visible focus states; accordion and cards operable by keyboard.
- Light theme only for launch (the assets support dark mode for later).

## 7. SEO

Keep the existing `<title>`, meta description, canonical URL and structured data unless I approve changes. There must be exactly one `<h1>` (the hero heading).

## 8. Assets

| Path | What it is |
| --- | --- |
| `3d/victorian-terrace.html` | Source 3D scene to extract from |
| `images/victorian-terrace-still.webp` | Still of the house, transparent (primary) |
| `images/victorian-terrace-still.png` | Same still, PNG fallback |
| `icons/buy.svg`, `sell.svg`, `move.svg`, `remortgage.svg` | Transaction card icons |
| `reference/transaction-selector.html` | Styling reference for the cards |
| `vendor/three.min.js` | Three.js r128, self-hosted |

## 9. Phases (stop for review after each)

1. **Plan and tokens:** repository summary, plan, design tokens and typography in place, no visual changes beyond fonts and colours.
2. **Hero:** navigation, hero with still image and live 3D house, trust strip. Screenshots at 1440px and 390px wide.
3. **Sections:** transaction selector through footer.
4. **Quality assurance:** Lighthouse reports (mobile and desktop); keyboard and screen reader check; test on Chrome, Safari (including iOS) and an Android phone; confirm the quote journey works end to end exactly as before using our normal test procedure (do not send test enquiries to real firms); list of every file changed.

Do not merge to `main` or deploy to production. I will review the Cloudflare Pages preview deployment for the branch and merge myself.
