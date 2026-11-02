// Bundles the standalone player (used inside exported HTML files) into one
// script the app can inline with `?raw`.
import { build } from "esbuild";

await build({
  entryPoints: ["src/player/standalone.ts"],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  outfile: "src/generated/player.js",
  logLevel: "warning",
});
