// Collects the doodle icons into src/generated/doodles.json.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { DOODLES } from "./doodles.mjs";

const out = {};
for (const [name, keywords] of Object.entries(DOODLES)) {
  const svg = readFileSync(`node_modules/@tabler/icons/icons/outline/${name}.svg`, "utf8");
  const inner = svg
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*\/>/, "")
    .replace(/\s+/g, " ")
    .trim();
  out[name] = { svg: inner, keywords };
}
// Interface icons (crisp, not wobbly).
const UI = ["route", "zoom-in", "topology-star-3", "stars", "dice-5", "chevron-left", "chevron-right", "home", "map", "maximize", "x", "notes", "player-play", "arrows-shuffle", "sun", "moon", "upload", "link", "download", "printer", "player-record", "pencil", "arrow-up", "arrow-down", "grip-vertical", "plus", "arrow-back-up", "sparkles", "device-desktop", "wand", "message-2", "presentation", "trash", "copy", "palette", "arrow-right", "arrow-left", "list"];
const ui = {};
for (const name of UI) {
  const svg = readFileSync(`node_modules/@tabler/icons/icons/outline/${name}.svg`, "utf8");
  ui[name] = svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*\/>/, "").replace(/\s+/g, " ").trim();
}
mkdirSync("src/generated", { recursive: true });
writeFileSync("src/generated/ui-icons.json", JSON.stringify(ui));
writeFileSync("src/generated/doodles.json", JSON.stringify(out));
console.log(`doodles: ${Object.keys(out).length}`);
