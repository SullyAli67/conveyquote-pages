import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { prerenderHomePlugin } from "./scripts/prerender-home.mjs";

export default defineConfig({
  plugins: [react(), prerenderHomePlugin()],
});
