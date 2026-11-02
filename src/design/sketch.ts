import rough from "roughjs";
import type { Options } from "roughjs/bin/core";

/**
 * Hand-inked drawing helpers. Everything returns SVG markup strings whose
 * colours are CSS variables, so the same drawing works on light and dark paper.
 */

const gen = rough.generator();

export interface InkOptions {
  seed?: number;
  /** CSS colour for the line, e.g. "var(--ink)". */
  stroke?: string;
  width?: number;
  roughness?: number;
  bowing?: number;
  /** CSS colour for a fill. */
  fill?: string;
  fillStyle?: "hachure" | "solid" | "zigzag" | "cross-hatch" | "dots";
  hachureGap?: number;
  hachureAngle?: number;
  fillWeight?: number;
  dash?: string;
  opacity?: number;
  /** Draw each line once instead of twice (cleaner). */
  single?: boolean;
  className?: string;
}

const S = "#000001";
const F = "#000002";

function toMarkup(drawable: ReturnType<typeof gen.path>, o: InkOptions): string {
  const paths = gen.toPaths(drawable);
  const cls = o.className ? ` class="${o.className}"` : "";
  const op = o.opacity !== undefined ? ` opacity="${o.opacity}"` : "";
  let out = "";
  for (const p of paths) {
    const strokeColor = p.stroke === F ? o.fill : p.stroke === S ? o.stroke ?? "var(--ink)" : undefined;
    const fillColor = p.fill === F ? o.fill : undefined;
    const style = [
      strokeColor && p.stroke !== "none" ? `stroke:${strokeColor}` : "stroke:none",
      fillColor ? `fill:${fillColor}` : "fill:none",
    ].join(";");
    const dash = o.dash && p.stroke === S ? ` stroke-dasharray="${o.dash}"` : "";
    out += `<path d="${p.d}" style="${style}" stroke-width="${p.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${dash}/>`;
  }
  return `<g${cls}${op}>${out}</g>`;
}

function opts(o: InkOptions): Options {
  return {
    seed: o.seed ?? 1,
    stroke: S,
    strokeWidth: o.width ?? 2,
    roughness: o.roughness ?? 1,
    bowing: o.bowing ?? 1,
    fill: o.fill ? F : undefined,
    fillStyle: o.fillStyle ?? "hachure",
    hachureGap: o.hachureGap ?? 8,
    hachureAngle: o.hachureAngle ?? -41,
    fillWeight: o.fillWeight ?? (o.width ?? 2) * 0.6,
    disableMultiStroke: !!o.single,
    disableMultiStrokeFill: true,
    preserveVertices: false,
  };
}

export const ink = {
  path: (d: string, o: InkOptions = {}) => toMarkup(gen.path(d, opts(o)), o),
  rect: (x: number, y: number, w: number, h: number, o: InkOptions = {}) => toMarkup(gen.rectangle(x, y, w, h, opts(o)), o),
  line: (x1: number, y1: number, x2: number, y2: number, o: InkOptions = {}) => toMarkup(gen.line(x1, y1, x2, y2, opts(o)), o),
  ellipse: (cx: number, cy: number, w: number, h: number, o: InkOptions = {}) => toMarkup(gen.ellipse(cx, cy, w, h, opts(o)), o),
  circle: (cx: number, cy: number, d: number, o: InkOptions = {}) => toMarkup(gen.circle(cx, cy, d, opts(o)), o),
  curve: (pts: [number, number][], o: InkOptions = {}) => toMarkup(gen.curve(pts, opts(o)), o),
  polyline: (pts: [number, number][], o: InkOptions = {}) => toMarkup(gen.linearPath(pts, opts(o)), o),
  polygon: (pts: [number, number][], o: InkOptions = {}) => toMarkup(gen.polygon(pts, opts(o)), o),
};

/** Small deterministic random generator. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) % 2147483647 || 7;
}

/**
 * A watercolour wash: two soft irregular blobs, the inner one darker, like
 * pigment pooling at the edge. No filters, so it stays fast while animating.
 */
export function wash(cx: number, cy: number, rx: number, ry: number, color: string, seed: number, strength = 1): string {
  const rand = seeded(seed);
  const blob = (scale: number, jitter: number) => {
    const n = 11;
    const pts: [number, number][] = [];
    const rot = rand() * Math.PI;
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      const r = 1 - jitter / 2 + rand() * jitter;
      pts.push([cx + Math.cos(a) * rx * r * scale, cy + Math.sin(a) * ry * r * scale]);
    }
    let d = "";
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `${i === 0 ? `M${p1[0].toFixed(1)},${p1[1].toFixed(1)}` : ""} C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d + "Z";
  };
  const o = 0.22 * strength;
  return `<g class="wash"><path d="${blob(1, 0.32)}" style="fill:${color}" opacity="${o.toFixed(2)}"/><path d="${blob(0.86, 0.4)}" style="fill:${color}" opacity="${(o * 0.8).toFixed(2)}"/><path d="${blob(0.55, 0.5)}" style="fill:${color}" opacity="${(o * 0.5).toFixed(2)}"/></g>`;
}
