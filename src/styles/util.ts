import type { Deck, StyleId } from "../core/types";

export const CARD_W = 960;
export const CARD_H = 540;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where a slide card sits in the world. x/y is the card centre. */
export interface CardPlace {
  x: number;
  y: number;
  w: number;
  rotate?: number;
}

export interface Step {
  kind: "overview" | "section" | "slide";
  rect: Rect;
  slideId?: string;
  label?: string;
}

export interface Layout {
  cards: Record<string, CardPlace>;
  /** SVG markup in world coordinates, drawn behind the cards. */
  decor: string;
  /** SVG markup drawn above the cards (labels that must stay visible). */
  overlay?: string;
  steps: Step[];
  bounds: Rect;
  /** Where the token (traveller, pawn) stands for each slide. */
  anchors?: Record<string, { x: number; y: number }>;
  token?: "traveller" | "pawn";
}

export interface StyleDef {
  id: StyleId;
  name: string;
  emoji: string;
  tagline: string;
  layout(deck: Deck): Layout;
}

export function cardRect(c: CardPlace, pad = 1): Rect {
  const w = c.w * pad;
  const h = (c.w * CARD_H) / CARD_W * pad;
  return { x: c.x - w / 2, y: c.y - h / 2, w, h };
}

export function union(rects: Rect[], pad = 0): Rect {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of rects) {
    x0 = Math.min(x0, r.x);
    y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w);
    y1 = Math.max(y1, r.y + r.h);
  }
  if (!isFinite(x0)) return { x: -CARD_W / 2, y: -CARD_H / 2, w: CARD_W, h: CARD_H };
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
}

export function pointRect(x: number, y: number): Rect {
  return { x, y, w: 0, h: 0 };
}

/** A focus step for one slide: the card plus a little breathing room. */
export function slideStep(id: string, c: CardPlace, extra: Rect[] = []): Step {
  return { kind: "slide", slideId: id, rect: union([cardRect(c, 1.32), ...extra]) };
}

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Deterministic random numbers, so a deck always lays out the same way. */
export function rng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth path through points (Catmull-Rom converted to cubic Béziers). */
export function smoothPath(pts: { x: number; y: number }[], tension = 0.5): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const k = tension / 3;
    const c1 = { x: p1.x + (p2.x - p0.x) * k, y: p1.y + (p2.y - p0.y) * k };
    const c2 = { x: p2.x - (p3.x - p1.x) * k, y: p2.y - (p3.y - p1.y) * k };
    d += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

/** Section colours cycle through the theme's accent palette. */
export function sectionColor(i: number): string {
  return `var(--c${i % 5})`;
}

export function overview(bounds: Rect, label = "Overview"): Step {
  return { kind: "overview", rect: bounds, label };
}

/** Wrap a long label into lines for SVG text. */
export function wrap(text: string, maxChars: number, maxLines = 3): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] += "…";
    return kept;
  }
  return lines;
}

export function svgText(
  lines: string[],
  x: number,
  y: number,
  size: number,
  attrs = "",
): string {
  const tspans = lines
    .map((l, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : size * 1.15}">${esc(l)}</tspan>`)
    .join("");
  return `<text x="${x}" y="${y}" font-size="${size}" ${attrs}>${tspans}</text>`;
}
