// Prerenders the homepage into dist/index.html after the client build, so its content paints before the app's
// JavaScript has downloaded (main.tsx then hydrates it rather than rebuilding it).
//
// Every other route keeps the empty app shell: it is saved as dist/app.html and the SPA catch-all in dist/_redirects
// is pointed at it. If this step fails, dist is left exactly as the client build produced it (no prerender, same
// behaviour as before), so a failure here can never break other routes.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build as viteBuild } from "vite";
import { build as esbuild } from "esbuild";

const SHELL_ROOT = '<div id="root"></div>';
const STYLESHEET = /<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/;
const APP_SCRIPT = /<script type="module" crossorigin src="\/assets\/[^"]+\.js"><\/script>/;
const CATCH_ALL = /^\/\*\s+\/index\.html\s+200\s*$/m;

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
  const redirectsFile = path.join(outDir, "_redirects");
  const shell = fs.readFileSync(indexFile, "utf8");
  const redirects = fs.readFileSync(redirectsFile, "utf8");
  if (!shell.includes(SHELL_ROOT)) throw new Error("dist/index.html has no empty #root to fill");
  if (!CATCH_ALL.test(redirects)) throw new Error("dist/_redirects has no '/* /index.html 200' catch-all to repoint");

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
    .replace(SHELL_ROOT, () => `<div id="root">${html}</div><script>${script}</script>`);

  fs.writeFileSync(path.join(outDir, "app.html"), shell);
  fs.writeFileSync(indexFile, home);
  fs.writeFileSync(redirectsFile, redirects.replace(CATCH_ALL, "/* /app.html 200"));
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
      const indexFile = path.join(outDir, "index.html"), redirectsFile = path.join(outDir, "_redirects");
      const before = [fs.readFileSync(indexFile), fs.existsSync(redirectsFile) ? fs.readFileSync(redirectsFile) : null];
      try {
        const { bytes } = await prerenderHome({ root: config.root, outDir });
        config.logger.info(`prerender-home: homepage prerendered (${(bytes / 1024).toFixed(1)} kB of HTML)`);
      } catch (err) {
        // Put back anything half-written; the site then works exactly as an un-prerendered build.
        fs.writeFileSync(indexFile, before[0]);
        if (before[1]) fs.writeFileSync(redirectsFile, before[1]);
        fs.rmSync(path.join(outDir, "app.html"), { force: true });
        config.logger.warn(`prerender-home: skipped, homepage will render client-side (${err && err.message})`);
      }
    },
  };
}
