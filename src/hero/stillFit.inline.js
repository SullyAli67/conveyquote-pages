// Inlined into the prerendered homepage (scripts/prerender-home.mjs) right after its markup, so the stills and
// background contours are placed before first paint instead of after the app has loaded. XrayHero takes over on mount.
import { drawContours } from "./contours.js";
import { fitStills } from "./stillFit.js";

(function () {
  var hero = document.querySelector(".xh");
  if (!hero) return;
  var q = function (s) { return hero.querySelector(s); };
  var els = { house: q(":scope > .xh-still img"), street: q(".xh-street img"), header: q(".xh-header"), copy: q(".xh-copy"), card: q(".xh-card") };
  if (!els.house || !els.street || !els.header || !els.copy || !els.card) return;
  var state = { maskKey: "", canvas: null };
  var root = document.documentElement;
  function run() {
    fitStills(root, hero, els, state);
  }
  function resize() {
    run();
    drawContours(q("canvas"), hero.clientWidth, hero.clientHeight);
  }
  resize();
  window.addEventListener("resize", resize);
  // The 3D scene starts on the visitor's first interaction (XrayHero.tsx INTERACTIONS). The prerendered page is usable
  // before the app is listening, so remember an early interaction for XrayHero to act on when it mounts.
  var early = ["pointermove", "pointerdown", "touchstart", "keydown", "wheel", "scroll"];
  function interacted() {
    window.__xhInteracted = true;
    early.forEach(function (t) { window.removeEventListener(t, interacted); });
  }
  early.forEach(function (t) { window.addEventListener(t, interacted, { passive: true }); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
  // XrayHero calls this once it is managing the stills itself.
  window.__xhStillsOff = function () {
    window.removeEventListener("resize", resize);
    early.forEach(function (t) { window.removeEventListener(t, interacted); });
    root.style.removeProperty("--xh-still");
    root.style.removeProperty("--xh-street-still");
    root.style.removeProperty("--xh-street-mask");
  };
})();
