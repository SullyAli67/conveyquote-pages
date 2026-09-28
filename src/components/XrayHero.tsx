import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import logoMark240 from "../assets/brand/logo-mark-240.png";
import logoMark480 from "../assets/brand/logo-mark-480.png";
import { drawContours } from "../hero/contours.js";
import { drawStreetMask, fitScale, heroAvoidRects, heroSafeRect, scaleAbout, shiftInto } from "../hero/fit.js";
import "../home2026.css";

// From 768px the first five live in the header (as the button and visible links); the menu keeps the logins.
const NAV_LINKS = [
  { href: "/", label: "Get a Quote", headerFromTablet: true },
  { href: "/leasehold/", label: "Leasehold", headerFromTablet: true },
  { href: "/sdlt-calculator/", label: "SDLT Calculator", headerFromTablet: true },
  { href: "/about/", label: "About Us", headerFromTablet: true },
  { href: "/conveyancing-fees/", label: "Fees Guide", headerFromTablet: true },
  { href: "/firm-login/", label: "Firm Login", headerFromTablet: false },
  { href: "/referrer-login/", label: "Referrer Login", headerFromTablet: false },
];
const HEADER_LINKS = ["/leasehold/", "/sdlt-calculator/", "/conveyancing-fees/", "/about/"].map(
  (href) => NAV_LINKS.find((link) => link.href === href)!
);

const STILL = "/images/redesign-2026/terrace-still";
// The rest of the terrace from the same frame, drawn under the house still and faded near the text like the live street.
const STREET = "/images/redesign-2026/terrace-street";
const PORTRAIT_QUERY = "(max-aspect-ratio: 4/5)";
// Stills are the scene's first frame per camera framing; hull is the house outline xrayScene.js also fits, so both move together.
const STILL_HULL = {
  wide: { left: 0.0175, top: 0.0123, right: 0.9827, bottom: 0.9925 },
  tall: { left: 0.026, top: 0.0194, right: 0.9742, bottom: 0.9805 },
};
const srcset = (framing: string, base = STILL, widths = [480, 800, 1200]) =>
  widths.map((w) => `${base}-${framing}-${w}.webp ${w}w`).join(", ");
const STILL_SOURCES = {
  tall: { srcSet: srcset("tall"), sizes: "38vh", png: `${STILL}-tall-800.png`, width: 800, height: 1071 },
  wide: { srcSet: srcset("wide"), sizes: "58vh", png: `${STILL}-wide-800.png`, width: 800, height: 1147 },
};
const STREET_WIDTHS = [480, 800, 1200, 1600];
const STREET_SOURCES = {
  tall: { srcSet: srcset("tall", STREET, STREET_WIDTHS), sizes: "46vh", png: `${STREET}-tall-800.png`, width: 800, height: 922 },
  wide: { srcSet: srcset("wide", STREET, STREET_WIDTHS), sizes: "160vh", png: `${STREET}-wide-800.png`, width: 800, height: 415 },
};

// translate() scale() for an element whose own centre is (cx, cy), matching a scale by s about the hero centre and then a shift.
const fitTransform = (cx: number, cy: number, W: number, H: number, s: number, dx: number, dy: number) =>
  `translate(${(W / 2 + (cx - W / 2) * s + dx - cx).toFixed(1)}px, ${(H / 2 + (cy - H / 2) * s + dy - cy).toFixed(1)}px) scale(${s.toFixed(4)})`;

type NavigatorHints = Navigator & {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
};

// Same attributes three.js would request, so the probe's context is the one the scene renders with.
const GL_ATTRIBUTES: WebGLContextAttributes = {
  alpha: true,
  antialias: true,
  depth: true,
  stencil: true,
  premultipliedAlpha: true,
  preserveDrawingBuffer: true,
  powerPreference: "default",
  failIfMajorPerformanceCaveat: false,
};

const INTERACTIONS = ["pointermove", "pointerdown", "touchstart", "keydown", "wheel", "scroll"] as const;

function prefersStillHero(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  const nav = navigator as NavigatorHints;
  if (nav.connection?.saveData) return true;
  return typeof nav.deviceMemory === "number" && nav.deviceMemory < 4;
}

// Returns the hero canvas's WebGL context when the live scene should run, or null to keep the still.
function liveHeroContext(canvas: HTMLCanvasElement): WebGLRenderingContext | null {
  if (prefersStillHero()) return null;
  try {
    return (canvas.getContext("webgl2", GL_ATTRIBUTES) || canvas.getContext("webgl", GL_ATTRIBUTES)) as WebGLRenderingContext | null;
  } catch {
    return null;
  }
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function scrollToQuote(e?: MouseEvent) {
  const target = document.getElementById("quote");
  if (!target) return;
  e?.preventDefault();
  target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  document.getElementById("type")?.focus({ preventScroll: true });
}

export default function XrayHero({ summary }: { summary: string }) {
  const heroRef = useRef<HTMLElement>(null);
  const contoursRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const driftRef = useRef<HTMLCanvasElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const stillRef = useRef<HTMLImageElement>(null);
  const streetRef = useRef<HTMLImageElement>(null);
  const [live, setLive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useLayoutEffect(() => {
    const hero = heroRef.current!;
    const img = stillRef.current!;
    let raf = 0;
    let lastSize = "";
    let maskKey = "";
    const maskCanvas = document.createElement("canvas");
    const frameStill = () => {
      const W = hero.clientWidth, H = hero.clientHeight;
      const w0 = img.offsetWidth, h0 = img.offsetHeight;
      if (!W || !H || !w0 || !h0) return;
      const left0 = img.offsetLeft, top0 = img.offsetTop;
      const cx0 = left0 + w0 / 2, cy0 = top0 + h0 / 2;
      const hull = STILL_HULL[window.matchMedia(PORTRAIT_QUERY).matches ? "tall" : "wide"];
      const content = {
        left: left0 + hull.left * w0,
        right: left0 + hull.right * w0,
        top: top0 + hull.top * h0,
        bottom: top0 + hull.bottom * h0,
      };
      const safe = heroSafeRect(hero, headerRef.current, copyRef.current, cardRef.current);
      const s = fitScale(content, safe);
      const { dx, dy } = shiftInto(scaleAbout(content, s, W / 2, H / 2), safe);
      hero.style.setProperty("--xh-still", fitTransform(cx0, cy0, W, H, s, dx, dy));
      const street = streetRef.current!;
      if (street.offsetWidth) {
        const scx = street.offsetLeft + street.offsetWidth / 2, scy = street.offsetTop + street.offsetHeight / 2;
        hero.style.setProperty("--xh-street-still", fitTransform(scx, scy, W, H, s, dx, dy));
      }
      // Same fade the live street uses near the heading and card, so the swap from still to live is seamless.
      const rects = heroAvoidRects(hero, null, copyRef.current, cardRef.current);
      const key = `${W}x${H}:${rects.map((r) => [r.left, r.top, r.right, r.bottom].map(Math.round).join(",")).join(";")}`;
      if (key !== maskKey) {
        maskKey = key;
        drawStreetMask(maskCanvas, W, H, rects);
        hero.style.setProperty("--xh-street-mask", `url(${maskCanvas.toDataURL()})`);
      }
    };
    const ro = new ResizeObserver(() => {
      frameStill();
      const size = `${hero.clientWidth}x${hero.clientHeight}`;
      if (size === lastSize) return;
      lastSize = size;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => drawContours(contoursRef.current, hero.clientWidth, hero.clientHeight));
    });
    [hero, headerRef.current!, copyRef.current!, cardRef.current!, streetRef.current!].forEach((el) => ro.observe(el));
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const hero = heroRef.current!;
    let cancelled = false;
    let dispose: (() => void) | null = null;
    let idleId = 0;
    let timeoutId = 0;

    const start = () => {
      if (cancelled) return;
      const context = liveHeroContext(glRef.current!);
      if (!context) return;
      import("../hero/xrayScene.js")
        .then(({ mountXrayHero }) => {
          if (cancelled) return;
          dispose = mountXrayHero(hero, {
            canvas: glRef.current,
            context,
            lens: lensRef.current,
            dot: dotRef.current,
            getSafeRect: () => heroSafeRect(hero, headerRef.current, copyRef.current, cardRef.current),
            drift: driftRef.current,
            getAvoidRects: () => heroAvoidRects(hero, headerRef.current, copyRef.current, cardRef.current),
            getTextRects: () => heroAvoidRects(hero, null, copyRef.current, cardRef.current),
            watch: [headerRef.current, copyRef.current, cardRef.current],
            onFirstFrame: () => { if (!cancelled) setLive(true); },
            onFail: () => { if (!cancelled) setLive(false); },
          });
        })
        .catch((err) => console.warn("X-ray hero unavailable:", err));
    };
    const schedule = () => {
      INTERACTIONS.forEach((type) => window.removeEventListener(type, schedule));
      if (typeof window.requestIdleCallback === "function") idleId = window.requestIdleCallback(start, { timeout: 2000 });
      else timeoutId = window.setTimeout(start, 200);
    };
    // Waits for the visitor's first interaction so the scene's start-up never blocks the page before they engage.
    if (!prefersStillHero()) INTERACTIONS.forEach((type) => window.addEventListener(type, schedule, { passive: true }));

    return () => {
      cancelled = true;
      INTERACTIONS.forEach((type) => window.removeEventListener(type, schedule));
      if (idleId) window.cancelIdleCallback(idleId);
      if (timeoutId) window.clearTimeout(timeoutId);
      dispose?.();
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !menuButtonRef.current?.contains(t)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  return (
    <section ref={heroRef} className={`xh${live ? " is-live" : ""}`} aria-labelledby="xh-heading">
      <canvas ref={contoursRef} className="xh-layer" aria-hidden="true" />
      <canvas ref={driftRef} className="xh-layer" aria-hidden="true" />
      <div className="xh-street" aria-hidden="true">
        <picture className="xh-still">
          <source media={PORTRAIT_QUERY} type="image/webp" srcSet={STREET_SOURCES.tall.srcSet} sizes={STREET_SOURCES.tall.sizes} width={STREET_SOURCES.tall.width} height={STREET_SOURCES.tall.height} />
          <source type="image/webp" srcSet={STREET_SOURCES.wide.srcSet} sizes={STREET_SOURCES.wide.sizes} />
          <source media={PORTRAIT_QUERY} type="image/png" srcSet={STREET_SOURCES.tall.png} width={STREET_SOURCES.tall.width} height={STREET_SOURCES.tall.height} />
          <img ref={streetRef} src={STREET_SOURCES.wide.png} width={STREET_SOURCES.wide.width} height={STREET_SOURCES.wide.height} alt="" decoding="async" />
        </picture>
      </div>
      <picture className="xh-still">
        <source media={PORTRAIT_QUERY} type="image/webp" srcSet={STILL_SOURCES.tall.srcSet} sizes={STILL_SOURCES.tall.sizes} width={STILL_SOURCES.tall.width} height={STILL_SOURCES.tall.height} />
        <source type="image/webp" srcSet={STILL_SOURCES.wide.srcSet} sizes={STILL_SOURCES.wide.sizes} />
        <source media={PORTRAIT_QUERY} type="image/png" srcSet={STILL_SOURCES.tall.png} width={STILL_SOURCES.tall.width} height={STILL_SOURCES.tall.height} />
        <img ref={stillRef} src={STILL_SOURCES.wide.png} width={STILL_SOURCES.wide.width} height={STILL_SOURCES.wide.height} alt="" {...{ fetchpriority: "high" }} />
      </picture>
      <canvas ref={glRef} className="xh-layer xh-gl" aria-hidden="true" />

      <header ref={headerRef} className="xh-header">
        <a href="/" className="xh-logo">
          <img src={logoMark480} srcSet={`${logoMark240} 240w, ${logoMark480} 480w`} sizes="112px" alt="ConveyQuote UK" width={480} height={240} />
        </a>
        <nav className="xh-nav" aria-label="Main">
          <ul className="xh-links">
            {HEADER_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
          <a className="xh-btn" href="#quote" onClick={scrollToQuote}>
            Get my quote <span aria-hidden="true">&rarr;</span>
          </a>
          <button
            ref={menuButtonRef}
            type="button"
            className="xh-menu"
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-controls="xh-menu-panel"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <i aria-hidden="true" />
          </button>
          <div ref={menuRef} id="xh-menu-panel" className="xh-menu-panel" hidden={!menuOpen}>
            <ul>
              {NAV_LINKS.map((link) => (
                <li key={link.href} className={link.headerFromTablet ? "xh-menu-narrow" : undefined}>
                  <a href={link.href} aria-current={link.href === "/" ? "page" : undefined}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </header>

      <div ref={copyRef} className="xh-copy">
        <h1 id="xh-heading">
          Your move,
          <br />
          <span className="xh-accent">made clear.</span>
        </h1>
        <p>{summary}</p>
      </div>

      <div ref={cardRef} className="xh-card">
        <p className="xh-card__title" id="xh-inside">Inside every quote</p>
        <ul aria-labelledby="xh-inside">
          <li>Legal fee <span aria-hidden="true">&#10003;</span></li>
          <li>Searches <span aria-hidden="true">&#10003;</span></li>
          <li>Land Registry <span aria-hidden="true">&#10003;</span></li>
          <li>Stamp Duty <span aria-hidden="true">&#10003;</span></li>
        </ul>
      </div>

      <div ref={lensRef} className="xh-lens" aria-hidden="true" />
      <div ref={dotRef} className="xh-dot" aria-hidden="true" />
    </section>
  );
}
