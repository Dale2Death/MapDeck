import { makeDeck, newId } from "../core/deck";
import type { Deck, Slide } from "../core/types";

/** Remove inline Markdown so text reads cleanly on a slide. */
export function cleanInline(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(\*|_)(.+?)\1/g, "$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const BULLET = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/;
const IMAGE = /!\[[^\]]*\]\(([^)\s]+)[^)]*\)/;
const RULE = /^\s*(?:---+|\*\*\*+|___+)\s*$/;

interface Block {
  title: string;
  lines: string[];
  section: string;
}

/** Turn body lines into points: bullets stay bullets, wrapped paragraphs join. */
function linesToPoints(lines: string[]): { points: string[]; image?: string } {
  const points: string[] = [];
  let para: string[] = [];
  let image: string | undefined;
  const flush = () => {
    if (para.length) points.push(cleanInline(para.join(" ")));
    para = [];
  };
  for (const raw of lines) {
    const img = raw.match(IMAGE);
    if (img && !image && /^(https?:|data:)/.test(img[1])) image = img[1];
    const line = raw.replace(IMAGE, "").trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    const h = line.match(HEADING);
    if (h) {
      flush();
      points.push(cleanInline(h[2]));
      continue;
    }
    const b = line.match(BULLET);
    if (b) {
      flush();
      points.push(cleanInline(b[1]));
      continue;
    }
    if (/^\s*>/.test(line)) {
      para.push(line.replace(/^\s*>\s?/, ""));
      continue;
    }
    para.push(line.trim());
  }
  flush();
  return { points: points.filter(Boolean), image };
}

function toSlide(b: Block): Slide {
  const { points, image } = linesToPoints(b.lines);
  return { id: newId(), title: cleanInline(b.title), points, section: b.section, image };
}

function stripFrontMatter(text: string): string {
  return text.replace(/^﻿?---\s*\n[\s\S]*?\n---\s*\n/, "");
}

/** Markdown with headings and/or `---` slide breaks. */
export function parseMarkdown(input: string, fallbackTitle = "Untitled"): Deck {
  const text = stripFrontMatter(input.replace(/\r\n?/g, "\n"));
  const lines = text.split("\n");
  if (!lines.some((l) => HEADING.test(l)) && !lines.some((l) => RULE.test(l))) {
    return parsePlainText(text, fallbackTitle);
  }

  // Strip fenced code so '#' inside code isn't treated as a heading.
  let inFence = false;
  const usable = lines.map((l) => {
    if (/^\s*```/.test(l)) {
      inFence = !inFence;
      return "";
    }
    return inFence ? l.replace(/^#/, "\\#") : l;
  });

  let deckTitle = "";
  const firstIdx = usable.findIndex((l) => l.trim());
  const h1s = usable.filter((l) => /^#\s/.test(l));
  const nextIdx = usable.findIndex((l, i) => i > firstIdx && l.trim());
  const titleThenH1 = nextIdx > 0 && /^#\s/.test(usable[nextIdx]);
  if (firstIdx >= 0 && /^#\s/.test(usable[firstIdx]) && (h1s.length === 1 || titleThenH1)) {
    deckTitle = cleanInline(usable[firstIdx].replace(/^#\s+/, ""));
    usable[firstIdx] = "";
  }

  const hasRules = usable.some((l) => RULE.test(l));
  const blocks: Block[] = [];

  if (hasRules) {
    // Explicit slide breaks: each chunk is one slide, first heading is its title.
    let section = "";
    for (const chunk of splitOn(usable, (l) => RULE.test(l))) {
      const hIdx = chunk.findIndex((l) => HEADING.test(l));
      if (hIdx < 0) {
        if (chunk.some((l) => l.trim())) blocks.push({ title: "", lines: chunk, section });
        continue;
      }
      const m = chunk[hIdx].match(HEADING)!;
      if (m[1].length === 1 && deckTitle) section = cleanInline(m[2]);
      const body = chunk.filter((_, i) => i !== hIdx);
      blocks.push({ title: m[2], lines: body, section });
    }
  } else {
    const levels = [...new Set(usable.map((l) => l.match(HEADING)?.[1].length).filter(Boolean) as number[])].sort();
    const sectionLevel = levels.length >= 2 ? levels[0] : 0;
    const slideLevel = levels.length >= 2 ? levels[1] : levels[0];
    let section = "";
    let cur: Block | null = null;
    const intro: string[] = [];
    for (const l of usable) {
      const m = l.match(HEADING);
      const level = m?.[1].length ?? 0;
      if (m && level === sectionLevel) {
        section = cleanInline(m[2]);
        cur = { title: m[2], lines: [], section };
        blocks.push(cur);
      } else if (m && level === slideLevel) {
        cur = { title: m[2], lines: [], section };
        blocks.push(cur);
      } else if (cur) {
        cur.lines.push(l);
      } else {
        intro.push(l);
      }
    }
    // Section headings with no body of their own are just group labels.
    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i];
      const isSectionHead = sectionLevel && cleanInline(b.title) === b.section && b.lines.every((x) => !x.trim());
      const nextInSame = blocks[i + 1]?.section === b.section;
      if (isSectionHead && nextInSame) blocks.splice(i, 1);
    }
    if (intro.some((l) => l.trim())) {
      blocks.unshift({ title: deckTitle || fallbackTitle, lines: intro, section: blocks[0]?.section ?? "" });
    }
  }

  const slides = blocks.map(toSlide);
  if (deckTitle && !slides.some((s) => s.title === deckTitle)) {
    slides.unshift({ id: newId(), title: deckTitle, points: [], section: slides[0]?.section ?? "" });
  }
  return makeDeck(deckTitle || slides[0]?.title || fallbackTitle, slides, "markdown");
}

function splitOn<T>(arr: T[], pred: (t: T) => boolean): T[][] {
  const out: T[][] = [[]];
  for (const x of arr) {
    if (pred(x)) out.push([]);
    else out[out.length - 1].push(x);
  }
  return out;
}

/**
 * Plain text: paragraphs separated by blank lines. A short line on its own
 * starts a new slide; longer lines and multi-line blocks become points.
 */
export function parsePlainText(input: string, fallbackTitle = "Untitled"): Deck {
  const paras = input
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((p) => p.length);
  const isTitle = (s: string) => s.length <= 70 && !/[.!?,;:]$/.test(s);
  const slides: Slide[] = [];
  let cur: Slide | null = null;
  for (const p of paras) {
    if (p.length === 1 && isTitle(p[0])) {
      cur = { id: newId(), title: cleanInline(p[0]), points: [], section: "" };
      slides.push(cur);
      continue;
    }
    if (p.length > 1 && isTitle(p[0])) {
      cur = { id: newId(), title: cleanInline(p[0]), points: [], section: "" };
      slides.push(cur);
      cur.points.push(...linesToPoints(p.slice(1)).points);
      continue;
    }
    const pts = linesToPoints(p).points;
    if (!cur || cur.points.length >= 4) {
      const words = pts[0].split(" ");
      cur = { id: newId(), title: words.slice(0, 6).join(" ") + (words.length > 6 ? "…" : ""), points: [], section: "" };
      slides.push(cur);
    }
    cur.points.push(...pts);
  }
  const deck = makeDeck(slides[0]?.title || fallbackTitle, slides, "text");
  return deck;
}
