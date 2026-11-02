import { useMemo, useState } from "react";
import { QUIZ, scoreQuiz } from "../core/quiz";
import type { Presentation, StyleId } from "../core/types";
import { THEMES } from "../player/css";
import { getStyle } from "../styles";
import { PlayerView } from "./PlayerView";

interface Props {
  pres: Presentation;
  onDone: (p: Presentation, present: boolean) => void;
  onSkip: () => void;
}

/** The vibe quiz: one multiple-choice question at a time, then a live preview. */
export function Quiz({ pres, onDone, onSkip }: Props) {
  const [answers, setAnswers] = useState<number[]>([]);
  const [picked, setPicked] = useState<StyleId | null>(null);
  const step = answers.length;
  const done = step >= QUIZ.length;
  const result = useMemo(() => (done ? scoreQuiz(answers) : null), [done, answers]);

  if (!done) {
    const q = QUIZ[step];
    return (
      <main className="quiz">
        <div className="quiz-card">
          <div className="quiz-progress">
            {QUIZ.map((_, i) => (
              <span key={i} className={i < step ? "done" : i === step ? "now" : ""} />
            ))}
          </div>
          <p className="muted small">
            Vibe quiz · {step + 1} of {QUIZ.length}
          </p>
          <h2>{q.question}</h2>
          <div className="quiz-options">
            {q.options.map((o, i) => (
              <button key={o.label} className="quiz-option" onClick={() => setAnswers([...answers, i])}>
                <span className="letter">{String.fromCharCode(65 + i)}</span>
                <span className="emoji">{o.emoji}</span>
                <span>
                  {o.label}
                  {o.hint && <small> · {o.hint}</small>}
                </span>
              </button>
            ))}
          </div>
          <div className="row between">
            <button className="link" disabled={!step} onClick={() => setAnswers(answers.slice(0, -1))}>
              ← Back
            </button>
            <button className="link" onClick={onSkip}>
              Skip the quiz
            </button>
          </div>
        </div>
      </main>
    );
  }

  const r = result!;
  const style = picked ?? r.ranking[0].style;
  const def = getStyle(style);
  const next: Presentation = { ...pres, settings: { ...pres.settings, style, theme: r.theme, pace: r.pace } };
  return (
    <main className="quiz result">
      <div className="result-text">
        <p className="muted small">Your match</p>
        <h2>
          {def.emoji} {def.name}
        </h2>
        <p>{def.tagline}.</p>
        <p className="muted small">
          Theme: {THEMES.find((t) => t.id === r.theme)?.name} · Pace: {r.pace}
        </p>
        <div className="chips">
          {r.ranking.map((x) => (
            <button key={x.style} className={`chip ${x.style === style ? "on" : ""}`} onClick={() => setPicked(x.style)}>
              {getStyle(x.style).emoji} {getStyle(x.style).name}
            </button>
          ))}
        </div>
        <div className="row">
          <button className="btn" onClick={() => onDone(next, true)}>
            Present now
          </button>
          <button className="btn ghost" onClick={() => onDone(next, false)}>
            Open the studio
          </button>
          <button className="link" onClick={() => { setAnswers([]); setPicked(null); }}>
            Retake
          </button>
        </div>
      </div>
      <div className="result-preview">
        <PlayerView pres={next} options={{ controls: true, minimap: false }} />
      </div>
    </main>
  );
}
