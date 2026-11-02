import { sectionsOf } from "../core/deck";
import type { Deck } from "../core/types";
import {
  type CardPlace, type Layout, type Rect, type Step, type StyleDef, cardRect, overview, rng, sectionColor, slideStep,
  svgText, union, wrap,
} from "./util";

/**
 * Constellation: each section is a constellation in a night sky and each
 * slide is a star in it. Lines trace the order you'll visit them.
 */
export const constellation: StyleDef = {
  id: "constellation",
  name: "Constellation",
  emoji: "✨",
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

    // Background stars.
    let decor = "";
    const starCount = Math.min(700, Math.round((bounds.w * bounds.h) / 90000));
    for (let i = 0; i < starCount; i++) {
      const x = bounds.x + rand() * bounds.w;
      const y = bounds.y + rand() * bounds.h;
      const r = rand() < 0.08 ? 9 + rand() * 6 : 2 + rand() * 4;
      decor += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" class="md-twinkle" style="fill:var(--star);animation-delay:${(rand() * 4).toFixed(2)}s"/>`;
    }
    // Faint thread from one constellation to the next.
    for (let i = 0; i < regions.length - 1; i++) {
      const a = cards[regions[i].ids[regions[i].ids.length - 1]];
      const b = cards[regions[i + 1].ids[0]];
      decor += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" style="stroke:var(--star)" stroke-width="4" stroke-dasharray="2 30" stroke-linecap="round" opacity=".5"/>`;
    }
    // Constellation lines and bright stars at each slide.
    regions.forEach((r, i) => {
      const pts = r.ids.map((id) => cards[id]);
      decor += `<polyline points="${pts.map((p) => `${p.x},${p.y}`).join(" ")}" fill="none" style="stroke:${sectionColor(i)}" stroke-width="10" opacity=".85"/>`;
      for (const p of pts) {
        decor += `<circle cx="${p.x}" cy="${p.y}" r="520" style="fill:url(#md-glow-${i % 5})"/>`;
      }
    });
    let defs = "<defs>";
    for (let i = 0; i < 5; i++) {
      defs += `<radialGradient id="md-glow-${i}"><stop offset="0" style="stop-color:var(--c${i})" stop-opacity=".45"/><stop offset="1" style="stop-color:var(--c${i})" stop-opacity="0"/></radialGradient>`;
    }
    defs += "</defs>";
    decor = defs + decor;

    let overlay = "";
    regions.forEach((r, i) => {
      if (groups.length < 2) return;
      overlay += svgText(wrap(r.name.toUpperCase(), 30, 1), r.labelAt.x, r.labelAt.y, 90, `text-anchor="middle" font-weight="700" letter-spacing="12" style="fill:${sectionColor(i)}"`);
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
