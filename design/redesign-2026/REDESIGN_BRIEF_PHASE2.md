# ConveyQuote homepage redesign: Phase 2 brief (supersedes parts of REDESIGN_BRIEF.md)

This brief replaces sections 3 (hero copy only), 4 (page structure) and 5 (3D hero) of `REDESIGN_BRIEF.md`. Everything else in that brief still applies, in particular: visual redesign only; do not touch the quote engine, fee logic, D1, Workers/Functions, emails or admin; no invented claims, figures, ratings or testimonials; work on `redesign-2026`; never merge or deploy to production; stop for review after each phase.

New files are in `design/redesign-2026/` (see section 8).

## 1. The golden rule: new layout, existing content

`design/redesign-2026/reference/homepage-preview.html` is a **layout and visual reference only**. Where it contains wording, a wordmark, links, FAQ answers or footer text, those are placeholders written without access to the live site.

**Always use the real content already in the codebase.** Specifically:

1. **Logo:** use the existing ConveyQuote logo exactly as it is today (same file, colours and proportions). Do not use the stacked "CONVEY / QUOTE" text wordmark from the preview. Size it to sit where the wordmark sits in the preview (top-left of the hero, roughly 40 to 56px tall on desktop).
2. **Navigation:** keep all existing navigation links and destinations (including the SDLT calculator, leasehold page and firm/referrer portal links). Restyle them to the preview's look; do not remove any.
3. **Copy:** keep existing wording for every section that already exists. Only the hero heading changes (section 3).
4. **FAQ:** keep the existing FAQ questions and answers word for word, so the FAQPage structured data stays valid. Present them in the preview's accordion style.
5. **Footer:** keep all existing footer content, legal and regulatory text, links and company information exactly as they are.
6. **Favicon, meta tags, title, canonical, structured data:** unchanged unless I approve otherwise.

Where the preview introduces a **new** section that has no existing content (listed in section 2 as NEW), use the preview's draft wording but **flag each new piece of copy in your phase report** so I can approve or edit it before launch.

If anything in the existing site does not fit the new layout, ask me rather than dropping it.

## 2. Page order: existing sections mapped to the new layout

| New position | Content source | Notes |
| --- | --- | --- |
| 1. Navigation | EXISTING logo and links | Restyled per preview; teal "Get my quote" button and square menu button on the right |
| 2. X-ray hero | Heading: see section 3. Supporting line: EXISTING hero summary, adapted only if needed to fit | Existing four tick points move into the trust strip below |
| 3. Trust strip | EXISTING trust bar items and tick points | Quiet single line, as in the preview |
| 4. Transaction selector | NEW section (flag copy) | Four cards with the SVG icons; each sets the existing `form.type` state and scrolls to the form |
| 5. How it works | EXISTING three-step content | Preview's numbered style |
| 6. "Every cost, itemised" | NEW section (flag copy) | Midnight background; illustrative layout labelled "Example"; no figures unless produced by the real fee engine |
| 7. Quote form | EXISTING form, **restyled only** | Same fields, names, IDs, validation, conditional logic and submission; card styling from the preview |
| 8. Why ConveyQuote | NEW section (flag copy) | Three short points; wording must be accurate for how the platform actually works |
| 9. FAQ | EXISTING questions and answers | Accessible accordion (`details`/`summary` or equivalent with ARIA) |
| 10. Testimonials | EXISTING, unchanged content | Keep as agreed; restyle to match |
| 11. City coverage links | EXISTING | Restyle as a clean link grid |
| 12. Agent and broker referral callout | EXISTING | Restyle to match |
| 13. Closing call to action | EXISTING call-to-action wording if one exists, otherwise the preview's (flag it) | Midnight band, centred text, teal button. **No image or video here** |
| 14. Footer | EXISTING | Restyled only |

The evening "day to night" film is **out of scope for the homepage**. It is reserved for a future leasehold page redesign (files are in `future-leasehold/` for reference only; do not use them in this phase).

## 3. Hero copy

- Heading (the page's only `<h1>`): **Your move, *made clear.*** with "made clear." in teal, as in the preview.
- Supporting line: the existing hero summary, lightly adapted only if it needs shortening. If you propose new wording, flag it.
- Keep the "Inside every quote" card and the lens caption "See inside".

## 4. The X-ray hero: what it does

Source: `design/redesign-2026/reference/hero-xray.html` (standalone, Three.js r128). Behaviour to preserve exactly:

1. A 3D Victorian terrace sits in the hero over faint contour lines.
2. A circular lens follows the cursor with a fluid, fading trail. Inside the lens the house is shown as a navy blueprint with cyan linework, and cost labels (Land Registry fee, Searches, ID checks, Legal fee, Stamp Duty Land Tax, Bank transfer fee) are visible only through the lens.
3. Around the lens, bricks pop out of the wall and nearby pieces (windows, roof, chimney pots, bay, porch, door, front wall, railings) pull apart in layers, then settle back when the lens moves on.
4. With no pointer movement for about 2.6 seconds, and on touch devices, the lens drifts across the house by itself.
5. The pull-apart effect has a built-in safety switch: if anything fails it disables itself and the house stays whole. Keep that behaviour. On one Windows/Edge machine an earlier version made the moving pieces disappear; the current version fixes this, but **test on real Chrome and Edge on Windows** in Phase 4.

## 5. The X-ray hero: implementation in this React app

1. Create `src/hero/xrayScene.js` exporting `mountXrayHero(container, options)` that builds the scene inside `container` and returns a `dispose()` function which stops the animation loop, removes listeners and observers, and disposes geometries, materials, textures and render targets.
2. Create `src/components/XrayHero.tsx` that renders the hero markup (logo, nav, heading, supporting line, "Inside every quote" card, lens ring) and calls `mountXrayHero` in a `useEffect`, calling `dispose()` on unmount.
3. Install Three.js pinned to **exactly `0.128.0`** (`npm install three@0.128.0`). The scene uses r128 APIs (including `WebGLMultisampleRenderTarget`, removed in later versions). Import with `import * as THREE from 'three'` and load it with a **dynamic `import()`** so it is split out of the main bundle and fetched only after the page has rendered.
4. Show `images/victorian-terrace-still.webp` (PNG fallback) in the hero immediately with explicit width and height; cross-fade to the live canvas once the first frame renders. Keep the still, and never load Three.js, when WebGL is unavailable, `prefers-reduced-motion: reduce`, `navigator.connection.saveData` is true, or `navigator.deviceMemory` is below 4.
5. Pause rendering when the hero is off-screen (IntersectionObserver) or the tab is hidden. Cap device pixel ratio at 2 (1.5 below 768px wide).
6. Replace the Google Fonts `<link>` in the reference with the fonts you set up in Phase 1. The canvas cost labels use Manrope, so wait for `document.fonts.load('700 40px Manrope')` (with a 1.5 second timeout) before creating them.
7. Canvases are decorative: `aria-hidden="true"`. The "Inside every quote" list is real text so the information is available without the 3D scene.
8. The hero heading must remain the Largest Contentful Paint element.

## 6. Transaction selector wiring

Each card sets the existing `form.type` state to the matching value **used by the current `<select id="type">`** (check the actual option values in `App.tsx`; do not invent new ones), marks itself selected (`aria-pressed`), scrolls smoothly to the form (instantly if reduced motion is on), and moves focus to the next form field. Changing the select directly must update which card shows as selected. If a card has no exact match in the existing options, tell me rather than guessing.

## 7. Phases from here

- **Phase 2:** navigation with the real logo, X-ray hero, trust strip. Screenshots at 1440px and 390px, plus a short screen recording or GIF of the lens moving if possible.
- **Phase 3:** sections 4 to 14 in the table, with a list of every piece of new copy for approval.
- **Phase 4:** quality assurance as in the original brief, including real Chrome and Edge on Windows and Safari on iPhone for the hero.

## 8. Files

| Path | What it is |
| --- | --- |
| `reference/homepage-preview.html` | Full-page layout reference (placeholder content) |
| `reference/hero-xray.html` | Working X-ray hero to port |
| `images/victorian-terrace-still.webp` / `.png` | Hero still and fallback |
| `icons/buy.svg`, `sell.svg`, `move.svg`, `remortgage.svg` | Transaction card icons |
| `future-leasehold/` | Evening film and its source scene. **Not for this phase** |
