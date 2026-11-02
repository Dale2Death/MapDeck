import { sectionsOf } from "../core/deck";
import type { Deck } from "../core/types";
import {
  type CardPlace, type Layout, type Rect, type Step, type StyleDef, cardRect, overview, rng, sectionColor, slideStep,
  svgText, union, wrap,
} from "./util";
import { hashSeed, ink, wash } from "../design/sketch";

function starPoints(cx: number, cy: number, R: number, r: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
  }
  return pts;
}

/**
 * Constellation: each section is a constellation in a night sky and each
 * slide is a star in it. Lines trace the order you'll visit them.
 */
export const constellation: StyleDef = {
  id: "constellation",
  name: "Constellation",
  emoji: "✨",
  icon: "stars",
  tagline: "Ideas as stars, sections as constellations",
  layout(deck: Deck): Layout {
    const rand = rng(deck.title + deck.slides.length);
    const groups = sectionsOf(deck.slides);
    const cards: Record<string, CardPlace> = {};
    const W = 760;
    const regions: { name: string; rect: Rect; ids: string[]; labelAt: { x: number; y: number } }[] = [];

    let cursor = 0;
    groups.forEach((g, gi) => {
      const baseY = Math.sin(gi * 1.3) * 900;
      const pts: { x: number; y: number }[] = [];
      g.slides.forEach((s, j) => {
        // Zig-zag through the region with some jitter, never overlapping.
        const x = cursor + j * 1000 + (rand() - 0.5) * 160;
        const y = baseY + (j % 2 ? 1 : -1) * (360 + rand() * 260) * (g.slides.length > 1 ? 1 : 0);
        cards[s.id] = { x, y, w: W, rotate: (rand() - 0.5) * 4 };
        pts.push({ x, y });
      });
      const rect = union(g.slides.map((s) => cardRect(cards[s.id])), 160);
      regions.push({ name: g.name, rect, ids: g.slides.map((s) => s.id), labelAt: { x: rect.x + rect.w / 2, y: rect.y - 60 } });
      cursor += g.slides.length * 1000 + 900;
    });

    const bounds = union([...regions.map((r) => r.rect), ...regions.map((r) => ({ x: r.labelAt.x - 10, y: r.labelAt.y - 200, w: 20, h: 20 }))], 500);

    // A star chart: faint graticule arcs, scattered stars, then the constellations.
    let decor = "";
    const cx0 = bounds.x + bounds.w / 2;
    const cy0 = bounds.y + bounds.h * 1.6;
    for (let k = 1; k <= 5; k++) {
      const r = bounds.h * 0.6 + k * bounds.h * 0.28;
      decor += ink.ellipse(cx0, cy0, r * 2.2, r * 2, { seed: 700 + k, width: 2.5, roughness: 0.9, stroke: "var(--rule)", single: true });
    }
    const starCount = Math.min(520, Math.round((bounds.w * bounds.h) / 110000));
    for (let i = 0; i < starCount; i++) {
      const x = bounds.x + rand() * bounds.w;
      const y = bounds.y + rand() * bounds.h;
      const big = rand() < 0.07;
      if (big) {
        const r = 14 + rand() * 8;
        decor += `<path d="M${(x - r).toFixed(0)},${y.toFixed(0)} L${(x + r).toFixed(0)},${y.toFixed(0)} M${x.toFixed(0)},${(y - r).toFixed(0)} L${x.toFixed(0)},${(y + r).toFixed(0)}" style="stroke:var(--ink-soft)" stroke-width="3" stroke-linecap="round" class="mdp-twinkle"/>`;
      } else {
        decor += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(2 + rand() * 4).toFixed(1)}" style="fill:var(--ink-soft)" opacity=".7"/>`;
      }
    }
    // Faint dotted thread from one constellation to the next.
    for (let i = 0; i < regions.length - 1; i++) {
      const a = cards[regions[i].ids[regions[i].ids.length - 1]];
      const b = cards[regions[i + 1].ids[0]];
      decor += ink.line(a.x, a.y, b.x, b.y, { seed: 800 + i, width: 3, stroke: "var(--ink-soft)", dash: "2 26", single: true });
    }
    regions.forEach((r, i) => {
      decor += wash(r.rect.x + r.rect.w / 2, r.rect.y + r.rect.h / 2, r.rect.w * 0.55, r.rect.h * 0.6, sectionColor(i), hashSeed(r.name + i), 0.7);
      const pts = r.ids.map((id) => cards[id]);
      if (pts.length > 1) decor += ink.polyline(pts.map((p) => [p.x, p.y] as [number, number]), { seed: 900 + i, width: 7, roughness: 1.2, stroke: sectionColor(i) });
    });

    let overlay = "";
    regions.forEach((r, i) => {
      // A bright hand-drawn star at the top corner of each slide.
      for (const id of r.ids) {
        const c = cards[id];
        const sx = c.x - (c.w / 2) + 10;
        const sy = c.y - (c.w * 0.5625) / 2 + 10;
        overlay += ink.polygon(starPoints(sx, sy, 46, 20), { seed: hashSeed(id), width: 3.5, stroke: "var(--ink)", fill: sectionColor(i), fillStyle: "solid" });
      }
      if (groups.length < 2) return;
      overlay += svgText(wrap(r.name.toUpperCase(), 30, 1), r.labelAt.x, r.labelAt.y, 80, `text-anchor="middle" class="lbl-mono" font-weight="500"`);
    });

    const steps: Step[] = [overview(bounds, "The night sky")];
    regions.forEach((r) => {
      if (groups.length > 1 && r.ids.length > 1) steps.push({ kind: "section", rect: union([r.rect, { x: r.labelAt.x, y: r.labelAt.y - 120, w: 1, h: 1 }], 60), label: r.name });
      for (const id of r.ids) steps.push(slideStep(id, cards[id]));
    });
    steps.push(overview(bounds, "The night sky"));
    return { cards, decor, overlay, steps, bounds };
  },
};
