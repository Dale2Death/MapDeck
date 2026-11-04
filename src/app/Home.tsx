import { useEffect, useMemo, useRef, useState } from "react";
import type { Presentation, StyleId } from "../core/types";
import { ACCEPT, importFile, importText } from "../import";
import type { Player } from "../player/player";
import { STYLES } from "../styles";
import { DEFAULT_SETTINGS } from "./App";
import { Icon } from "./Icon";
import { usePaper } from "./paper";
import { PlayerView } from "./PlayerView";
import { SAMPLE_MD } from "./sample";
import { Underline } from "./Sketch";
import { deleteDeck, listDecks } from "./storage";

interface Props {
  owner: string;
  onDeck: (p: Presentation, id?: string, skipQuiz?: boolean) => void;
}

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** The sample deck flying itself, cycling through the styles. */
function Demo({ style, onStyle }: { style: StyleId; onStyle: (s: StyleId) => void }) {
  const paper = usePaper().resolved;
  const deck = useMemo(() => {
    const d = importText(SAMPLE_MD);
    return { ...d, slides: d.slides.slice(0, 7) };
  }, []);
  const pres = useMemo<Presentation>(() => ({ deck, settings: { ...DEFAULT_SETTINGS, style, paper } }), [deck, style, paper]);
  const player = useRef<Player | null>(null);
  const styleRef = useRef(style);
  styleRef.current = style;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const p = player.current;
    if (!ready || !p || reducedMotion()) return;
    let alive = true;
    const loop = async () => {
      while (alive) {
        await p.autoplay(2600);
        if (!alive) return;
        const i = STYLES.findIndex((s) => s.id === styleRef.current);
        onStyle(STYLES[(i + 1) % STYLES.length].id);
        await new Promise((r) => setTimeout(r, 1400));
        if (alive) p.go(0);
      }
    };
    loop();
    return () => {
      alive = false;
      p.autoplay(0);
    };
    // onStyle is a state setter; the loop runs once per player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <div className="demo-wrap">
      <div className="demo">
        <PlayerView
          pres={pres}
          options={{ controls: false, minimap: false }}
          onReady={(p) => {
            player.current = p;
            setReady(true);
          }}
        />
      </div>
      <div className="demo-styles" role="group" aria-label="Demo style">
        {STYLES.map((s) => (
          <button key={s.id} className={s.id === style ? "on" : ""} title={s.name} onClick={() => onStyle(s.id)}>
            <Icon name={s.icon} size={16} />
          </button>
        ))}
      </div>
      <span className="demo-tag">same deck, five maps</span>
    </div>
  );
}

export function Home({ owner, onDeck }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [drag, setDrag] = useState(false);
  const [decks, setDecks] = useState(() => listDecks(owner));
  const [demoStyle, setDemoStyle] = useState<StyleId>("journey");
  const input = useRef<HTMLInputElement>(null);
  const start = useRef<HTMLDivElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setBusy(`Reading ${file.name}…`);
    try {
      const deck = await importFile(file, (p) => setBusy(`Reading ${file.name}… ${Math.round(p * 100)}%`));
      if (!deck.slides.length) throw new Error("We couldn't find any slides or text in that file.");
      onDeck({ deck, settings: DEFAULT_SETTINGS });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const fromText = (t: string, source: "sample" | "text" = "text") => {
    const deck = importText(t);
    if (!deck.slides.length) {
      setError("Add some text first.");
      return;
    }
    onDeck({ deck: { ...deck, source: source === "sample" ? "sample" : deck.source }, settings: DEFAULT_SETTINGS });
  };

  return (
    <main className="home">
      <section className="hero">
        <div>
          <span className="mono">Content in · design out</span>
          <h1>
            Turn any deck into a{" "}
            <em>
              journey
              <Underline />
            </em>
            .
          </h1>
          <p className="lede">
            Bring the words from a PowerPoint, a PDF or your notes. MapDeck sets the old slide design aside, draws every
            slide fresh, and lays them out as a map you fly through.
          </p>
          <div className="row">
            <button className="btn" onClick={() => start.current?.scrollIntoView({ behavior: "smooth" })}>
              <Icon name="upload" /> Bring a deck
            </button>
            <button className="btn ghost" onClick={() => fromText(SAMPLE_MD, "sample")}>
              Try the sample
            </button>
          </div>
        </div>
        <Demo style={demoStyle} onStyle={setDemoStyle} />
      </section>

      <section className="principle">
        <p className="big">You bring the content. We do the design.</p>
        <p>
          Each slide is laid out from what it says. Numbers become big stats, steps become a path, comparisons sit side by
          side and quotes get room to breathe. Long slides are split so nothing
          gets crammed.
        </p>
      </section>

      <div className="section-head" ref={start}>
        <h2>Start a map</h2>
        <span className="mono">Step 1 of 3</span>
      </div>
      <section className="import-grid">
        <div
          className={`drop ${drag ? "is-over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          onClick={() => input.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        >
          <div className="drop-icon">
            <Icon name="upload" size={24} />
          </div>
          <strong>{busy ?? "Drop a file, or click to choose"}</strong>
          <div className="formats">
            <span className="tag">pptx</span>
            <span className="tag">pdf</span>
            <span className="tag">md</span>
            <span className="tag">txt</span>
          </div>
          <span className="muted small">Google Slides: File → Download → Microsoft PowerPoint, then drop it here.</span>
          <input
            ref={input}
            type="file"
            accept={ACCEPT}
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </div>
        <div className="paste">
          <label htmlFor="paste">Or paste your notes</label>
          <textarea
            id="paste"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"# My talk\n\n## First idea\n- a point\n- another point\n\n## Second idea\n…"}
          />
          <div className="row">
            <button className="btn" onClick={() => fromText(text)} disabled={!text.trim()}>
              <Icon name="map" /> Map it
            </button>
            <span className="muted small">Headings become slides, bullets become points.</span>
          </div>
        </div>
      </section>
      {error && <p className="error">{error}</p>}

      {decks.length > 0 && (
        <section className="my-decks">
          <div className="section-head">
            <h2>Your decks</h2>
            <span className="mono">Saved in this browser</span>
          </div>
          <ul>
            {decks.map((d) => (
              <li key={d.id}>
                <button className="deck-tile" onClick={() => onDeck(d.pres, d.id, true)}>
                  <span className="mono">
                    {STYLES.find((s) => s.id === d.pres.settings.style)?.name} · {d.pres.deck.slides.length} slides
                  </span>
                  <strong>{d.pres.deck.title}</strong>
                  <span className="muted small">{new Date(d.savedAt).toLocaleDateString()}</span>
                </button>
                <button
                  className="link small"
                  title="Remove from this browser"
                  onClick={() => {
                    deleteDeck(owner, d.id);
                    setDecks(listDecks(owner));
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="section-head">
        <h2>Five ways to travel</h2>
        <span className="mono">Switch any time, even mid-talk</span>
      </div>
      <section className="styles-strip">
        {STYLES.map((s) => (
          <button
            key={s.id}
            className={`style-tile ${demoStyle === s.id ? "on" : ""}`}
            onClick={() => {
              setDemoStyle(s.id);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <Icon name={s.icon} size={22} />
            <strong>{s.name}</strong>
            <span>{s.tagline}</span>
          </button>
        ))}
      </section>
    </main>
  );
}
