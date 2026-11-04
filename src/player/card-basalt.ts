import type { Slide } from "../core/types";
import { compareColumns, extractStat, layoutOf, tidy } from "../design/classify";

/**
 * Basalt slides: editorial and quiet. A ruled running header, short topic
 * titles, big light numerals, hairline rules instead of boxes, square corners,
 * flat colour and at most one signal mark per slide.
 */

export interface CardContext {
  deckTitle?: string;
  /** 0-based index of this slide's section among the deck's sections. */
  sectionIndex?: number;
  sectionCount?: number;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Key numbers read in the highlight colour, like Basalt's **…** takeaways. */
const KEY_NUM = /((?:[$€£¥]\s?)\d[\d,]*(?:\.\d+)?\s?(?:k|m|bn|b)?|\d[\d,]*(?:\.\d+)?\s?(?:%|x|×)|\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?\s?(?:k|m|bn)\b)/gi;
function rich(s: string): string {
  return esc(s).replace(KEY_NUM, '<b class="mdb-key">$1</b>');
}

function hasSection(s: Slide) {
  return !!s.section && s.section !== "Main";
}

function runhead(s: Slide, number: number, ctx: CardContext): string {
  const sec = hasSection(s);
  const no = sec && ctx.sectionIndex !== undefined ? ctx.sectionIndex + 1 : number;
  return `<header class="mdb-run"><span class="mdb-run-l"><b>${pad(no)}</b>${sec ? `<span>${esc(s.section)}</span>` : ""}</span><span class="mdb-run-r">${esc(ctx.deckTitle ?? "")}</span></header>`;
}

function titleSize(t: string, base: number): string {
  const n = t.length;
  const px = n > 70 ? base * 0.7 : n > 44 ? base * 0.82 : base;
  return `style="font-size:${Math.round(px)}px"`;
}

function folio(number: number): string {
  return `<span class="mdb-folio">${number}</span>`;
}

/** Inner HTML for one Basalt slide (960×540 before scaling). */
export function basaltCardHtml(s: Slide, number: number, logo: string | undefined, index: number, ctx: CardContext = {}): string {
  const layout = layoutOf(s, index);
  const pts = s.points.map(tidy).filter(Boolean);
  const head = runhead(s, number, ctx);
  const title = (base = 40) => `<h2 class="mdb-title" ${titleSize(s.title, base)}>${esc(s.title)}</h2>`;

  switch (layout) {
    case "title": {
      const kicker = hasSection(s) ? s.section : ctx.deckTitle && ctx.deckTitle !== s.title ? ctx.deckTitle : "Presentation";
      const panel = s.image
        ? `<figure class="mdb-panel"><img src="${s.image}" alt="" draggable="false"></figure>`
        : `<div class="mdb-panel mdb-contours" aria-hidden="true">${contours(s.id)}<i class="mdb-mark"></i></div>`;
      return `<div class="mdb mdb-l-title">
        <div class="mdb-col">
          <p class="mdb-label mdb-kicker">${esc(kicker)}</p>
          <h1 class="mdb-hero" ${titleSize(s.title, 60)}>${esc(s.title)}</h1>
          ${pts[0] ? `<p class="mdb-sub">${esc(pts[0])}</p>` : ""}
          <div class="mdb-foot">${pts[1] ? `<p class="mdb-label">${esc(pts[1])}</p>` : "<span></span>"}${logo ? `<img class="mdb-logo" src="${logo}" alt="" draggable="false">` : ""}</div>
        </div>
        ${panel}
      </div>`;
    }
    case "statement": {
      const n = hasSection(s) && ctx.sectionIndex !== undefined ? ctx.sectionIndex + 1 : number;
      const right = hasSection(s) && ctx.sectionCount ? `${pad(n)} / ${pad(ctx.sectionCount)}` : "";
      return `<div class="mdb mdb-l-statement">
        <header class="mdb-run is-dark"><span class="mdb-run-l"><span>${esc(ctx.deckTitle ?? "")}</span></span><span class="mdb-run-r">${right}</span></header>
        <div class="mdb-numeral">${pad(n)}</div>
        <div class="mdb-stmt">
          <h2 class="mdb-stmt-t" ${titleSize(s.title, 52)}>${esc(s.title)}</h2>
          ${pts[0] ? `<p>${esc(pts[0])}</p>` : ""}
        </div>
      </div>`;
    }
    case "stat": {
      const stats = pts.map((p) => extractStat(p) ?? { value: "", label: p }).slice(0, 4);
      return `<div class="mdb mdb-l-stat">${head}${title()}
        <div class="mdb-stats n${stats.length}">${stats
          .map((st) => `<div class="mdb-stat"><p class="mdb-stat-v">${esc(st.value)}</p><p class="mdb-stat-l">${rich(st.label)}</p></div>`)
          .join("")}</div>${folio(number)}
      </div>`;
    }
    case "steps": {
      const items = pts.slice(0, 5).map((p) => p.replace(/^(step|phase|stage|part)\s*\d+\s*[:.\-–]?\s*|^\d+[.)]\s*/i, ""));
      return `<div class="mdb mdb-l-steps">${head}${title()}
        <div class="mdb-track n${items.length}">${items
          .map((p, i) => `<div class="mdb-phase" style="--ph:var(--c${i % 5})"><p class="mdb-label">Step ${pad(i + 1)}</p><i></i><p class="mdb-phase-n">${pad(i + 1)}</p><p class="mdb-phase-t">${rich(p)}</p></div>`)
          .join("")}</div>${folio(number)}
      </div>`;
    }
    case "compare": {
      const { left, right } = compareColumns(s);
      const col = (c: { head: string; items: string[] }, k: number) =>
        `<div class="mdb-panel-col k${k}"><h3>${esc(c.head || (k === 0 ? "Before" : "After"))}</h3><ul>${c.items.map((p) => `<li>${rich(p)}</li>`).join("")}</ul></div>`;
      return `<div class="mdb mdb-l-compare">${head}${title()}
        <div class="mdb-cols">${col(left, 0)}${col(right, 1)}</div>${folio(number)}
      </div>`;
    }
    case "quote": {
      const q = pts[0]?.replace(/^["“”'‘’«]+|["“”'‘’»]+$/g, "") ?? s.title;
      const by = pts[1] ?? (pts[0] ? s.title : "");
      return `<div class="mdb mdb-l-quote">${head}
        <div class="mdb-quote"><i class="mdb-mark"></i>
          <blockquote${q.length > 140 ? ' class="is-long"' : ""}>${esc(q)}</blockquote>
          ${by ? `<p class="mdb-label">${esc(by.replace(/^[—–-]\s*/, ""))}</p>` : ""}
        </div>${folio(number)}
      </div>`;
    }
    case "photo": {
      return `<div class="mdb mdb-l-photo">
        <div class="mdb-col">${head}${title(34)}
          ${pts.length ? `<ol class="mdb-rows is-compact">${pts.slice(0, 4).map((p, i) => `<li><span class="mdb-rn">${pad(i + 1)}</span><span>${rich(p)}</span></li>`).join("")}</ol>` : ""}
          ${folio(number)}
        </div>
        <figure class="mdb-panel"><img src="${s.image}" alt="" draggable="false"></figure>
      </div>`;
    }
    default: {
      const shown = pts.slice(0, 7);
      const chars = shown.join("").length;
      const density = shown.length > 5 || chars > 380 ? " is-xdense" : shown.length > 3 || chars > 220 ? " is-dense" : "";
      return `<div class="mdb mdb-l-list">${head}${title()}
        <ol class="mdb-rows${density}">${shown.map((p, i) => `<li><span class="mdb-rn">${pad(i + 1)}</span><span>${rich(p)}</span></li>`).join("")}</ol>${folio(number)}
      </div>`;
    }
  }
}

/** Quiet contour lines for the title panel: a nod to the map, drawn as hairlines. */
function contours(seedKey: string): string {
  let h = 0;
  for (let i = 0; i < seedKey.length; i++) h = (h * 31 + seedKey.charCodeAt(i)) >>> 0;
  const cx = 250 + (h % 90);
  const cy = 330 + ((h >> 8) % 120);
  let rings = "";
  for (let k = 1; k <= 9; k++) {
    const r = k * 46;
    const wob = 0.86 + ((h >> k) % 10) / 60;
    rings += `<ellipse cx="${cx}" cy="${cy}" rx="${(r * 1.08).toFixed(0)}" ry="${(r * wob).toFixed(0)}" transform="rotate(${-18 + k * 3} ${cx} ${cy})"/>`;
  }
  return `<svg viewBox="0 0 400 540" preserveAspectRatio="xMidYMid slice">${rings}</svg>`;
}

/** CSS for Basalt slides. Scoped under [data-look=basalt]. */
export const BASALT_CARD_CSS = /* css */ `
.mdp[data-look=basalt] .mdp-card{border-radius:0;box-shadow:none;background:var(--card);outline:1px solid var(--rule-line);outline-offset:0}
.mdp[data-look=basalt] .mdp-card>div.mdb{position:absolute;inset:0;padding:22px 48px 22px;display:flex;flex-direction:column;gap:0;font-family:var(--font)}
.mdb{color:var(--ink)}
.mdb p{margin:0}
.mdb-label{font:700 11px/1.2 var(--font);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-soft)}
.mdb-run{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;height:22px;border-bottom:1px solid var(--ink);flex:none;
  font:700 11px/1 var(--font);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-soft)}
.mdb-run-l{display:flex;gap:14px;align-items:flex-end;min-width:0}
.mdb-run-l b{color:var(--ink);position:relative;padding-bottom:6px}
.mdb-run-l b::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:3px;background:var(--sec)}
.mdb-run-l span,.mdb-run-r{padding-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:420px}
.mdb-run.is-dark{border-color:var(--on-dark-rule);color:var(--on-dark-muted)}
.mdb-title{margin:20px 0 0;font:400 40px/1.1 var(--font-display);letter-spacing:-.01em;color:var(--ink);text-wrap:balance;flex:none}
.mdb-folio{position:absolute;right:48px;bottom:18px;font:400 11px/1 var(--font);color:var(--ink-soft);font-variant-numeric:tabular-nums}
.mdb-key{font-weight:700;color:var(--key)}
.mdb-mark{display:block;width:56px;height:6px;background:var(--signal)}

/* Title: text left, full-height panel right */
.mdp[data-look=basalt] .mdp-card>div.mdb-l-title{flex-direction:row;padding:0}
.mdb-l-title .mdb-col{flex:1;display:flex;flex-direction:column;padding:120px 40px 30px 48px;min-width:0}
.mdb-kicker{padding-bottom:10px;border-bottom:1px solid var(--ink);color:var(--ink);align-self:stretch}
.mdb-hero{margin:22px 0 0;font:400 60px/1.02 var(--font-display);letter-spacing:-.02em;text-wrap:balance}
.mdb-sub{margin-top:14px !important;font:400 24px/1.25 var(--font);color:var(--work)}
.mdb-foot{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;gap:16px}
.mdb-logo{max-height:52px;max-width:180px;object-fit:contain}
.mdb-panel{flex:none;width:400px;height:100%;margin:0;position:relative;overflow:hidden;background:var(--bone)}
.mdb-panel img{width:100%;height:100%;object-fit:cover;display:block}
.mdb-contours{background:var(--dark)}
.mdb-contours svg{position:absolute;inset:0;width:100%;height:100%}
.mdb-contours ellipse{fill:none;stroke:var(--on-dark-muted);stroke-width:1;opacity:.35}
.mdb-contours .mdb-mark{position:absolute;left:40px;bottom:40px}

/* Statement: a dark divider with a giant light numeral */
.mdp[data-look=basalt] .mdp-card.mdp-lay-statement{background:var(--dark)}
.mdb-l-statement{color:var(--on-dark)}
.mdb-numeral{position:absolute;left:40px;bottom:-14px;font:400 220px/1 var(--font-display);letter-spacing:-.04em;color:var(--on-dark-num)}
.mdb-stmt{position:absolute;left:47%;right:48px;top:42%;transform:translateY(-50%);display:flex;flex-direction:column;gap:14px}
.mdb-stmt-t{margin:0;font:400 52px/1.06 var(--font-display);letter-spacing:-.015em;color:var(--on-dark);text-wrap:balance}
.mdb-stmt p{font:400 18px/1.4 var(--font);color:var(--on-dark-muted);max-width:420px}

/* List: a ruled, numbered list */
.mdb-rows{list-style:none;margin:22px 0 0;padding:0;border-top:1.5px solid var(--ink);display:flex;flex-direction:column;min-height:0;overflow:hidden}
.mdb-rows li{display:flex;gap:26px;align-items:baseline;padding:22px 0;border-bottom:1px solid var(--rule-line);font:400 27px/1.3 var(--font)}
.mdb-rn{flex:none;width:52px;font:400 38px/1 var(--font-display);color:var(--work);font-variant-numeric:tabular-nums}
.mdb-rows.is-dense li{font-size:22px;padding:14px 0}
.mdb-rows.is-dense .mdb-rn{font-size:30px;width:46px}
.mdb-rows.is-xdense li{font-size:17px;padding:8px 0;gap:18px}
.mdb-rows.is-xdense .mdb-rn{font-size:22px;width:34px}
.mdb-rows.is-compact li{font-size:18px;padding:10px 0}
.mdb-rows.is-compact .mdb-rn{font-size:24px;width:36px}

/* Big numbers: open stat columns */
.mdb-stats{flex:1;display:grid;gap:24px;align-content:center;margin-top:10px}
.mdb-stats.n1{grid-template-columns:1fr}.mdb-stats.n2{grid-template-columns:1fr 1fr}.mdb-stats.n3{grid-template-columns:repeat(3,1fr)}.mdb-stats.n4{grid-template-columns:repeat(4,1fr)}
.mdb-stat{border-top:2px solid var(--ink);padding-top:14px;display:flex;flex-direction:column;gap:12px;min-width:0}
.mdb-stat-v{font:400 76px/1 var(--font-display);letter-spacing:-.02em;white-space:nowrap;color:var(--ink)}
.mdb-stat:first-child .mdb-stat-v{color:var(--work)}
.mdb-stats.n1 .mdb-stat-v{font-size:150px}
.mdb-stats.n3 .mdb-stat-v{font-size:62px}.mdb-stats.n4 .mdb-stat-v{font-size:46px}
.mdb-stat-l{font:400 19px/1.35 var(--font);color:var(--ink-soft);border-top:1px solid var(--rule-line);padding-top:10px}
.mdb-stats.n1 .mdb-stat-l{font-size:24px;max-width:640px}
.mdb-stats.n4 .mdb-stat-l{font-size:15px}

/* Steps: a thin-bar track */
.mdb-track{flex:1;display:grid;margin:30px 0 26px;align-content:stretch}
.mdb-track.n2{grid-template-columns:repeat(2,1fr)}.mdb-track.n3{grid-template-columns:repeat(3,1fr)}.mdb-track.n4{grid-template-columns:repeat(4,1fr)}.mdb-track.n5{grid-template-columns:repeat(5,1fr)}
.mdb-phase{display:flex;flex-direction:column;gap:14px;padding:0 18px 20px 16px;border-left:1px solid var(--ink)}
.mdb-phase:last-child{border-right:1px solid var(--ink)}
.mdb-phase i{display:block;height:8px;background:var(--ph);margin-left:-16px;margin-right:-18px}
.mdb-phase-n{font:400 64px/1 var(--font-display);color:var(--ink);margin-top:10px !important}
.mdb-phase:first-child .mdb-phase-n{color:var(--work)}
.mdb-phase-t{font:400 22px/1.35 var(--font);color:var(--ink)}
.mdb-track.n4 .mdb-phase-t{font-size:19px}
.mdb-track.n5 .mdb-phase-t{font-size:17px}
.mdb-track.n5 .mdb-phase-n{font-size:50px}

/* Compare: square panels, heading on top, ruled lines at the foot */
.mdb-cols{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:22px;min-height:0}
.mdb-panel-col{display:flex;flex-direction:column;justify-content:space-between;padding:18px 20px 16px;min-height:0;overflow:hidden}
.mdb-panel-col.k0{background:var(--panel-1);color:var(--on-dark)}
.mdb-panel-col.k1{background:var(--panel-2);color:var(--on-dark)}
.mdb-panel-col h3{margin:0;font:400 26px/1.1 var(--font-display)}
.mdb-panel-col ul{list-style:none;margin:16px 0 0;padding:0;font:400 17px/1.3 var(--font)}
.mdb-panel-col li{padding:8px 0;border-top:1px solid var(--on-dark-rule)}
.mdb-panel-col .mdb-key{color:var(--on-dark-num)}

/* Quote: a pull quote with the one signal mark */
.mdb-quote{flex:1;display:flex;flex-direction:column;justify-content:center;gap:22px;max-width:760px;padding-bottom:20px}
.mdb-quote blockquote{margin:0;font:400 40px/1.18 var(--font-display);letter-spacing:-.01em;text-wrap:balance}
.mdb-quote blockquote.is-long{font-size:30px}

/* Photo: text left, picture panel right */
.mdp[data-look=basalt] .mdp-card>div.mdb-l-photo{flex-direction:row;padding:0}
.mdb-l-photo .mdb-col{flex:1;display:flex;flex-direction:column;padding:22px 32px 22px 48px;min-width:0;position:relative}
.mdb-l-photo .mdb-panel{width:46%}
.mdb-l-photo .mdb-folio{right:32px}
`;
