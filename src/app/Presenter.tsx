import { useEffect, useMemo, useRef, useState } from "react";
import type { Presentation } from "../core/types";
import { getStyle } from "../styles";
import { Icon } from "./Icon";
import { PlayerView } from "./PlayerView";
import type { Player } from "../player/player";

export const CHANNEL = "mapdeck-presenter";

export type PresenterMsg =
  | { type: "state"; pres: Presentation; index: number }
  | { type: "hello" }
  | { type: "next" }
  | { type: "prev" }
  | { type: "go"; index: number };

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Presenter view: opens in its own window, mirrors the main presentation. */
export function Presenter() {
  const [state, setState] = useState<{ pres: Presentation; index: number } | null>(null);
  const chan = useRef<BroadcastChannel | null>(null);
  const preview = useRef<Player | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const started = useRef(Date.now());
  const paused = useRef(0);
  const pausedAt = useRef(0);

  useEffect(() => {
    document.title = "Presenter view · MapDeck";
    const c = new BroadcastChannel(CHANNEL);
    chan.current = c;
    c.onmessage = (e: MessageEvent<PresenterMsg>) => {
      if (e.data.type === "state") setState({ pres: e.data.pres, index: e.data.index });
    };
    c.postMessage({ type: "hello" } satisfies PresenterMsg);
    return () => c.close();
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date());
      if (running) setElapsed(Date.now() - started.current - paused.current);
    }, 250);
    return () => clearInterval(t);
  }, [running]);

  const send = (m: PresenterMsg) => chan.current?.postMessage(m);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", " ", "PageDown"].includes(e.key)) send({ type: "next" });
      else if (["ArrowLeft", "PageUp"].includes(e.key)) send({ type: "prev" });
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const steps = useMemo(() => (state ? getStyle(state.pres.settings.style).layout(state.pres.deck).steps : []), [state?.pres]);
  useEffect(() => {
    if (state && preview.current) preview.current.go(state.index);
  }, [state?.index]);

  if (!state) {
    return (
      <main className="presenter waiting">
        <h2>Presenter view</h2>
        <p>Waiting for the presentation… Start presenting in the other window.</p>
      </main>
    );
  }

  const step = steps[state.index];
  const slides = state.pres.deck.slides;
  const slide = step?.slideId ? slides.find((s) => s.id === step.slideId) : undefined;
  const nextStep = steps.slice(state.index + 1).find((s) => s.slideId);
  const next = nextStep ? slides.find((s) => s.id === nextStep.slideId) : undefined;

  const toggle = () => {
    if (running) {
      pausedAt.current = Date.now();
      setRunning(false);
    } else {
      paused.current += Date.now() - pausedAt.current;
      setRunning(true);
    }
  };

  return (
    <main className="presenter">
      <section className="pv-now">
        <div className="pv-preview">
          <PlayerView pres={state.pres} onReady={(p) => { preview.current = p; p.go(state.index); }} options={{ controls: false, minimap: true }} />
        </div>
        <div className="pv-controls">
          <button className="btn ghost" onClick={() => send({ type: "prev" })}><Icon name="chevron-left" /> Back</button>
          <span className="mono">Step {state.index + 1} of {steps.length}</span>
          <button className="btn" onClick={() => send({ type: "next" })}>Next <Icon name="chevron-right" /></button>
        </div>
      </section>
      <aside className="pv-side">
        <div className="pv-timer">
          <div>
            <span className="mono">Elapsed</span>
            <strong>{fmt(elapsed)}</strong>
          </div>
          <div>
            <span className="mono">Clock</span>
            <strong>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
          </div>
          <div className="row">
            <button className="btn ghost small" onClick={toggle}>{running ? "Pause" : "Resume"}</button>
            <button className="btn ghost small" onClick={() => { started.current = Date.now(); paused.current = 0; setElapsed(0); }}>Reset</button>
          </div>
        </div>
        <div className="pv-notes">
          <span className="mono">{slide ? `Now: ${slide.title}` : step?.label ?? "Overview"}</span>
          <p>{slide?.notes || (slide ? slide.points.join(" · ") || "No notes for this slide." : "Overview of the whole map.")}</p>
        </div>
        <div className="pv-next">
          <span className="mono">Up next</span>
          <strong>{next?.title ?? "The end"}</strong>
        </div>
      </aside>
    </main>
  );
}
