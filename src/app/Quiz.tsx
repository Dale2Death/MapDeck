import { useMemo, useState } from "react";
import { QUIZ, interpretVibe, scoreQuiz, type QuizResult } from "../core/quiz";
import type { Presentation, StyleId } from "../core/types";
import { THEMES } from "../player/css";
import { getStyle } from "../styles";
import { Icon } from "./Icon";
import { PlayerView } from "./PlayerView";

interface Props {
  pres: Presentation;
  onDone: (p: Presentation, present: boolean) => void;
  onSkip: () => void;
}

const EXAMPLES = [
  "A road trip from where we are to where we're going, warm and steady",
  "Big picture first, then zoom into the details. Clean and minimal",
  "Dreamy and visionary, like a night sky full of ideas",
  "A playful workshop with levels and milestones, high energy",
  "One core idea with connected themes, like a detective's board",
];

/** Choose the look: answer five quick questions, or describe it in your own words. */
export function Quiz({ pres, onDone, onSkip }: Props) {
  const [mode, setMode] = useState<"questions" | "describe">("questions");
  const [answers, setAnswers] = useState<number[]>([]);
  const [text, setText] = useState("");
  const [described, setDescribed] = useState<QuizResult | null>(null);
  const [picked, setPicked] = useState<StyleId | null>(null);
  const step = answers.length;
  const quizDone = step >= QUIZ.length;
  const result = useMemo(() => described ?? (quizDone ? scoreQuiz(answers) : null), [described, quizDone, answers]);

  const restart = () => {
    setAnswers([]);
    setDescribed(null);
    setPicked(null);
  };

  if (!result) {
    const q = QUIZ[step];
    return (
      <main className="quiz">
        <div className="quiz-card">
          <div className="mode-switch" role="tablist">
            <button role="tab" aria-selected={mode === "questions"} className={mode === "questions" ? "on" : ""} onClick={() => setMode("questions")}>
              <Icon name="list" size={15} /> Answer 5 questions
            </button>
            <button role="tab" aria-selected={mode === "describe"} className={mode === "describe" ? "on" : ""} onClick={() => setMode("describe")}>
              <Icon name="pencil" size={15} /> Describe it
            </button>
          </div>

          {mode === "questions" ? (
            <>
              <div className="quiz-progress">
                {QUIZ.map((_, i) => (
                  <span key={i} className={i < step ? "done" : i === step ? "now" : ""} />
                ))}
              </div>
              <span className="mono">
                Question {step + 1} of {QUIZ.length}
              </span>
              <h2>{q.question}</h2>
              <div className="quiz-options">
                {q.options.map((o, i) => {
                  const sw = q.id === "colour" && o.theme ? THEMES.find((t) => t.id === o.theme)?.swatch : null;
                  return (
                    <button key={o.label} className="quiz-option" onClick={() => setAnswers([...answers, i])}>
                      <span className="letter">{String.fromCharCode(65 + i)}</span>
                      <span>
                        {o.label}
                        {o.hint && <small> · {o.hint}</small>}
                      </span>
                      {sw && (
                        <span className="sw">
                          {sw.map((c) => (
                            <i key={c} style={{ background: c }} />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="row between">
                <button className="link" disabled={!step} onClick={() => setAnswers(answers.slice(0, -1))}>
                  Back
                </button>
                <button className="link" onClick={onSkip}>
                  Skip, I'll pick in the studio
                </button>
              </div>
            </>
          ) : (
            <div className="describe">
              <span className="mono">In your own words</span>
              <h2>Describe the vibe and the journey.</h2>
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What's the story doing, and how should it feel? e.g. a calm road trip through our plan, blue and fresh…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim()) setDescribed(interpretVibe(text));
                }}
              />
              <div className="examples">
                {EXAMPLES.map((x) => (
                  <button key={x} onClick={() => setText(x)}>
                    {x}
                  </button>
                ))}
              </div>
              <div className="row between">
                <button className="btn" disabled={!text.trim()} onClick={() => setDescribed(interpretVibe(text))}>
                  <Icon name="wand" /> Map my vibe
                </button>
                <button className="link" onClick={onSkip}>
                  Skip, I'll pick in the studio
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  const r = result;
  const style = picked ?? r.ranking[0].style;
  const def = getStyle(style);
  const heardStyle = r.matched !== undefined && r.ranking[0].score > 0;
  const next: Presentation = {
    ...pres,
    settings: { ...pres.settings, style, theme: r.theme, pace: r.pace, ...(r.paper ? { paper: r.paper } : {}) },
  };
  return (
    <main className="quiz result">
      <div className="result-text">
        <span className="mono">Your map</span>
        <h2>
          <Icon name={def.icon} size={40} /> {def.name}
        </h2>
        <p className="tagline">{def.tagline}.</p>
        <p className="muted small">
          {THEMES.find((t) => t.id === r.theme)?.name} inks · {r.pace} pace
          {r.paper ? ` · ${r.paper} paper` : ""}
        </p>
        {r.matched && (
          <div className="heard">
            {r.matched.length ? (
              <>
                We heard: <span className="hand">{r.matched.join(", ")}</span>
                {!heardStyle && <>. Nothing pointed to a style, so we started with {def.name}.</>}
              </>
            ) : (
              <>We didn't catch any style words, so we started with {def.name}. Try words like road trip, zoom, network, night sky or game.</>
            )}
          </div>
        )}
        <div className="chips">
          {r.ranking.map((x) => (
            <button key={x.style} className={`chip ${x.style === style ? "on" : ""}`} onClick={() => setPicked(x.style)}>
              <Icon name={getStyle(x.style).icon} size={14} /> {getStyle(x.style).name}
            </button>
          ))}
        </div>
        <div className="row">
          <button className="btn" onClick={() => onDone(next, true)}>
            <Icon name="player-play" /> Present now
          </button>
          <button className="btn ghost" onClick={() => onDone(next, false)}>
            Open the studio
          </button>
        </div>
        <div className="row">
          <button className="link small" onClick={restart}>
            {described ? "Describe it again" : "Retake"}
          </button>
          {!described && (
            <button
              className="link small"
              onClick={() => {
                restart();
                setMode("describe");
              }}
            >
              Describe it instead
            </button>
          )}
        </div>
      </div>
      <div className="result-preview">
        <PlayerView pres={next} options={{ controls: true, minimap: false }} />
      </div>
    </main>
  );
}
