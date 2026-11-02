import type { Pace, Paper, StyleId, ThemeId } from "./types";

export interface QuizOption {
  label: string;
  hint?: string;
  styles?: Partial<Record<StyleId, number>>;
  theme?: ThemeId;
  pace?: Pace;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
}

/** The vibe quiz: one question at a time, each answer nudges the scores. */
export const QUIZ: QuizQuestion[] = [
  {
    id: "shape",
    question: "What is this presentation mostly doing?",
    options: [
      { label: "Taking people step by step somewhere", styles: { journey: 3, gameboard: 1 } },
      { label: "Big picture first, then the details", styles: { zoom: 3, constellation: 1 } },
      { label: "One core idea with lots of connected parts", styles: { spider: 3, constellation: 1 } },
      { label: "A plan or workshop with milestones", styles: { gameboard: 3, journey: 1 } },
    ],
  },
  {
    id: "movie",
    question: "Pick a movie for the vibe.",
    options: [
      { label: "Indiana Jones", hint: "adventure", styles: { journey: 2, gameboard: 1 }, theme: "field" },
      { label: "Inception", hint: "layers within layers", styles: { zoom: 2, spider: 1 }, theme: "graphite" },
      { label: "Interstellar", hint: "vast and wondrous", styles: { constellation: 3 }, theme: "harbour" },
      { label: "Jumanji", hint: "playful", styles: { gameboard: 3 }, theme: "orchard" },
      { label: "Sherlock", hint: "connect the clues", styles: { spider: 2, zoom: 1 }, theme: "graphite" },
    ],
  },
  {
    id: "colour",
    question: "Pick your inks.",
    options: [
      { label: "Field notes", hint: "ochre, cobalt, sage", theme: "field" },
      { label: "Harbour", hint: "sea blue, coral, teal", theme: "harbour" },
      { label: "Orchard", hint: "leaf, plum, apricot", theme: "orchard" },
      { label: "Graphite & red", hint: "pencil grey with one red", theme: "graphite" },
    ],
  },
  {
    id: "pace",
    question: "How should it move?",
    options: [
      { label: "Snappy", hint: "quick cuts", pace: "snappy" },
      { label: "Measured", hint: "steady and clear", pace: "measured" },
      { label: "Cinematic", hint: "slow, sweeping moves", pace: "cinematic", styles: { zoom: 1, constellation: 1 } },
    ],
  },
  {
    id: "room",
    question: "Who's watching?",
    options: [
      { label: "My team", styles: { spider: 1, gameboard: 1 } },
      { label: "A client or pitch", styles: { journey: 1, zoom: 1 } },
      { label: "A big room or keynote", styles: { zoom: 1, constellation: 1 } },
      { label: "People clicking a link on their own", styles: { journey: 1, gameboard: 1 } },
    ],
  },
];

export interface QuizResult {
  ranking: { style: StyleId; score: number }[];
  theme: ThemeId;
  pace: Pace;
  paper?: Paper;
  /** Words from a description that drove the result, to show back to the user. */
  matched?: string[];
}

const ORDER: StyleId[] = ["journey", "zoom", "spider", "constellation", "gameboard"];

function rank(scores: Record<StyleId, number>) {
  return ORDER.map((style) => ({ style, score: scores[style] })).sort(
    (a, b) => b.score - a.score || ORDER.indexOf(a.style) - ORDER.indexOf(b.style),
  );
}

/** answers[i] is the chosen option index for QUIZ[i] (or -1 if skipped). */
export function scoreQuiz(answers: number[]): QuizResult {
  const scores: Record<StyleId, number> = { journey: 0, zoom: 0, spider: 0, constellation: 0, gameboard: 0 };
  let theme: ThemeId | undefined;
  let colourTheme: ThemeId | undefined;
  let pace: Pace = "measured";
  QUIZ.forEach((q, i) => {
    const o = q.options[answers[i]];
    if (!o) return;
    for (const [k, v] of Object.entries(o.styles ?? {})) scores[k as StyleId] += v ?? 0;
    if (o.theme) {
      if (q.id === "colour") colourTheme = o.theme;
      else theme = o.theme;
    }
    if (o.pace) pace = o.pace;
  });
  return { ranking: rank(scores), theme: colourTheme ?? theme ?? "field", pace };
}

const STYLE_WORDS: Record<StyleId, string[]> = {
  journey: ["journey", "road", "road trip", "trip", "path", "route", "travel", "adventure", "story", "step by step", "roadmap", "voyage", "expedition", "trail", "quest", "from a to b", "progress", "chapter", "chapters", "walk"],
  zoom: ["big picture", "zoom", "detail", "details", "deep dive", "overview", "layers", "nested", "inception", "drill down", "macro", "micro", "architecture", "zoom in", "zoom out", "focus"],
  spider: ["connected", "connections", "web", "network", "hub", "ecosystem", "mind map", "mindmap", "brainstorm", "ideas", "relationships", "central", "core idea", "pillars", "themes", "clues", "detective"],
  constellation: ["stars", "star", "space", "cosmic", "galaxy", "universe", "vision", "dream", "dreamy", "wonder", "night sky", "inspiring", "inspirational", "visionary", "future", "moonshot", "astronomy", "awe"],
  gameboard: ["game", "games", "play", "playful", "fun", "workshop", "levels", "level up", "milestones", "board game", "challenge", "quest", "team building", "onboarding", "training", "competition", "dice", "gamified"],
};
const THEME_WORDS: Record<ThemeId, string[]> = {
  field: ["warm", "earthy", "autumn", "sunny", "golden", "adventure", "explorer", "vintage", "classic", "natural"],
  harbour: ["ocean", "sea", "blue", "coastal", "calm", "fresh", "cool", "water", "nautical", "clean", "space"],
  orchard: ["garden", "nature", "green", "organic", "soft", "gentle", "fruit", "spring", "friendly", "plum", "growth"],
  graphite: ["serious", "corporate", "minimal", "mono", "monochrome", "black", "bold", "dramatic", "sharp", "executive", "board", "red", "noir", "sleek", "slick"],
};
const PACE_WORDS: Record<Pace, string[]> = {
  snappy: ["fast", "snappy", "quick", "punchy", "energetic", "high energy", "upbeat", "short", "lightning", "rapid", "tiktok"],
  measured: ["steady", "clear", "calm", "measured", "simple", "relaxed", "teaching", "explain"],
  cinematic: ["slow", "cinematic", "epic", "sweeping", "dramatic", "grand", "movie", "film", "keynote", "majestic"],
};
const PAPER_WORDS: Record<"light" | "dark", string[]> = {
  light: ["light", "bright", "daylight", "airy", "white", "paper", "sunny"],
  dark: ["dark", "night", "moody", "midnight", "noir", "evening", "cinematic", "space", "stars"],
};

function hits(text: string, words: string[]): string[] {
  return words.filter((w) => text.includes(` ${w} `));
}

/**
 * "Describe it" mode: read a free-text description of the vibe and journey
 * and turn it into a style, inks, pace and paper.
 */
export function interpretVibe(description: string): QuizResult {
  const text = ` ${description.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ")} `;
  const matched = new Set<string>();
  const scores: Record<StyleId, number> = { journey: 0, zoom: 0, spider: 0, constellation: 0, gameboard: 0 };
  for (const id of ORDER) {
    const h = hits(text, STYLE_WORDS[id]);
    h.forEach((w) => matched.add(w));
    scores[id] += h.reduce((a, w) => a + 1 + w.split(" ").length * 0.5, 0);
  }
  const best = <K extends string>(table: Record<K, string[]>): K | undefined => {
    let top: K | undefined;
    let n = 0;
    for (const k of Object.keys(table) as K[]) {
      const h = hits(text, table[k]);
      h.forEach((w) => matched.add(w));
      if (h.length > n) {
        n = h.length;
        top = k;
      }
    }
    return top;
  };
  const theme = best(THEME_WORDS) ?? "field";
  const pace = best(PACE_WORDS) ?? "measured";
  const paper = best(PAPER_WORDS);
  return { ranking: rank(scores), theme, pace, paper, matched: [...matched] };
}
