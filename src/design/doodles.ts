import data from "../generated/doodles.json";
import type { Slide } from "../core/types";
import { hashSeed, ink, wash } from "./sketch";

type Entry = { svg: string; keywords: string[] };
const DOODLES = data as Record<string, Entry>;

export const DOODLE_NAMES = Object.keys(DOODLES).sort();

const FALLBACK = ["compass", "map-2", "binoculars", "bulb", "key", "star", "flag", "sparkles"];

function words(s: string): string {
  return ` ${s.toLowerCase().replace(/[^a-z0-9$%&'\s-]/g, " ").replace(/\s+/g, " ")} `;
}

/** Choose a doodle that matches the slide's words. */
export function pickDoodle(slide: Slide, index = 0): string | null {
  if (slide.doodle === "none") return null;
  if (slide.doodle && DOODLES[slide.doodle]) return slide.doodle;
  const title = words(slide.title);
  const body = words(slide.points.join(" "));
  const section = words(slide.section);
  let best: string | null = null;
  let bestScore = 0;
  for (const [name, { keywords }] of Object.entries(DOODLES)) {
    let score = 0;
    for (const k of keywords) {
      const needle = ` ${k} `;
      if (title.includes(needle)) score += 3 + k.length / 20;
      if (body.includes(needle)) score += 1;
      if (section.includes(needle)) score += 0.5;
    }
    if (score > bestScore) {
      bestScore = score;
      best = name;
    }
  }
  return best ?? FALLBACK[(hashSeed(slide.id) + index) % FALLBACK.length];
}

const cache = new Map<string, string>();

/** Paths for a doodle redrawn with a hand-inked wobble, in a 24×24 box. */
function inkedPaths(name: string, seed: number, width: number): string {
  const key = `${name}:${seed}:${width}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const entry = DOODLES[name];
  if (!entry) return "";
  let out = "";
  for (const m of entry.svg.matchAll(/d="([^"]+)"/g)) {
    out += ink.path(m[1], { seed, width, roughness: 0.55, bowing: 0.6, stroke: "var(--ink)" });
  }
  cache.set(key, out);
  return out;
}

/**
 * A doodle with a watercolour wash behind it, as an <svg> element.
 * `color` is the wash colour (usually the section colour).
 */
export function doodleSvg(name: string | null, seedKey: string, color = "var(--sec)", cls = "mdp-doodle"): string {
  if (!name) return "";
  const seed = hashSeed(seedKey);
  return `<svg class="${cls}" viewBox="-6 -6 36 36" aria-hidden="true">${wash(12, 13, 13, 11, color, seed, 1.5)}${inkedPaths(name, seed % 1000, 0.9)}</svg>`;
}
