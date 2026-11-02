import { sectionsOf } from "../core/deck";
import type { Deck, Slide } from "../core/types";
import {
  type CardPlace, type Layout, type Rect, type Step, type StyleDef, cardRect, overview, sectionColor, slideStep,
  svgText, union, wrap,
} from "./util";

/**
 * Spider web: the opening slide is the hub. Each section is a branch node
 * on the web, and its slides fan out around it.
 */
export const spider: StyleDef = {
  id: "spider",
  name: "Spider web",
  emoji: "🕸️",
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

    // The web: spokes out from the hub and rings joining them.
    let decor = "";
    const spokes = Math.max(B, 6);
    const reach = Math.max(bounds.w, bounds.h) * 0.55;
    const ringR = [0.22, 0.42, 0.64, 0.86].map((f) => f * reach);
    for (let i = 0; i < spokes; i++) {
      const a = -Math.PI / 2 + (i / spokes) * Math.PI * 2 + (B < 6 ? Math.PI / spokes : 0);
      decor += `<line x1="0" y1="0" x2="${Math.cos(a) * reach}" y2="${Math.sin(a) * reach * 0.82}" style="stroke:var(--web)" stroke-width="5"/>`;
    }
    const spokeAngles = [...Array(spokes)].map((_, i) => -Math.PI / 2 + (i / spokes) * Math.PI * 2 + (B < 6 ? Math.PI / spokes : 0));
    for (const r of ringR) {
      // Slightly sagging threads between spokes, like a real web.
      let d = "";
      spokeAngles.forEach((a, i) => {
        const b = spokeAngles[(i + 1) % spokes];
        const p = { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.82 };
        const q = { x: Math.cos(b) * r, y: Math.sin(b) * r * 0.82 };
        const mid = (a + (i + 1 === spokes ? b + Math.PI * 2 : b)) / 2;
        const sag = { x: Math.cos(mid) * r * 0.9, y: Math.sin(mid) * r * 0.82 * 0.9 };
        d += `${i === 0 ? `M${p.x},${p.y}` : ""} Q${sag.x},${sag.y} ${q.x},${q.y}`;
      });
      decor += `<path d="${d}" fill="none" style="stroke:var(--web)" stroke-width="4"/>`;
    }

    // Threads from hub to branch nodes to leaves.
    for (const n of nodes) {
      decor += `<path d="M0,0 Q${n.x * 0.5 + n.y * 0.08},${n.y * 0.5 - n.x * 0.08} ${n.x},${n.y}" fill="none" style="stroke:${n.color}" stroke-width="18" stroke-linecap="round"/>`;
      if (perSlide) continue;
      for (const s of n.leaves) {
        const c = cards[s.id];
        decor += `<line x1="${n.x}" y1="${n.y}" x2="${c.x}" y2="${c.y}" style="stroke:${n.color}" stroke-width="10" stroke-dasharray="4 22" stroke-linecap="round"/>`;
      }
    }
    let overlay = "";
    if (!perSlide) {
      for (const n of nodes) {
        overlay += `<circle cx="${n.x}" cy="${n.y}" r="230" style="fill:${n.color}"/>`;
        const lines = wrap(n.name, 12, 3);
        const size = 56;
        overlay += svgText(lines, n.x, n.y - ((lines.length - 1) * size * 1.15) / 2 + size * 0.35, size, `text-anchor="middle" font-weight="800" style="fill:var(--on-accent)"`);
      }
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
