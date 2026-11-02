import { sectionsOf } from "../core/deck";
import type { Deck, Slide } from "../core/types";
import {
  type CardPlace, type Layout, type Rect, type Step, type StyleDef, cardRect, overview, sectionColor, slideStep,
  svgText, union, wrap,
} from "./util";
import { hashSeed, ink, wash } from "../design/sketch";

/**
 * Spider web: the opening slide is the hub. Each section is a branch node
 * on the web, and its slides fan out around it.
 */
export const spider: StyleDef = {
  id: "spider",
  name: "Spider web",
  emoji: "🕸️",
  icon: "topology-star-3",
  tagline: "One central idea, everything connected",
  layout(deck: Deck): Layout {
    const [hub, ...rest] = deck.slides;
    const cards: Record<string, CardPlace> = {};
    if (!hub) return { cards, decor: "", steps: [], bounds: { x: -500, y: -300, w: 1000, h: 600 } };
    cards[hub.id] = { x: 0, y: 0, w: 1150 };

    // Branches: one per section. With a single section, one per slide.
    let branches: { name: string; slides: Slide[] }[] = sectionsOf(rest);
    const perSlide = branches.length <= 1;
    if (perSlide) branches = rest.map((s) => ({ name: s.title, slides: [s] }));
    const B = Math.max(1, branches.length);

    const maxLeaves = Math.max(1, ...branches.map((b) => b.slides.length));
    const R1 = perSlide ? Math.max(1700, (B * 1150) / (2 * Math.PI)) : Math.max(1900, (B * 1500) / (2 * Math.PI));
    const R2 = 1250 + Math.max(0, maxLeaves - 3) * 120;
    const nodes: { x: number; y: number; angle: number; name: string; color: string; leaves: Slide[] }[] = [];

    branches.forEach((b, i) => {
      const angle = -Math.PI / 2 + (i / B) * Math.PI * 2;
      const node = { x: Math.cos(angle) * R1, y: Math.sin(angle) * R1 * 0.82, angle, name: b.name, color: sectionColor(i), leaves: b.slides };
      nodes.push(node);
      if (perSlide) {
        cards[b.slides[0].id] = { x: node.x, y: node.y, w: 900 };
        return;
      }
      const k = b.slides.length;
      const spread = Math.min(Math.PI * 0.95, ((Math.PI * 2) / B) * 0.85, 0.55 * k);
      b.slides.forEach((s, j) => {
        const a = k === 1 ? angle : angle - spread / 2 + (spread * j) / (k - 1);
        const r = R2 + (k > 4 && j % 2 ? 520 : 0);
        cards[s.id] = { x: node.x + Math.cos(a) * r, y: node.y + Math.sin(a) * r * 0.82, w: 820 };
      });
    });

    const all = Object.values(cards).map((c) => cardRect(c));
    const bounds = union(all, 280);

    // The web: spokes out from the hub and sagging threads joining them.
    let decor = "";
    const spokes = Math.max(B, 6);
    const reach = Math.max(bounds.w, bounds.h) * 0.55;
    const ringR = [0.22, 0.42, 0.64, 0.86].map((f) => f * reach);
    const spokeAngles = [...Array(spokes)].map((_, i) => -Math.PI / 2 + (i / spokes) * Math.PI * 2 + (B < 6 ? Math.PI / spokes : 0));
    spokeAngles.forEach((a, i) => {
      decor += ink.line(0, 0, Math.cos(a) * reach, Math.sin(a) * reach * 0.82, { seed: 100 + i, width: 3, roughness: 1.2, stroke: "var(--ink-soft)", single: true });
    });
    ringR.forEach((r, ri) => {
      let d = "";
      spokeAngles.forEach((a, i) => {
        const b = spokeAngles[(i + 1) % spokes];
        const p = { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.82 };
        const q = { x: Math.cos(b) * r, y: Math.sin(b) * r * 0.82 };
        const mid = (a + (i + 1 === spokes ? b + Math.PI * 2 : b)) / 2;
        const sag = { x: Math.cos(mid) * r * 0.9, y: Math.sin(mid) * r * 0.82 * 0.9 };
        d += `${i === 0 ? `M${p.x},${p.y}` : ""} Q${sag.x},${sag.y} ${q.x},${q.y}`;
      });
      decor += ink.path(d, { seed: 200 + ri, width: 2.5, roughness: 1.1, stroke: "var(--ink-soft)", single: true });
    });

    // Washes under each branch, then threads from hub to branch to leaves.
    nodes.forEach((n, i) => {
      const cluster = [{ x: n.x, y: n.y }, ...n.leaves.map((s) => cards[s.id])];
      const cx = cluster.reduce((a, p) => a + p.x, 0) / cluster.length;
      const cy = cluster.reduce((a, p) => a + p.y, 0) / cluster.length;
      decor += wash(cx, cy, perSlide ? 700 : 1100, perSlide ? 520 : 800, n.color, hashSeed(n.name + i), 0.8);
    });
    nodes.forEach((n, i) => {
      decor += ink.curve([[0, 0], [n.x * 0.5 + n.y * 0.08, n.y * 0.5 - n.x * 0.08], [n.x, n.y]], { seed: 300 + i, width: 9, roughness: 1, stroke: "var(--ink)" });
      if (perSlide) return;
      n.leaves.forEach((s, j) => {
        const c = cards[s.id];
        decor += ink.line(n.x, n.y, c.x, c.y, { seed: 400 + i * 20 + j, width: 4, roughness: 1.4, stroke: "var(--ink)", dash: "14 18", single: true });
      });
    });
    let overlay = "";
    if (!perSlide) {
      nodes.forEach((n, i) => {
        overlay += ink.circle(n.x, n.y, 460, { seed: 500 + i, width: 6, stroke: "var(--ink)", fill: "var(--paper-2)", fillStyle: "solid" });
        overlay += ink.circle(n.x, n.y, 420, { seed: 600 + i, width: 2, stroke: "none", fill: n.color, fillStyle: "hachure", hachureGap: 14, fillWeight: 6 });
        const lines = wrap(n.name, 12, 3);
        const size = 62;
        overlay += svgText(lines, n.x, n.y - ((lines.length - 1) * size * 1.15) / 2 + size * 0.35, size, `text-anchor="middle" font-weight="700"`);
      });
    }

    const steps: Step[] = [overview(bounds, "The whole web"), slideStep(hub.id, cards[hub.id])];
    for (const n of nodes) {
      const cluster: Rect[] = [...n.leaves.map((s) => cardRect(cards[s.id])), { x: n.x - 240, y: n.y - 240, w: 480, h: 480 }];
      if (!perSlide && n.leaves.length > 1) steps.push({ kind: "section", rect: union(cluster, 120), label: n.name });
      for (const s of n.leaves) steps.push(slideStep(s.id, cards[s.id]));
    }
    steps.push(overview(bounds, "The whole web"));
    return { cards, decor, overlay, steps, bounds };
  },
};
