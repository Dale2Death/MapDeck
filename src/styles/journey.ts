import type { Deck } from "../core/types";
import {
  CARD_H, type CardPlace, type Layout, type StyleDef, cardRect, esc, overview, pointRect, sectionColor, slideStep,
  smoothPath, union,
} from "./util";

/**
 * Journey: slides are billboards along a winding road. A traveller walks
 * the road from stop to stop, and section changes get a signpost.
 */
export const journey: StyleDef = {
  id: "journey",
  name: "Journey",
  emoji: "🧭",
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

    let decor = "";
    // The road: a wide soft band with a dashed centre line.
    decor += `<path d="${path}" fill="none" style="stroke:var(--road)" stroke-width="150" stroke-linecap="round" stroke-linejoin="round"/>`;
    decor += `<path d="${path}" fill="none" style="stroke:var(--accent)" stroke-width="10" stroke-dasharray="46 40" stroke-linecap="round" opacity=".8"/>`;

    // Posts holding each billboard up, and a numbered milestone on the road.
    slides.forEach((s, i) => {
      const c = cards[s.id];
      const a = anchors[s.id];
      decor += `<line x1="${c.x}" y1="${c.y}" x2="${a.x}" y2="${a.y - 40}" style="stroke:var(--line)" stroke-width="16"/>`;
      decor += `<circle cx="${a.x}" cy="${a.y}" r="48" style="fill:var(--card);stroke:var(--accent)" stroke-width="10"/>`;
      decor += `<text x="${a.x}" y="${a.y + 15}" text-anchor="middle" font-size="42" font-weight="700" style="fill:var(--card-ink)">${i + 1}</text>`;
    });

    // Signposts where a new section begins.
    let overlay = "";
    let prev = "";
    let si = -1;
    slides.forEach((s, i) => {
      if (s.section === prev) return;
      prev = s.section;
      si++;
      const a = anchors[s.id];
      const label = esc(s.section.length > 26 ? s.section.slice(0, 25) + "…" : s.section);
      const w = Math.max(320, label.length * 30 + 80);
      const dir = Math.floor(i / perRow) % 2 === 0 ? 1 : -1;
      const x = a.x - (dir * STEP_X) / 2 - (dir < 0 ? w * 0.6 : 0);
      const y = a.y;
      overlay += `<g><line x1="${x}" y1="${y}" x2="${x}" y2="${y + 230}" style="stroke:var(--line)" stroke-width="14"/>`;
      overlay += `<path d="M${x - 20},${y + 200} h${w} l50,55 l-50,55 h-${w} z" style="fill:${sectionColor(si)}"/>`;
      overlay += `<text x="${x + 10}" y="${y + 272}" font-size="50" font-weight="700" style="fill:var(--on-accent)">${label}</text></g>`;
    });
    overlay += flag(start.x, start.y, "Start");
    overlay += flag(end.x, end.y, "Finish");

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

function flag(x: number, y: number, text: string): string {
  return `<g><line x1="${x}" y1="${y}" x2="${x}" y2="${y - 300}" style="stroke:var(--ink)" stroke-width="12"/>` +
    `<path d="M${x},${y - 300} h220 l-50,60 l50,60 h-220 z" style="fill:var(--accent)"/>` +
    `<text x="${x + 20}" y="${y - 222}" font-size="46" font-weight="800" style="fill:var(--on-accent)">${text}</text></g>`;
}
