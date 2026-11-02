import type { Pace, StyleId, ThemeId } from "./types";

export interface QuizOption {
  label: string;
  emoji: string;
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
      { emoji: "🛣️", label: "Taking people step by step somewhere", styles: { journey: 3, gameboard: 1 } },
      { emoji: "🗺️", label: "Big picture first, then the details", styles: { zoom: 3, constellation: 1 } },
      { emoji: "🧠", label: "One core idea with lots of connected parts", styles: { spider: 3, constellation: 1 } },
      { emoji: "🏁", label: "A plan or workshop with milestones", styles: { gameboard: 3, journey: 1 } },
    ],
  },
  {
    id: "movie",
    question: "Pick a movie for the vibe.",
    options: [
      { emoji: "🤠", label: "Indiana Jones", hint: "adventure", styles: { journey: 2, gameboard: 1 }, theme: "sunrise" },
      { emoji: "🌀", label: "Inception", hint: "layers within layers", styles: { zoom: 2, spider: 1 }, theme: "midnight" },
      { emoji: "🚀", label: "Interstellar", hint: "vast and wondrous", styles: { constellation: 3 }, theme: "midnight" },
      { emoji: "🎲", label: "Jumanji", hint: "playful", styles: { gameboard: 3 }, theme: "forest" },
      { emoji: "🕵️", label: "Sherlock", hint: "connect the clues", styles: { spider: 2, zoom: 1 }, theme: "paper" },
    ],
  },
  {
    id: "colour",
    question: "Pick a colour mood.",
    options: [
      { emoji: "🌙", label: "Midnight & gold", theme: "midnight" },
      { emoji: "📄", label: "Clean paper", theme: "paper" },
      { emoji: "🌅", label: "Sunset glow", theme: "sunrise" },
      { emoji: "🌲", label: "Deep forest", theme: "forest" },
    ],
  },
  {
    id: "pace",
    question: "How should it move?",
    options: [
      { emoji: "⚡", label: "Snappy", hint: "quick cuts", pace: "snappy" },
      { emoji: "🚶", label: "Measured", hint: "steady and clear", pace: "measured" },
      { emoji: "🎬", label: "Cinematic", hint: "slow, sweeping moves", pace: "cinematic", styles: { zoom: 1, constellation: 1 } },
    ],
  },
  {
    id: "room",
    question: "Who's watching?",
    options: [
      { emoji: "👥", label: "My team", styles: { spider: 1, gameboard: 1 } },
      { emoji: "🤝", label: "A client or pitch", styles: { journey: 1, zoom: 1 } },
      { emoji: "🎤", label: "A big room or keynote", styles: { zoom: 1, constellation: 1 } },
      { emoji: "💻", label: "People clicking a link on their own", styles: { journey: 1, gameboard: 1 } },
    ],
  },
];

export interface QuizResult {
  ranking: { style: StyleId; score: number }[];
  theme: ThemeId;
  pace: Pace;
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
  const order: StyleId[] = ["journey", "zoom", "spider", "constellation", "gameboard"];
  const ranking = order
    .map((style) => ({ style, score: scores[style] }))
    .sort((a, b) => b.score - a.score || order.indexOf(a.style) - order.indexOf(b.style));
  return { ranking, theme: colourTheme ?? theme ?? "midnight", pace };
}
