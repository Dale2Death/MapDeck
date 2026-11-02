import { splitLong } from "../design/classify";
import type { Deck, Slide } from "./types";

let counter = 0;
export function newId(): string {
  counter += 1;
  return `s${Date.now().toString(36)}${counter.toString(36)}`;
}

export function makeDeck(title: string, slides: Slide[], source: Deck["source"]): Deck {
  const filled = splitLong(autoSection(slides.filter((s) => s.title.trim() || s.points.length || s.image)), newId);
  return {
    title: title.trim() || filled[0]?.title || "Untitled",
    slides: filled,
    originalOrder: filled.map((s) => s.id),
    originalSections: Object.fromEntries(filled.map((s) => [s.id, s.section])),
    source,
  };
}

/**
 * If the source gave no sections, group slides into chunks so Zoom and
 * Spider web have something to branch on. Each group is named after its
 * first slide. Users can rename or regroup in the editor.
 */
export function autoSection(slides: Slide[]): Slide[] {
  const hasSections = new Set(slides.map((s) => s.section).filter(Boolean)).size > 1;
  if (hasSections) {
    let last = slides.find((s) => s.section)?.section ?? "Main";
    return slides.map((s) => {
      if (s.section) last = s.section;
      return { ...s, section: s.section || last };
    });
  }
  const n = slides.length;
  const groups = n <= 4 ? 1 : Math.min(6, Math.ceil(n / 3));
  const size = Math.ceil(n / groups);
  return slides.map((s, i) => {
    const lead = slides[Math.floor(i / size) * size];
    return { ...s, section: groups === 1 ? "Main" : lead.title || `Part ${Math.floor(i / size) + 1}` };
  });
}

/** Sections in order of first appearance, each with its slides. */
export function sectionsOf(slides: Slide[]): { name: string; slides: Slide[] }[] {
  const out: { name: string; slides: Slide[] }[] = [];
  const byName = new Map<string, { name: string; slides: Slide[] }>();
  for (const s of slides) {
    let g = byName.get(s.section);
    if (!g) {
      g = { name: s.section, slides: [] };
      byName.set(s.section, g);
      out.push(g);
    }
    g.slides.push(s);
  }
  return out;
}

export function moveSlide(deck: Deck, from: number, to: number): Deck {
  const slides = deck.slides.slice();
  const [moved] = slides.splice(from, 1);
  const at = Math.max(0, Math.min(slides.length, to));
  // Dropped inside another section? Join it, so grouped styles keep the order.
  const before = slides[at - 1];
  const after = slides[at];
  let section = moved.section;
  if (before && after && before.section === after.section) section = before.section;
  else if (!before && after && after.section !== moved.section && !slides.some((x) => x.section === moved.section)) section = after.section;
  slides.splice(at, 0, { ...moved, section });
  return { ...deck, slides };
}

export function resetOrder(deck: Deck): Deck {
  const byId = new Map(deck.slides.map((s) => [s.id, s]));
  const sec = deck.originalSections ?? {};
  const ordered = deck.originalOrder
    .map((id) => byId.get(id))
    .filter((s): s is Slide => !!s)
    .map((s) => (sec[s.id] !== undefined ? { ...s, section: sec[s.id] } : s));
  const extra = deck.slides.filter((s) => !deck.originalOrder.includes(s.id));
  return { ...deck, slides: [...ordered, ...extra] };
}

export function isOriginalOrder(deck: Deck): boolean {
  const cur = deck.slides.map((s) => s.id).join();
  return cur === deck.originalOrder.filter((id) => deck.slides.some((s) => s.id === id)).join();
}
