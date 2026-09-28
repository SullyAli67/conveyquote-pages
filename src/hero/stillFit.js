import { drawStreetMask, fitScale, heroAvoidRects, heroSafeRect, scaleAbout, shiftInto } from "./fit.js";

// Shared by XrayHero.tsx and the inline script the prerendered homepage runs before the app loads (stillFit.inline.js),
// so the stills are placed identically whichever sets them first.
export const PORTRAIT_QUERY = "(max-aspect-ratio: 4/5)";
// Stills are the scene's first frame per camera framing; hull is the house outline xrayScene.js also fits, so both move together.
export const STILL_HULL = {
  wide: { left: 0.0175, top: 0.0123, right: 0.9827, bottom: 0.9925 },
  tall: { left: 0.026, top: 0.0194, right: 0.9742, bottom: 0.9805 },
};

// translate() scale() for an element whose own centre is (cx, cy), matching a scale by s about the hero centre and then a shift.
const fitTransform = (cx, cy, W, H, s, dx, dy) =>
  `translate(${(W / 2 + (cx - W / 2) * s + dx - cx).toFixed(1)}px, ${(H / 2 + (cy - H / 2) * s + dy - cy).toFixed(1)}px) scale(${s.toFixed(4)})`;

// Fits the house and street stills clear of the text (as the live scene fits its camera) and paints the street's text fade.
// els: { house, street, header, copy, card }; state: { maskKey, canvas } kept between calls; vars are set on `target`.
export function fitStills(target, hero, els, state) {
  const W = hero.clientWidth, H = hero.clientHeight;
  const img = els.house, w0 = img.offsetWidth, h0 = img.offsetHeight;
  if (!W || !H || !w0 || !h0) return;
  const left0 = img.offsetLeft, top0 = img.offsetTop;
  const hull = STILL_HULL[window.matchMedia(PORTRAIT_QUERY).matches ? "tall" : "wide"];
  const content = {
    left: left0 + hull.left * w0,
    right: left0 + hull.right * w0,
    top: top0 + hull.top * h0,
    bottom: top0 + hull.bottom * h0,
  };
  const safe = heroSafeRect(hero, els.header, els.copy, els.card);
  const s = fitScale(content, safe);
  const { dx, dy } = shiftInto(scaleAbout(content, s, W / 2, H / 2), safe);
  target.style.setProperty("--xh-still", fitTransform(left0 + w0 / 2, top0 + h0 / 2, W, H, s, dx, dy));
  const street = els.street;
  if (street.offsetWidth) {
    const scx = street.offsetLeft + street.offsetWidth / 2, scy = street.offsetTop + street.offsetHeight / 2;
    target.style.setProperty("--xh-street-still", fitTransform(scx, scy, W, H, s, dx, dy));
  }
  // Same fade the live street uses near the heading and card, so the swap from still to live is seamless.
  const rects = heroAvoidRects(hero, null, els.copy, els.card);
  const key = `${W}x${H}:${rects.map((r) => [r.left, r.top, r.right, r.bottom].map(Math.round).join(",")).join(";")}`;
  if (key !== state.maskKey) {
    state.maskKey = key;
    state.canvas = state.canvas || document.createElement("canvas");
    drawStreetMask(state.canvas, W, H, rects);
    target.style.setProperty("--xh-street-mask", `url(${state.canvas.toDataURL()})`);
  }
}
