import type { Slide, SlideLayout } from "../core/types";

/** A number worth showing big: 65%, $2.4M, 3x, 12k, 1,200, 94 pts… */
const STAT = /(?:^|[\s(])((?:[$€£¥]\s?)?\d[\d,]*(?:\.\d+)?\s?(?:%|x|×|k|m|bn|b|million|billion|thousand|pts|points|hrs|hours|days|weeks|years|\+)?)(?=$|[\s.,;:)!?])/i;

export interface Stat {
  value: string;
  label: string;
}

/** Pull the headline number out of a point, if it has one worth featuring. */
export function extractStat(point: string): Stat | null {
  const m = point.match(STAT);
  if (!m) return null;
  const value = m[1].trim();
  // Plain small integers ("3 internal teams") only count with a unit.
  const bare = /^\d{1,2}$/.test(value);
  const hasUnit = /[%x×kmb$€£¥+]|million|billion|thousand|pts|points|hrs|hours|days|weeks|years/i.test(value);
  if (bare && !hasUnit) return null;
  if (/^(19|20)\d\d$/.test(value)) return null; // years read better as text
  let label = point.replace(m[1], "").replace(/\s{2,}/g, " ").trim();
  label = label.replace(/^(by|of|at|to|in|up to|over|about|around|nearly|almost)\s+/i, (x) => x).replace(/^[-–:,]\s*/, "");
  return { value, label: label || point };
}

const COMPARE_TITLE = /\b(vs\.?|versus|before (and|&) after|compared?|comparison|pros (and|&) cons|then (and|&) now|old (and|&) new)\b/i;
const COMPARE_POINT = /^(before|after|pros?|cons?|then|now|old|new|us|them|today|tomorrow|without|with)\b\s*[:\-–]/i;
const STEPS_TITLE = /\b(steps?|process|how it works|phases?|stages?|roadmap|timeline|journey|plan|next steps|workflow)\b/i;
const STEP_POINT = /^(step|phase|stage|part)\s*\d+|^\d+[.)]\s/i;
const QUOTE_START = /^["“”'‘’«]/;

/** Decide how a slide should be laid out, from its content alone. */
export function layoutOf(slide: Slide, index: number): SlideLayout {
  if (slide.layout) return slide.layout;
  const pts = slide.points;
  if (slide.image && slide.imageFit !== "full") return "photo";
  if (index === 0 && pts.length <= 1) return "title";
  if (!pts.length) return "statement";
  if (pts.length <= 3 && (QUOTE_START.test(pts[0]) || /\b(quote|testimonial)s?\b/i.test(slide.title))) return "quote";
  if (pts.length >= 2 && pts.length <= 8 && (COMPARE_TITLE.test(slide.title) || pts.filter((p) => COMPARE_POINT.test(p)).length >= 2)) return "compare";
  if (pts.length >= 2 && pts.length <= 5 && (pts.every((p) => STEP_POINT.test(p)) || (STEPS_TITLE.test(slide.title) && pts.every((p) => p.length < 70)))) return "steps";
  if (pts.length <= 4) {
    const stats = pts.map(extractStat).filter(Boolean);
    if (stats.length >= Math.max(1, Math.ceil(pts.length * 0.6))) return "stat";
  }
  if (pts.length === 1 && pts[0].length < 110) return "statement";
  return "list";
}

/** Long slides read badly on a map; split them into parts. */
export function splitLong(slides: Slide[], newId: () => string): Slide[] {
  const out: Slide[] = [];
  for (const s of slides) {
    const chars = s.points.join("").length;
    if (s.points.length <= 6 && chars <= 560) {
      out.push(s);
      continue;
    }
    const parts = Math.max(2, Math.ceil(Math.max(s.points.length / 5, chars / 480)));
    const size = Math.ceil(s.points.length / parts);
    for (let i = 0; i < parts; i++) {
      const chunk = s.points.slice(i * size, (i + 1) * size);
      if (!chunk.length) continue;
      out.push({
        ...s,
        id: i === 0 ? s.id : newId(),
        title: `${s.title} (${i + 1}/${parts})`,
        points: chunk,
        notes: i === 0 ? s.notes : undefined,
        image: i === 0 ? s.image : undefined,
      });
    }
  }
  return out;
}

/** Tidy a point for display: drop trailing full stops and stray markers. */
export function tidy(point: string): string {
  return point.replace(/^[•●▪◦·\-–—*]\s*/, "").replace(/\s+/g, " ").replace(/(?<![.]{2})\.$/, "").trim();
}

/** Split "Before: slow · After: fast" style points into two columns. */
export function compareColumns(slide: Slide): { left: { head: string; items: string[] }; right: { head: string; items: string[] } } {
  const pts = slide.points.map(tidy);
  const vs = slide.title.split(/\s+(?:vs\.?|versus)\s+/i);
  const labelled = pts.map((p) => p.match(/^([^:–\-]{2,24})\s*[:\-–]\s*(.+)$/));
  const heads = [...new Set(labelled.filter(Boolean).map((m) => m![1].trim()))];
  if (heads.length === 2) {
    const [a, b] = heads;
    return {
      left: { head: a, items: labelled.filter((m) => m?.[1].trim() === a).map((m) => m![2]) },
      right: { head: b, items: labelled.filter((m) => m?.[1].trim() === b).map((m) => m![2]) },
    };
  }
  const half = Math.ceil(pts.length / 2);
  return {
    left: { head: vs.length === 2 ? vs[0] : "", items: pts.slice(0, half) },
    right: { head: vs.length === 2 ? vs[1] : "", items: pts.slice(half) },
  };
}
