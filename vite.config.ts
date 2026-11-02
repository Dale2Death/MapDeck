import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative paths so the build works from any folder (e.g. GitHub Pages).
  base: "./",
  plugins: [react()],
  test: { environment: "jsdom" },
} as any);
