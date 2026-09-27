import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import logo from "../assets/logo.png";
import { drawContours } from "../hero/contours.js";
import { fitScale, heroSafeRect, scaleAbout, shiftInto } from "../hero/fit.js";
import "../home2026.css";

const NAV_LINKS = [
  { href: "/", label: "Get a Quote" },
  { href: "/leasehold/", label: "Leasehold" },
  { href: "/sdlt-calculator/", label: "SDLT Calculator" },
  { href: "/about/", label: "About Us" },
  { href: "/conveyancing-fees/", label: "Fees Guide" },
  { href: "/firm-login/", label: "Firm Login" },
  { href: "/referrer-login/", label: "Referrer Login" },
];

const STILL = "/images/redesign-2026/victorian-terrace-still";
// Opaque area of the still inside its transparent margin, as fractions of the image.
const STILL_CONTENT = { left: 60 / 1972, right: 1912 / 1972, top: 60 / 2402, bottom: 2342 / 2402 };

type NavigatorHints = Navigator & {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
};

function canRunLiveHero(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const nav = navigator as NavigatorHints;
  if (nav.connection?.saveData) return false;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 4) return false;
  try {
    const gl = (document.createElement("canvas").getContext("webgl2") ||
      document.createElement("canvas").getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
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
  const lensRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const stillRef = useRef<HTMLImageElement>(null);
  const [live, setLive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useLayoutEffect(() => {
    const hero = heroRef.current!;
    const img = stillRef.current!;
    let raf = 0;
    let lastSize = "";
    const frameStill = () => {
      const W = hero.clientWidth, H = hero.clientHeight;
      const w0 = img.offsetWidth, h0 = img.offsetHeight;
      if (!W || !H || !w0 || !h0) return;
      const cx0 = img.offsetLeft, top0 = img.offsetTop, cy0 = top0 + h0 / 2;
      const content = {
        left: cx0 - w0 / 2 + STILL_CONTENT.left * w0,
        right: cx0 - w0 / 2 + STILL_CONTENT.right * w0,
        top: top0 + STILL_CONTENT.top * h0,
        bottom: top0 + STILL_CONTENT.bottom * h0,
      };
      const safe = heroSafeRect(hero, headerRef.current, copyRef.current, cardRef.current);
      const s = fitScale(content, safe);
      const { dx, dy } = shiftInto(scaleAbout(content, s, W / 2, H / 2), safe);
      const tx = W / 2 + (cx0 - W / 2) * s + dx - cx0;
      const ty = H / 2 + (cy0 - H / 2) * s + dy - cy0;
      hero.style.setProperty("--xh-still", `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${s.toFixed(4)})`);
    };
    const ro = new ResizeObserver(() => {
      frameStill();
      const size = `${hero.clientWidth}x${hero.clientHeight}`;
      if (size === lastSize) return;
      lastSize = size;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => drawContours(contoursRef.current, hero.clientWidth, hero.clientHeight));
    });
    [hero, headerRef.current!, copyRef.current!, cardRef.current!].forEach((el) => ro.observe(el));
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
      if (cancelled || !canRunLiveHero()) return;
      import("../hero/xrayScene.js")
        .then(({ mountXrayHero }) => {
          if (cancelled) return;
          dispose = mountXrayHero(hero, {
            canvas: glRef.current,
            lens: lensRef.current,
            dot: dotRef.current,
            getSafeRect: () => heroSafeRect(hero, headerRef.current, copyRef.current, cardRef.current),
            watch: [headerRef.current, copyRef.current, cardRef.current],
            onFirstFrame: () => { if (!cancelled) setLive(true); },
            onFail: () => { if (!cancelled) setLive(false); },
          });
        })
        .catch((err) => console.warn("X-ray hero unavailable:", err));
    };
    const schedule = () => {
      if (typeof window.requestIdleCallback === "function") idleId = window.requestIdleCallback(start, { timeout: 2000 });
      else timeoutId = window.setTimeout(start, 200);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", schedule);
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
      <picture className="xh-still">
        <source
          type="image/webp"
          srcSet={`${STILL}-480.webp 480w, ${STILL}-800.webp 800w, ${STILL}-1200.webp 1200w`}
          sizes="(max-aspect-ratio: 4/5) 43vh, 70vh"
        />
        <img ref={stillRef} src={`${STILL}-800.png`} width={800} height={974} alt="" decoding="async" />
      </picture>
      <canvas ref={glRef} className="xh-layer xh-gl" aria-hidden="true" />

      <header ref={headerRef} className="xh-header">
        <a href="/" className="xh-logo">
          <img src={logo} alt="ConveyQuote UK" width={1024} height={1024} />
        </a>
        <nav className="xh-nav" aria-label="Main">
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
                <li key={link.href}>
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

      <div ref={lensRef} className="xh-lens" data-label="See inside" aria-hidden="true" />
      <div ref={dotRef} className="xh-dot" aria-hidden="true" />
    </section>
  );
}
