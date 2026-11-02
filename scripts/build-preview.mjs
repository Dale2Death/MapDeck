// Builds a single-page preview (JS and CSS inlined) into preview/ for hosting
// somewhere that serves one HTML file plus the PDF worker.
import { build } from "vite";
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync } from "node:fs";

await build({
  logLevel: "warn",
  build: { outDir: "preview-dist", emptyOutDir: true, rolldownOptions: { output: { codeSplitting: false } } },
});
const dir = "preview-dist/assets";
const files = readdirSync(dir);
const js = files.find((f) => f.startsWith("index-") && f.endsWith(".js"));
const css = files.find((f) => f.endsWith(".css"));
const worker = files.find((f) => f.includes("pdf.worker"));
rmSync("preview", { recursive: true, force: true });
mkdirSync("preview", { recursive: true });
// Some hosts refuse raw control characters; write them as \xHH escapes
// (they only occur inside string literals in these bundles).
const escapeControls = (t) => t.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, (c) => "\\x" + c.charCodeAt(0).toString(16).padStart(2, "0"));
writeFileSync(`preview/${worker}`, escapeControls(readFileSync(`${dir}/${worker}`, "utf8")));
const script = escapeControls(readFileSync(`${dir}/${js}`, "utf8")).replace(/<\/script/gi, "<\\/script");
const html = `<title>MapDeck</title>
<meta name="description" content="Turn decks and documents into map-style presentations.">
<style>${readFileSync(`${dir}/${css}`, "utf8")}</style>
<div id="root"></div>
<div id="print-root"></div>
<script type="module">${script}</script>
`;
writeFileSync("preview/index.html", html);
rmSync("preview-dist", { recursive: true, force: true });
console.log("preview/index.html", (html.length / 1024).toFixed(0) + "KB", "worker:", worker);
