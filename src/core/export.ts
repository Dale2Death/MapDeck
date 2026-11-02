import playerJs from "../generated/player.js?raw";
import type { Presentation } from "./types";

/** A single self-contained HTML file that plays the presentation offline. */
export function exportHtml(pres: Presentation): string {
  const json = JSON.stringify(pres).replace(/</g, "\\u003c");
  const title = pres.deck.title.replace(/[<&>"]/g, "");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>html,body{margin:0;height:100%;background:#000}#mapdeck{position:fixed;inset:0}</style>
</head>
<body>
<div id="mapdeck"></div>
<script id="mapdeck-data" type="application/json">${json}</script>
<script>${playerJs.replace(/<\/script/gi, "<\\/script")}</script>
</body>
</html>
`;
}

export function download(filename: string, content: Blob | string, type = "text/html") {
  const blob = typeof content === "string" ? new Blob([content], { type }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function safeFileName(s: string): string {
  return (s.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "mapdeck").slice(0, 60);
}
