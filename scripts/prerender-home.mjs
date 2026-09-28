// Prerenders the homepage into dist/index.html after the client build, so its content paints before the app's
// JavaScript has downloaded (main.tsx then hydrates it rather than rebuilding it).
//
// Routing is untouched: the _redirects catch-all still serves index.html for every other route. Those routes must not
// show the homepage, so a guard hides #root before it is parsed and empties it straight after; the app then renders
// the route as before. (Pointing the catch-all at a second HTML file loops on Cloudflare Pages: it redirects
// /app.html to /app, which the catch-all rewrites to /app.html again.) If this step fails, dist is left exactly as
// the client build produced it.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build as viteBuild } from "vite";
import { build as esbuild } from "esbuild";

const SHELL_ROOT = '<div id="root"></div>';
const STYLESHEET = /<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/;
const APP_SCRIPT = /<script type="module" crossorigin src="\/assets\/[^"]+\.js"><\/script>/;
// Before #root: hide it on any route but "/". After #root: empty it there and unhide, before the app script runs.
const GUARD_BEFORE = '<style>.cq-shell #root{visibility:hidden}</style><script>if(location.pathname!=="/")document.documentElement.classList.add("cq-shell")</script>';
const GUARD_AFTER = '<script>if(location.pathname!=="/"){document.getElementById("root").textContent="";document.documentElement.classList.remove("cq-shell")}</script>';

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
}

// Renders the app at "/" as a first-time visitor with nothing stored would see it.
async function renderHome(entryFile) {
  const saved = { window: globalThis.window, location: globalThis.location, localStorage: globalThis.localStorage, sessionStorage: globalThis.sessionStorage };
  const error = console.error;
  globalThis.window = globalThis;
  globalThis.location = new URL("https://conveyquote.uk/");
  globalThis.localStorage = memoryStorage();
  globalThis.sessionStorage = memoryStorage();
  // Layout effects cannot run on the server; the homepage's only ones position things that the inline script covers.
  console.error = (msg, ...rest) => (String(msg).includes("useLayoutEffect does nothing on the server") ? undefined : error(msg, ...rest));
  try {
    const { render } = await import(`${pathToFileURL(entryFile).href}?t=${Date.now()}`);
    return render();
  } finally {
    console.error = error;
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete globalThis[k];
      else globalThis[k] = v;
    }
  }
}

export async function prerenderHome({ root, outDir }) {
  const indexFile = path.join(outDir, "index.html");
  const shell = fs.readFileSync(indexFile, "utf8");
  if (!shell.includes(SHELL_ROOT)) throw new Error("dist/index.html has no empty #root to fill");

  const ssrDir = path.join(root, "node_modules/.cache/prerender");
  await viteBuild({
    root,
    logLevel: "warn",
    build: { ssr: "src/entry-prerender.tsx", outDir: ssrDir, emptyOutDir: true, copyPublicDir: false, rollupOptions: { output: { entryFileNames: "entry-prerender.mjs" } } },
  });
  const html = await renderHome(path.join(ssrDir, "entry-prerender.mjs"));
  if (!html.includes('class="xh"')) throw new Error("prerendered homepage is missing the hero");

  const inline = await esbuild({
    entryPoints: [path.join(root, "src/hero/stillFit.inline.js")],
    bundle: true,
    minify: true,
    format: "iife",
    target: "es2019",
    write: false,
  });
  const script = inline.outputFiles[0].text.trim().replace(/<\/script/gi, "<\\/script");

  // The homepage paints from its own HTML, so: inline the stylesheet (one less round trip before first paint) and let
  // the pictures and fonts go ahead of the app script, which only has to arrive in time to make the page interactive.
  const css = shell.match(STYLESHEET), app = shell.match(APP_SCRIPT);
  if (!css || !app) throw new Error("dist/index.html is missing the app stylesheet or script tag");
  const cssText = fs.readFileSync(path.join(outDir, css[1]), "utf8").replace(/<\/style/gi, "<\\/style");
  const home = shell
    .replace(css[0], () => `<style>${cssText}</style>`)
    .replace(app[0], () => app[0].replace("<script ", '<script fetchpriority="low" '))
    .replace(SHELL_ROOT, () => `${GUARD_BEFORE}<div id="root">${html}</div>${GUARD_AFTER}<script>${script}</script>`);

  fs.writeFileSync(indexFile, home);
  return { bytes: html.length };
}

// Vite plugin: runs after the client build, never for the nested server build.
export function prerenderHomePlugin() {
  let config;
  return {
    name: "prerender-home",
    apply: "build",
    configResolved(c) {
      config = c;
    },
    async closeBundle() {
      if (config.build.ssr) return;
      const outDir = path.resolve(config.root, config.build.outDir);
      const indexFile = path.join(outDir, "index.html");
      const before = fs.readFileSync(indexFile);
      try {
        const { bytes } = await prerenderHome({ root: config.root, outDir });
        config.logger.info(`prerender-home: homepage prerendered (${(bytes / 1024).toFixed(1)} kB of HTML)`);
      } catch (err) {
        // Put back anything half-written; the site then works exactly as an un-prerendered build.
        fs.writeFileSync(indexFile, before);
        config.logger.warn(`prerender-home: skipped, homepage will render client-side (${err && err.message})`);
      }
    },
  };
}
