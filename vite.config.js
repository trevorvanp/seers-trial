import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANT:
// For GitHub Pages at https://trevorvanp.github.io/seers-trial/
// base must be '/seers-trial/' (repo name with slashes).
export default defineConfig({
  base: "/seers-trial/",
  plugins: [react()],
});
