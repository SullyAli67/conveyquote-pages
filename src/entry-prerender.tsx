// Server entry used only at build time by scripts/prerender-home.mjs to render the homepage to static HTML.
import React from "react";
import { renderToString } from "react-dom/server";
import App from "./App";

export function render() {
  return renderToString(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
