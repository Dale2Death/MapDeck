import type { Slide } from "../core/types";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Inner HTML for one slide card (960×540 before scaling). */
export function cardHtml(s: Slide, number: number, logo?: string): string {
  const kicker = `<div class="mdp-kicker"><b>${number}</b><span>${esc(s.section && s.section !== "Main" ? s.section : "")}</span></div>`;
  if (s.image && s.imageFit === "full") {
    return `<img src="${s.image}" alt="${esc(s.title)}" draggable="false">${kicker}`;
  }
  const longTitle = s.title.length > 48;
  const title = `<h2 class="mdp-title${longTitle ? " is-long" : ""}">${esc(s.title)}</h2>`;
  if (!s.points.length && !s.image) {
    const logoImg = logo ? `<img src="${logo}" alt="" draggable="false" style="max-height:90px;max-width:260px;object-fit:contain;margin-bottom:10px">` : "";
    return `${logoImg}${kicker}${title}`;
  }
  const pts = s.points.slice(0, 8);
  const chars = pts.join("").length;
  const density = pts.length > 6 || chars > 420 ? " is-xdense" : pts.length > 4 || chars > 260 ? " is-dense" : "";
  const list = pts.length ? `<ul class="mdp-points${density}">${pts.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : "";
  const side = s.image ? `<img class="mdp-side" src="${s.image}" alt="" draggable="false">` : "";
  return `${kicker}${title}<div class="mdp-body">${list}${side}</div>`;
}

export function cardClass(s: Slide): string {
  if (s.image && s.imageFit === "full") return "mdp-card mdp-card--full";
  if (!s.points.length && !s.image) return "mdp-card mdp-card--title";
  return "mdp-card";
}
