import type { Deck } from "../core/types";
import {
  type CardPlace, type Layout, type Step, type StyleDef, overview, sectionColor, slideStep, svgText, union, wrap,
} from "./util";
import { hashSeed, ink } from "../design/sketch";

/**
 * Game board: slides are squares on a snaking board game track. A pawn hops
 * from square to square; sections colour the squares.
 */
export const gameboard: StyleDef = {
  id: "gameboard",
  name: "Game board",
  emoji: "🎲",
  icon: "dice-5",
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
    // Board base: a thick inked edge on slightly darker card.
    decor += ink.rect(bx - 120, by - TITLE_H, boardW + 240, boardH + TITLE_H + 120, { seed: 1, width: 10, roughness: 1.2, stroke: "var(--ink)", fill: "var(--paper-2)", fillStyle: "solid" });
    decor += ink.rect(bx - 80, by - TITLE_H + 40, boardW + 160, boardH + TITLE_H + 40, { seed: 2, width: 3, roughness: 1.4, stroke: "var(--ink-soft)", single: true });
    // Squares, coloured in like a pencilled board game.
    deck.slides.forEach((s, i) => {
      const c = centres[i];
      const color = sectionColor(sectionIndex.get(s.section) ?? 0);
      decor += ink.rect(c.x - TW / 2 + 34, c.y - TH / 2 + 34, TW - 68, TH - 68, { seed: hashSeed(s.id), width: 5, roughness: 1.3, stroke: "var(--ink)", fill: color, fillStyle: "hachure", hachureGap: 16, fillWeight: 6, hachureAngle: -41 + (i % 2) * 82 });
    });

    let overlay = "";
    deck.slides.forEach((s, i) => {
      const c = centres[i];
      const label = i === 0 ? "START" : i === n - 1 ? "FINISH" : String(i + 1);
      const w = label.length > 2 ? 250 : 120;
      const lx = c.x + TW / 2 - 60 - w;
      const ly = c.y + TH / 2 - 150;
      overlay += ink.rect(lx, ly, w, 88, { seed: i + 30, width: 4, stroke: "var(--ink)", fill: "var(--paper-2)", fillStyle: "solid" });
      overlay += `<text x="${lx + w / 2}" y="${ly + 62}" text-anchor="middle" font-size="54" font-weight="700">${label}</text>`;
      const next = centres[i + 1];
      if (next) {
        const dx = Math.sign(next.x - c.x);
        const dy = Math.sign(next.y - c.y);
        const ax = c.x + dx * (TW / 2);
        const ay = c.y + dy * (TH / 2);
        const rot = dx > 0 ? 0 : dx < 0 ? 180 : 90;
        overlay += `<g transform="translate(${ax},${ay}) rotate(${rot})">${ink.circle(0, 0, 130, { seed: i + 60, width: 4, stroke: "var(--ink)", fill: "var(--paper-2)", fillStyle: "solid" })}${ink.path("M-24,0 L26,0 M6,-22 L28,0 L6,22", { seed: i + 90, width: 7, stroke: "var(--ink)", single: true })}</g>`;
      }
    });
    const titleLines = wrap(deck.title, Math.max(18, cols * 9), 2);
    overlay += svgText(titleLines, bx + boardW / 2, by - TITLE_H + 210 - (titleLines.length - 1) * 60, titleLines.length > 1 ? 130 : 170, `text-anchor="middle" class="lbl-display"`);
    overlay += die(bx + 120, by - TITLE_H + 170, 5, -12);
    overlay += die(bx + boardW - 120, by - TITLE_H + 170, 3, 14);

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
  const dots = (pips[face] ?? [[0, 0]]).map(([px, py]) => `<circle cx="${px * 34}" cy="${py * 34}" r="13" style="fill:var(--ink)"/>`).join("");
  return `<g transform="translate(${x},${y}) rotate(${rot})">${ink.rect(-70, -70, 140, 140, { seed: face, width: 5, stroke: "var(--ink)", fill: "var(--paper-2)", fillStyle: "solid" })}${dots}</g>`;
}
