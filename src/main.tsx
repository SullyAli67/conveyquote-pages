import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

const root = document.getElementById("root")!;
const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// The homepage arrives prerendered for a plain "/" (scripts/prerender-home.mjs). Query parameters such as ?type= or
// ?city= change what it renders, so only attach to that markup when every parameter is one that never does.
const RENDER_NEUTRAL_PARAM = /^(utm_[a-z_]+|gclid|gbraid|wbraid|dclid|fbclid|msclkid|ttclid|twclid|li_fat_id|_gl|ref)$/;
const matchesPrerender = [...new URLSearchParams(window.location.search).keys()].every((key) => RENDER_NEUTRAL_PARAM.test(key));

if (root.hasChildNodes() && matchesPrerender) {
  ReactDOM.hydrateRoot(root, app);
} else {
  root.textContent = "";
  ReactDOM.createRoot(root).render(app);
}
