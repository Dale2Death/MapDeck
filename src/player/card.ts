import type { Look, Slide, SlideLayout } from "../core/types";
import { basaltCardHtml, type CardContext } from "./card-basalt";
import { compareColumns, extractStat, layoutOf, tidy } from "../design/classify";
import { doodleSvg, pickDoodle } from "../design/doodles";
import { hashSeed, ink, seeded } from "../design/sketch";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** The sheet of paper each slide is drawn on: inked edge plus a strip of tape. */
function sheet(seed: number): string {
  const r = seeded(seed);
  const tapeW = 150 + r() * 40;
  const tapeX = 480 - tapeW / 2 + (r() - 0.5) * 120;
  const tilt = (r() - 0.5) * 8;
  return `<svg class="mdp-sheet" viewBox="0 0 960 540" preserveAspectRatio="none" aria-hidden="true">` +
    ink.rect(8, 8, 944, 524, { seed, width: 2.2, roughness: 1.1, bowing: 0.6, stroke: "var(--ink)" }) +
    `<rect class="mdp-tape" x="${tapeX.toFixed(0)}" y="-14" width="${tapeW.toFixed(0)}" height="40" transform="rotate(${tilt.toFixed(1)} ${(tapeX + tapeW / 2).toFixed(0)} 6)"/>` +
    `</svg>`;
}

function kicker(s: Slide, n: number): string {
  const sec = s.section && s.section !== "Main" ? esc(s.section) : "";
  return `<div class="mdp-kicker"><span class="mdp-no">${String(n).padStart(2, "0")}</span>${sec ? `<span>${sec}</span>` : ""}</div>`;
}

function underline(seed: number, w = 320): string {
  return `<svg class="mdp-swoosh" viewBox="0 0 ${w} 24" aria-hidden="true">${ink.curve([[4, 16], [w * 0.3, 9], [w * 0.65, 14], [w - 6, 6]], { seed, width: 3.2, roughness: 1.4, stroke: "var(--sec)" })}</svg>`;
}

function bullet(seed: number): string {
  return `<svg class="mdp-bul" viewBox="0 0 24 24" aria-hidden="true">${ink.circle(12, 12, 11, { seed, width: 1.6, roughness: 1.2, stroke: "var(--sec)", fill: "var(--sec)", fillStyle: "hachure", hachureGap: 2.6 })}</svg>`;
}

function titleClass(t: string, base = ""): string {
  return `mdp-title${base}${t.length > 60 ? " is-xlong" : t.length > 36 ? " is-long" : ""}`;
}

/** Inner HTML for one slide card (960×540 before scaling). */
export function cardHtml(s: Slide, number: number, logo?: string, index = number - 1, ctx: CardContext & { look?: Look } = {}): string {
  if ((ctx.look ?? "basalt") === "basalt") return basaltCardHtml(s, number, logo, index, ctx);
  const layout = layoutOf(s, index);
  const seed = hashSeed(s.id);
  const doodleName = pickDoodle(s, index);
  const pts = s.points.map(tidy).filter(Boolean);
  let body = "";

  switch (layout) {
    case "title": {
      const logoImg = logo ? `<img class="mdp-logo" src="${logo}" alt="" draggable="false">` : "";
      body = `<div class="mdp-l-title">
        <div class="mdp-col">${logoImg}${kicker(s, number)}
          <h1 class="${titleClass(s.title, " mdp-display")}">${esc(s.title)}</h1>
          ${underline(seed)}
          ${pts[0] ? `<p class="mdp-hand">${esc(pts[0])}</p>` : ""}
        </div>
        <div class="mdp-art">${doodleSvg(doodleName, s.id)}</div>
      </div>`;
      break;
    }
    case "statement": {
      body = `<div class="mdp-l-statement">
        ${kicker(s, number)}
        <div class="mdp-art-sm">${doodleSvg(doodleName, s.id)}</div>
        <h2 class="${titleClass(s.title, " mdp-display")}">${esc(s.title)}</h2>
        ${pts[0] ? `<p class="mdp-hand mdp-annot">${esc(pts[0])}</p>` : ""}
      </div>`;
      break;
    }
    case "stat": {
      const stats = pts.map((p) => extractStat(p) ?? { value: "", label: p }).slice(0, 4);
      body = `<div class="mdp-l-stat">
        <header>${kicker(s, number)}<h2 class="${titleClass(s.title)}">${esc(s.title)}</h2></header>
        <div class="mdp-stats n${stats.length}">${stats
          .map((st, i) => `<div class="mdp-stat">
            <div class="mdp-stat-v"><svg class="mdp-ring" viewBox="0 0 240 130" preserveAspectRatio="none" aria-hidden="true">${ink.ellipse(120, 65, 226, 112, { seed: seed + i, width: 3, roughness: 1.6, stroke: "var(--sec)", single: true })}</svg><span>${esc(st.value)}</span></div>
            <p>${esc(st.label)}</p></div>`)
          .join("")}</div>
        <div class="mdp-art-corner">${doodleSvg(doodleName, s.id)}</div>
      </div>`;
      break;
    }
    case "steps": {
      const n = Math.min(pts.length, 5);
      const step = 960 / n;
      let line = "";
      for (let i = 0; i < n - 1; i++) {
        line += ink.line(step * i + step / 2 + 46, 60, step * (i + 1) + step / 2 - 46, 60, { seed: seed + i, width: 2.4, roughness: 1.4, stroke: "var(--ink)", dash: "10 10" });
      }
      const circles = pts.slice(0, 5).map((_, i) => ink.circle(step * i + step / 2, 60, 84, { seed: seed + 10 + i, width: 2.6, roughness: 1.2, stroke: "var(--ink)", fill: "var(--sec)", fillStyle: "hachure", hachureGap: 7 })).join("");
      const nums = pts.slice(0, 5).map((_, i) => `<text x="${step * i + step / 2}" y="76" text-anchor="middle" class="mdp-step-n">${i + 1}</text>`).join("");
      body = `<div class="mdp-l-steps">
        <header>${kicker(s, number)}<h2 class="${titleClass(s.title)}">${esc(s.title)}</h2></header>
        <svg class="mdp-steps-art" viewBox="0 0 960 120" aria-hidden="true">${line}${circles}${nums}</svg>
        <div class="mdp-steps n${n}">${pts.slice(0, 5).map((p) => `<p>${esc(p.replace(/^(step|phase|stage|part)\s*\d+\s*[:.\-–]?\s*|^\d+[.)]\s*/i, ""))}</p>`).join("")}</div>
      </div>`;
      break;
    }
    case "compare": {
      const { left, right } = compareColumns(s);
      const col = (c: { head: string; items: string[] }) =>
        `<div class="mdp-cmp-col">${c.head ? `<h3 class="mdp-hand">${esc(c.head)}</h3>` : ""}<ul>${c.items.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>`;
      body = `<div class="mdp-l-compare">
        <header>${kicker(s, number)}<h2 class="${titleClass(s.title)}">${esc(s.title)}</h2></header>
        <div class="mdp-cmp">${col(left)}
          <div class="mdp-cmp-mid"><svg viewBox="0 0 80 300" preserveAspectRatio="none" aria-hidden="true">${ink.line(40, 0, 40, 300, { seed, width: 2.2, roughness: 1.6, stroke: "var(--ink)" })}${ink.circle(40, 150, 64, { seed: seed + 1, width: 2.2, stroke: "var(--ink)", fill: "var(--paper-2)", fillStyle: "solid" })}</svg><span class="mdp-hand">vs</span></div>
          ${col(right)}</div>
      </div>`;
      break;
    }
    case "quote": {
      const q = pts[0]?.replace(/^["“”'‘’«]+|["“”'‘’»]+$/g, "") ?? s.title;
      const by = pts[1] ?? (pts[0] ? s.title : "");
      body = `<div class="mdp-l-quote">
        ${kicker(s, number)}
        <div class="mdp-qmark">“</div>
        <blockquote class="mdp-display${q.length > 140 ? " is-long" : ""}">${esc(q)}</blockquote>
        ${by ? `<p class="mdp-hand">— ${esc(by.replace(/^[—–-]\s*/, ""))}</p>` : ""}
      </div>`;
      break;
    }
    case "photo": {
      body = `<div class="mdp-l-photo">
        <figure><img src="${s.image}" alt="" draggable="false"><span class="mdp-tape-c a"></span><span class="mdp-tape-c b"></span></figure>
        <div class="mdp-col">${kicker(s, number)}<h2 class="${titleClass(s.title)}">${esc(s.title)}</h2>
          ${pts.length ? `<ul class="mdp-points">${pts.slice(0, 4).map((p, i) => `<li>${bullet(seed + i)}<span>${esc(p)}</span></li>`).join("")}</ul>` : ""}
        </div>
      </div>`;
      break;
    }
    default: {
      const shown = pts.slice(0, 7);
      const chars = shown.join("").length;
      const density = shown.length > 5 || chars > 380 ? " is-xdense" : shown.length > 3 || chars > 220 ? " is-dense" : "";
      body = `<div class="mdp-l-list">
        <header>${kicker(s, number)}<h2 class="${titleClass(s.title)}">${esc(s.title)}</h2></header>
        <ul class="mdp-points${density}">${shown.map((p, i) => `<li>${bullet(seed + i)}<span>${esc(p)}</span></li>`).join("")}</ul>
        <div class="mdp-art-corner">${doodleSvg(doodleName, s.id)}</div>
      </div>`;
    }
  }
  return sheet(seed) + body;
}

export function cardClass(s: Slide, index = 0): string {
  return `mdp-card mdp-lay-${layoutOf(s, index)}`;
}

export const LAYOUTS: { id: SlideLayout; name: string }[] = [
  { id: "title", name: "Title" },
  { id: "statement", name: "Big statement" },
  { id: "list", name: "List" },
  { id: "stat", name: "Big numbers" },
  { id: "steps", name: "Steps" },
  { id: "compare", name: "Compare" },
  { id: "quote", name: "Quote" },
  { id: "photo", name: "Photo" },
];
