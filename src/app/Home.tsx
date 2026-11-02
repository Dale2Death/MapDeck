import { useRef, useState } from "react";
import type { Presentation } from "../core/types";
import { ACCEPT, importFile, importText } from "../import";
import { STYLES } from "../styles";
import { DEFAULT_SETTINGS } from "./App";
import { SAMPLE_MD } from "./sample";
import { deleteDeck, listDecks } from "./storage";

interface Props {
  owner: string;
  onDeck: (p: Presentation, id?: string, skipQuiz?: boolean) => void;
}

export function Home({ owner, onDeck }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [drag, setDrag] = useState(false);
  const [decks, setDecks] = useState(() => listDecks(owner));
  const input = useRef<HTMLInputElement>(null);

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
        <h1>
          Turn any deck into a <em>journey</em>.
        </h1>
        <p>
          Drop in a PowerPoint, PDF or some notes. MapDeck lays your content out as a map you fly through: a winding road, a
          zoomable canvas, a web of ideas, a night sky or a board game.
        </p>
      </section>

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
          <div className="drop-icon">⬆</div>
          <strong>{busy ?? "Drop a file here, or click to choose"}</strong>
          <span>PowerPoint (.pptx), PDF, Markdown or text</span>
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
          <label htmlFor="paste">Or paste notes / Markdown</label>
          <textarea
            id="paste"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"# My talk\n\n## First idea\n- a point\n- another point\n\n## Second idea\n…"}
          />
          <div className="row">
            <button className="btn" onClick={() => fromText(text)} disabled={!text.trim()}>
              Map it
            </button>
            <button className="btn ghost" onClick={() => fromText(SAMPLE_MD, "sample")}>
              Try a sample deck
            </button>
          </div>
        </div>
      </section>
      {error && <p className="error">{error}</p>}

      {decks.length > 0 && (
        <section className="my-decks">
          <h2>Your decks</h2>
          <ul>
            {decks.map((d) => (
              <li key={d.id}>
                <button className="deck-tile" onClick={() => onDeck(d.pres, d.id, true)}>
                  <span className="emoji">{STYLES.find((s) => s.id === d.pres.settings.style)?.emoji}</span>
                  <strong>{d.pres.deck.title}</strong>
                  <span className="muted small">
                    {d.pres.deck.slides.length} slides · {new Date(d.savedAt).toLocaleDateString()}
                  </span>
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

      <section className="styles-strip">
        {STYLES.map((s) => (
          <div key={s.id} className="style-tile">
            <span className="emoji">{s.emoji}</span>
            <strong>{s.name}</strong>
            <span>{s.tagline}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
