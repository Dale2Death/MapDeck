import { sectionsOf } from "../core/deck";
import type { Deck } from "../core/types";
import {
  CARD_H, type CardPlace, type Layout, type Rect, type Step, type StyleDef, overview, sectionColor,
  slideStep, union, wrap, svgText,
} from "./util";

/**
 * Zoom in / zoom out: one big canvas. Each section is a frame holding its
 * slides. The camera dives from the whole picture into a section, then into
 * each slide, and pulls back out between sections.
 */
export const zoom: StyleDef = {
  id: "zoom",
  name: "Zoom in / out",
  emoji: "🔭",
  tagline: "Big picture first, then dive into the details",
  layout(deck: Deck): Layout {
    const groups = sectionsOf(deck.slides);
    const GAP = 140;
    const PAD = 170;
    const HEAD = 300;
    const W = 960;

    // Size each section frame from its slide grid.
    const frames = groups.map((g) => {
      const n = g.slides.length;
      const cols = n <= 2 ? n : n <= 4 ? 2 : 3;
      const rows = Math.ceil(n / cols);
      return {
        g,
        cols,
        w: cols * W + (cols - 1) * GAP + PAD * 2,
        h: rows * CARD_H + (rows - 1) * GAP + PAD + HEAD,
      };
    });

    // Lay frames out in rows, centred.
    const perRow = Math.max(1, Math.ceil(Math.sqrt(frames.length)));
    const FRAME_GAP = 380;
    const rows: (typeof frames)[] = [];
    for (let i = 0; i < frames.length; i += perRow) rows.push(frames.slice(i, i + perRow));
    const rowWidths = rows.map((r) => r.reduce((a, f) => a + f.w, 0) + (r.length - 1) * FRAME_GAP);
    const maxW = Math.max(...rowWidths, W);

    const cards: Record<string, CardPlace> = {};
    const frameRects: { rect: Rect; name: string }[] = [];
    let y = 0;
    rows.forEach((row, ri) => {
      const rowH = Math.max(...row.map((f) => f.h));
      let x = -rowWidths[ri] / 2;
      for (const f of row) {
        const top = y + (rowH - f.h) / 2;
        const rect = { x, y: top, w: f.w, h: f.h };
        frameRects.push({ rect, name: f.g.name });
        f.g.slides.forEach((s, i) => {
          const c = i % f.cols;
          const r = Math.floor(i / f.cols);
          // Centre a short last row.
          const inRow = Math.min(f.cols, f.g.slides.length - r * f.cols);
          const offset = ((f.cols - inRow) * (W + GAP)) / 2;
          cards[s.id] = {
            x: x + PAD + offset + c * (W + GAP) + W / 2,
            y: top + HEAD + r * (CARD_H + GAP) + CARD_H / 2,
            w: W,
          };
        });
        x += f.w + FRAME_GAP;
      }
      y += rowH + FRAME_GAP;
    });

    // Big title above everything.
    const titleSize = Math.max(140, Math.min(320, maxW / 14));
    const titleLines = wrap(deck.title, 28, 2);
    const titleY = -titleSize * (titleLines.length - 1) * 1.15 - 160;

    let decor = "";
    frameRects.forEach(({ rect, name }, i) => {
      decor += `<rect x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}" rx="60" style="fill:var(--frame);stroke:${sectionColor(i)}" stroke-width="14"/>`;
      decor += `<circle cx="${rect.x + 110}" cy="${rect.y + 140}" r="48" style="fill:${sectionColor(i)}"/>`;
      decor += `<text x="${rect.x + 110}" y="${rect.y + 158}" text-anchor="middle" font-size="52" font-weight="800" style="fill:var(--on-accent)">${i + 1}</text>`;
      decor += svgText(wrap(name, Math.max(18, Math.floor(rect.w / 50)), 1), rect.x + 190, rect.y + 165, 84, `font-weight="800" style="fill:var(--ink)"`);
    });
    const overlay = svgText(titleLines, 0, titleY, titleSize, `text-anchor="middle" font-weight="900" style="fill:var(--ink)" letter-spacing="-4"`);

    const all = union([...frameRects.map((f) => f.rect), { x: -maxW / 2, y: titleY - titleSize, w: maxW, h: titleSize }], 260);
    const steps: Step[] = [overview(all, deck.title)];
    groups.forEach((g, i) => {
      if (groups.length > 1) steps.push({ kind: "section", rect: union([frameRects[i].rect], 80), label: g.name });
      for (const s of g.slides) steps.push(slideStep(s.id, cards[s.id]));
    });
    steps.push(overview(all, deck.title));
    return { cards, decor, overlay, steps, bounds: all };
  },
};

