import type { Deck } from "../core/types";
import {
  CARD_H, type CardPlace, type Layout, type StyleDef, cardRect, esc, overview, pointRect, sectionColor, slideStep,
  rng, smoothPath, union,
} from "./util";
import { hashSeed, ink, inkMode, wash } from "../design/sketch";

/**
 * Journey: slides are billboards along a winding road. A traveller walks
 * the road from stop to stop, and section changes get a signpost.
 */
export const journey: StyleDef = {
  id: "journey",
  name: "Journey",
  emoji: "🧭",
  icon: "route",
  tagline: "A winding road from start to finish",
  layout(deck: Deck): Layout {
    const STEP_X = 1400;
    const ROAD_DROP = CARD_H / 2 + 170;
    const cards: Record<string, CardPlace> = {};
    const anchors: Record<string, { x: number; y: number }> = {};
    const road: { x: number; y: number }[] = [];
    const slides = deck.slides;

    // A switchback road: a few stops per row, turning back at each end.
    const perRow = Math.max(3, Math.min(6, Math.ceil(Math.sqrt(slides.length * 1.6))));
    const ROW_H = 1650;
    const turns: { after: number; x: number; y: number }[] = [];
    slides.forEach((s, i) => {
      const row = Math.floor(i / perRow);
      const col = row % 2 === 0 ? i % perRow : perRow - 1 - (i % perRow);
      const x = col * STEP_X;
      const y = row * ROW_H + Math.sin(i * 1.7) * 170;
      cards[s.id] = { x, y, w: 960, rotate: [-2, 1.5, -1, 2][i % 4] };
      anchors[s.id] = { x, y: y + ROAD_DROP };
      road.push({ x, y: y + ROAD_DROP });
      if (i % perRow === perRow - 1 && i < slides.length - 1) {
        const side = row % 2 === 0 ? 1 : -1;
        turns.push({ after: road.length - 1, x: x + side * STEP_X * 0.75, y: y + ROAD_DROP + ROW_H / 2 });
      }
    });
    // Insert the turn points into the road so it loops around row ends.
    for (const t of [...turns].reverse()) road.splice(t.after + 1, 0, { x: t.x, y: t.y });
    const first = road[0] ?? { x: 0, y: ROAD_DROP };
    const last = road[road.length - 1] ?? first;
    const start = { x: first.x - STEP_X * 0.8, y: first.y + 120 };
    const lastRowOdd = Math.floor((slides.length - 1) / perRow) % 2 === 1;
    const end = { x: last.x + (lastRowOdd ? -1 : 1) * STEP_X * 0.8, y: last.y - 120 };
    const path = smoothPath([start, ...road, end]);

    const rand = rng(deck.title + slides.length);
    let decor = "";
    // Regions: a soft watercolour wash behind each section's stretch of road.
    let si = -1;
    let prevSec = "";
    slides.forEach((s) => {
      const c = cards[s.id];
      if (s.section !== prevSec) {
        prevSec = s.section;
        si++;
      }
      decor += wash(c.x, c.y + 120, 760, 520, sectionColor(si), hashSeed(s.id), 0.9);
    });
    // A few hills and trees off the road, like a hand-drawn map.
    for (let k = 0; k < slides.length && inkMode() === "rough"; k++) {
      const a = road[Math.min(road.length - 1, k)];
      if (!a) break;
      const x = a.x + STEP_X / 2 + (rand() - 0.5) * 200;
      const y = a.y + 230 + rand() * 120;
      decor += rand() < 0.5 ? hills(x, y, hashSeed(`h${k}`)) : trees(x, y, hashSeed(`t${k}`));
    }
    // The trail: a faint band with a hand-inked dashed line on top.
    decor += `<path d="${path}" fill="none" style="stroke:var(--rule)" stroke-width="120" stroke-linecap="round" stroke-linejoin="round"/>`;
    decor += ink.path(path, { seed: 11, width: 7, roughness: 1.2, bowing: 0.6, stroke: "var(--ink)", dash: "38 30", single: true });

    // Posts holding each sign up, and a numbered milestone on the trail.
    slides.forEach((s, i) => {
      const c = cards[s.id];
      const a = anchors[s.id];
      decor += ink.line(c.x, c.y + 260, a.x, a.y - 40, { seed: i + 20, width: 9, roughness: 0.8, stroke: "var(--ink)", single: true });
      decor += ink.circle(a.x, a.y, 100, { seed: i + 40, width: 5, stroke: "var(--ink)", fill: "var(--paper-2)", fillStyle: "solid" });
      decor += `<text x="${a.x}" y="${a.y + 16}" text-anchor="middle" font-size="46" font-weight="700">${i + 1}</text>`;
    });

    // Signposts where a new section begins.
    let overlay = "";
    let prev = "";
    si = -1;
    slides.forEach((s, i) => {
      if (s.section === prev) return;
      prev = s.section;
      si++;
      const a = anchors[s.id];
      const label = esc(s.section.length > 26 ? s.section.slice(0, 25) + "…" : s.section);
      const w = Math.max(320, label.length * 30 + 90);
      const dir = Math.floor(i / perRow) % 2 === 0 ? 1 : -1;
      const x = a.x - (dir * STEP_X) / 2 - (dir < 0 ? w * 0.6 : 0);
      const y = a.y;
      const seed = hashSeed(s.section + i);
      overlay += ink.line(x, y, x, y + 330, { seed, width: 10, stroke: "var(--ink)", single: true });
      overlay += ink.polygon([[x - 20, y + 200], [x + w, y + 200], [x + w + 50, y + 255], [x + w, y + 310], [x - 20, y + 310]], { seed: seed + 1, width: 4, stroke: "var(--ink)", fill: sectionColor(si), fillStyle: "hachure", hachureGap: 10, fillWeight: 5 });
      overlay += `<text x="${x + 10}" y="${y + 272}" font-size="52" font-weight="700">${label}</text>`;
    });
    overlay += flag(start.x, start.y, "Start", 1);
    overlay += flag(end.x, end.y, "Finish", 2);

    const bounds = union([
      ...Object.values(cards).map((c) => cardRect(c)),
      pointRect(start.x - 200, start.y - 600),
      pointRect(end.x + 300, end.y + 200),
      ...road.map((p) => pointRect(p.x, p.y + 120)),
    ], 200);

    const steps = [overview(bounds, "The route")];
    for (const s of slides) {
      const a = anchors[s.id];
      steps.push(slideStep(s.id, cards[s.id], [pointRect(a.x, a.y + 90)]));
    }
    steps.push(overview(bounds, "Journey's end"));
    return { cards, decor, overlay, steps, bounds, anchors, token: "traveller" };
  },
};

function flag(x: number, y: number, text: string, seed: number): string {
  return ink.line(x, y, x, y - 320, { seed, width: 9, stroke: "var(--ink)", single: true }) +
    ink.polygon([[x, y - 320], [x + 240, y - 300], [x + 200, y - 255], [x + 236, y - 205], [x, y - 200]], { seed: seed + 3, width: 4, stroke: "var(--ink)", fill: "var(--accent)", fillStyle: "hachure", hachureGap: 9, fillWeight: 5 }) +
    `<text x="${x + 22}" y="${y - 240}" font-size="48" font-weight="700">${text}</text>`;
}

function hills(x: number, y: number, seed: number): string {
  return ink.path(`M${x - 120},${y} Q${x - 70},${y - 90} ${x - 20},${y} M${x - 50},${y} Q${x + 20},${y - 130} ${x + 90},${y} M${x + 60},${y} Q${x + 100},${y - 60} ${x + 140},${y}`, { seed, width: 4, stroke: "var(--ink-soft)", single: true });
}

function trees(x: number, y: number, seed: number): string {
  let out = "";
  for (let i = 0; i < 3; i++) {
    const tx = x + i * 60 - 60;
    const h = 90 + ((seed >> i) % 40);
    out += ink.path(`M${tx},${y} L${tx},${y - h * 0.35} M${tx - 32},${y - h * 0.35} L${tx},${y - h} L${tx + 32},${y - h * 0.35} Z`, { seed: seed + i, width: 3.5, stroke: "var(--ink-soft)", single: true });
  }
  return out;
}
