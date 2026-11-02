import type { Deck } from "../core/types";
import {
  type CardPlace, type Layout, type Step, type StyleDef, overview, sectionColor, slideStep, svgText, union, wrap,
} from "./util";

/**
 * Game board: slides are squares on a snaking board game track. A pawn hops
 * from square to square; sections colour the squares.
 */
export const gameboard: StyleDef = {
  id: "gameboard",
  name: "Game board",
  emoji: "🎲",
  tagline: "Roll the dice and hop square to square",
  layout(deck: Deck): Layout {
    const n = Math.max(1, deck.slides.length);
    const cols = Math.max(2, Math.min(5, Math.ceil(Math.sqrt(n * 1.7))));
    const TW = 1240;
    const TH = 900;
    const cards: Record<string, CardPlace> = {};
    const anchors: Record<string, { x: number; y: number }> = {};
    const centres: { x: number; y: number }[] = [];
    const sectionIndex = new Map<string, number>();

    deck.slides.forEach((s, i) => {
      const row = Math.floor(i / cols);
      const col = row % 2 === 0 ? i % cols : cols - 1 - (i % cols);
      const x = col * TW;
      const y = row * TH;
      cards[s.id] = { x, y: y - 30, w: 960 };
      anchors[s.id] = { x: x - TW / 2 + 110, y: y + TH / 2 - 110 };
      centres.push({ x, y });
      if (!sectionIndex.has(s.section)) sectionIndex.set(s.section, sectionIndex.size);
    });

    const rows = Math.ceil(n / cols);
    const boardW = cols * TW;
    const boardH = rows * TH;
    const bx = -TW / 2;
    const by = -TH / 2;
    const TITLE_H = 420;

    let decor = "";
    // Board base.
    decor += `<rect x="${bx - 120}" y="${by - TITLE_H}" width="${boardW + 240}" height="${boardH + TITLE_H + 120}" rx="90" style="fill:var(--board);stroke:var(--ink)" stroke-width="22"/>`;
    // Track linking the squares.
    if (centres.length > 1) {
      decor += `<polyline points="${centres.map((c) => `${c.x},${c.y}`).join(" ")}" fill="none" style="stroke:var(--ink)" stroke-width="60" stroke-linejoin="round" stroke-linecap="round" opacity=".18"/>`;
    }
    // Squares.
    deck.slides.forEach((s, i) => {
      const c = centres[i];
      const color = sectionColor(sectionIndex.get(s.section) ?? 0);
      decor += `<rect x="${c.x - TW / 2 + 30}" y="${c.y - TH / 2 + 30}" width="${TW - 60}" height="${TH - 60}" rx="46" style="fill:${color}" opacity=".9"/>`;
      decor += `<rect x="${c.x - TW / 2 + 52}" y="${c.y - TH / 2 + 52}" width="${TW - 104}" height="${TH - 104}" rx="32" fill="none" style="stroke:var(--on-accent)" stroke-width="6" stroke-dasharray="20 18" opacity=".55"/>`;
    });

    let overlay = "";
    deck.slides.forEach((s, i) => {
      const c = centres[i];
      const label = i === 0 ? "START" : i === n - 1 ? "FINISH" : String(i + 1);
      const w = label.length > 2 ? 250 : 120;
      overlay += `<rect x="${c.x + TW / 2 - 50 - w}" y="${c.y + TH / 2 - 150}" width="${w}" height="90" rx="45" style="fill:var(--ink)"/>`;
      overlay += `<text x="${c.x + TW / 2 - 50 - w / 2}" y="${c.y + TH / 2 - 88}" text-anchor="middle" font-size="52" font-weight="900" style="fill:var(--bg)">${label}</text>`;
      // Direction arrow toward the next square.
      const next = centres[i + 1];
      if (next) {
        const dx = Math.sign(next.x - c.x);
        const dy = Math.sign(next.y - c.y);
        const ax = c.x + dx * (TW / 2);
        const ay = c.y + dy * (TH / 2);
        const rot = dx > 0 ? 0 : dx < 0 ? 180 : 90;
        overlay += `<g transform="translate(${ax},${ay}) rotate(${rot})"><circle r="70" style="fill:var(--ink)"/><path d="M-22,-32 L30,0 L-22,32 z" style="fill:var(--bg)"/></g>`;
      }
    });
    const titleLines = wrap(deck.title, Math.max(18, cols * 9), 2);
    overlay += svgText(titleLines, bx + boardW / 2, by - TITLE_H + 190 - (titleLines.length - 1) * 60, titleLines.length > 1 ? 120 : 160, `text-anchor="middle" font-weight="900" style="fill:var(--ink)"`);
    // A couple of dice for decoration.
    overlay += die(bx + 120, by - TITLE_H + 150, 5, -12);
    overlay += die(bx + boardW - 120, by - TITLE_H + 150, 3, 14);

    const bounds = union([{ x: bx - 120, y: by - TITLE_H, w: boardW + 240, h: boardH + TITLE_H + 120 }], 120);
    const steps: Step[] = [overview(bounds, "The board")];
    deck.slides.forEach((s, i) => {
      const c = centres[i];
      steps.push({ ...slideStep(s.id, cards[s.id]), rect: { x: c.x - TW / 2 - 20, y: c.y - TH / 2 - 20, w: TW + 40, h: TH + 40 } });
    });
    steps.push(overview(bounds, "The board"));
    return { cards, decor, overlay, steps, bounds, anchors, token: "pawn" };
  },
};

function die(x: number, y: number, face: number, rot: number): string {
  const pips: Record<number, [number, number][]> = {
    3: [[-1, -1], [0, 0], [1, 1]],
    5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  };
  const dots = (pips[face] ?? [[0, 0]])
    .map(([px, py]) => `<circle cx="${px * 34}" cy="${py * 34}" r="13" style="fill:var(--card-ink)"/>`)
    .join("");
  return `<g transform="translate(${x},${y}) rotate(${rot})"><rect x="-70" y="-70" width="140" height="140" rx="26" style="fill:var(--card);stroke:var(--card-ink)" stroke-width="8"/>${dots}</g>`;
}

