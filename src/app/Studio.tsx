import { useRef, useState } from "react";
import { isOriginalOrder, moveSlide, newId, resetOrder } from "../core/deck";
import { download, exportHtml, safeFileName } from "../core/export";
import { shareLink } from "../core/share";
import type { BrandKit, Pace, Presentation, Slide } from "../core/types";
import { THEMES } from "../player/css";
import type { Player } from "../player/player";
import { STYLES } from "../styles";
import { PlayerView } from "./PlayerView";
import { printPresentation } from "./print";
import { requestTabCapture } from "./record";

interface Props {
  pres: Presentation;
  onChange: (p: Presentation) => void;
  onPresent: () => void;
  onRecord: (stream: MediaStream) => void;
  onQuiz: () => void;
}

const FONTS = ["", "Inter", "Space Grotesk", "Fraunces", "Poppins", "Montserrat", "Playfair Display", "DM Sans", "Lora", "Bebas Neue", "Nunito"];

export function Studio({ pres, onChange, onPresent, onRecord, onQuiz }: Props) {
  const { deck, settings } = pres;
  const player = useRef<Player | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<"look" | "brand" | "share">("look");

  const setDeck = (d: Presentation["deck"]) => onChange({ ...pres, deck: d });
  const setSettings = (s: Partial<Presentation["settings"]>) => onChange({ ...pres, settings: { ...settings, ...s } });
  const setBrand = (b: Partial<BrandKit>) => setSettings({ brand: { ...settings.brand, ...b } });
  const updateSlide = (id: string, patch: Partial<Slide>) =>
    setDeck({ ...deck, slides: deck.slides.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const sections = [...new Set(deck.slides.map((s) => s.section))];

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice((n) => (n === msg ? null : n)), 4000);
  };

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= deck.slides.length) return;
    setDeck(moveSlide(deck, from, to));
  };

  const doShare = async () => {
    const { url, droppedImages } = shareLink(pres);
    try {
      await navigator.clipboard.writeText(url);
      flash(droppedImages ? "Link copied. Images were left out to keep it short; use HTML export to keep them." : "Share link copied to your clipboard.");
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  const doRecord = async () => {
    try {
      const stream = await requestTabCapture();
      onRecord(stream);
    } catch {
      flash("Recording needs permission to capture this tab.");
    }
  };

  return (
    <main className="studio">
      <aside className="slides-panel">
        <div className="panel-head">
          <input className="deck-title" value={deck.title} onChange={(e) => setDeck({ ...deck, title: e.target.value })} aria-label="Deck title" />
          <div className="row small muted">
            {deck.slides.length} slides
            {!isOriginalOrder(deck) && (
              <button className="link small" onClick={() => setDeck(resetOrder(deck))}>
                ↺ Reset to original order
              </button>
            )}
          </div>
        </div>
        <datalist id="sections">
          {sections.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <ol className="slide-list">
          {deck.slides.map((s, i) => (
            <li
              key={s.id}
              className={`slide-item ${dropAt === i && dragFrom !== null && dragFrom !== i ? (dragFrom > i ? "drop-before" : "drop-after") : ""} ${dragFrom === i ? "dragging" : ""}`}
              draggable
              onDragStart={(e) => {
                setDragFrom(i);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDropAt(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragFrom !== null) move(dragFrom, i);
                setDragFrom(null);
                setDropAt(null);
              }}
              onDragEnd={() => {
                setDragFrom(null);
                setDropAt(null);
              }}
            >
              <div className="slide-row" onClick={() => player.current?.goToSlide(s.id)}>
                <span className="grip" title="Drag to reorder">⋮⋮</span>
                <span className="num" style={{ background: `var(--c${sections.indexOf(s.section) % 5})` }}>{i + 1}</span>
                <div className="slide-meta">
                  <strong>{s.title || "Untitled"}</strong>
                  <span className="muted small">{s.section}</span>
                </div>
                <div className="slide-actions">
                  <button title="Move up" onClick={(e) => { e.stopPropagation(); move(i, i - 1); }} disabled={i === 0}>↑</button>
                  <button title="Move down" onClick={(e) => { e.stopPropagation(); move(i, i + 1); }} disabled={i === deck.slides.length - 1}>↓</button>
                  <button title="Edit" onClick={(e) => { e.stopPropagation(); setOpen(open === s.id ? null : s.id); }}>✎</button>
                </div>
              </div>
              {open === s.id && (
                <div className="slide-edit">
                  <label>
                    Title
                    <input value={s.title} onChange={(e) => updateSlide(s.id, { title: e.target.value })} />
                  </label>
                  <label>
                    Section / branch
                    <input list="sections" value={s.section} onChange={(e) => updateSlide(s.id, { section: e.target.value })} />
                  </label>
                  <label>
                    Points (one per line)
                    <textarea rows={4} value={s.points.join("\n")} onChange={(e) => updateSlide(s.id, { points: e.target.value.split("\n") })} onBlur={(e) => updateSlide(s.id, { points: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })} />
                  </label>
                  <label>
                    Speaker notes
                    <textarea rows={3} value={s.notes ?? ""} onChange={(e) => updateSlide(s.id, { notes: e.target.value })} />
                  </label>
                  <div className="row between">
                    <button
                      className="link small"
                      onClick={() => {
                        const copy = { ...s, id: newId(), title: s.title + " (copy)" };
                        const slides = deck.slides.slice();
                        slides.splice(i + 1, 0, copy);
                        setDeck({ ...deck, slides });
                      }}
                    >
                      Duplicate
                    </button>
                    <button className="link small danger" disabled={deck.slides.length < 2} onClick={() => setDeck({ ...deck, slides: deck.slides.filter((x) => x.id !== s.id) })}>
                      Delete slide
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
        <button
          className="btn ghost small add-slide"
          onClick={() => {
            const last = deck.slides[deck.slides.length - 1];
            const s: Slide = { id: newId(), title: "New slide", points: [], section: last?.section ?? "Main" };
            setDeck({ ...deck, slides: [...deck.slides, s] });
            setOpen(s.id);
          }}
        >
          + Add slide
        </button>
      </aside>

      <section className="preview">
        <PlayerView pres={pres} onReady={(p) => (player.current = p)} options={{ controls: true, minimap: true, onStyle: (style) => setSettings({ style }) }} />
        {notice && <div className="notice">{notice}</div>}
      </section>

      <aside className="settings-panel">
        <button className="btn present-btn" onClick={onPresent}>
          ▶ Present
        </button>
        <div className="tabs" role="tablist">
          {(["look", "brand", "share"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
              {t === "look" ? "Style" : t === "brand" ? "Brand kit" : "Share & export"}
            </button>
          ))}
        </div>

        {tab === "look" && (
          <>
            <h3>Style</h3>
            <div className="style-picks">
              {STYLES.map((s) => (
                <button key={s.id} className={`style-pick ${settings.style === s.id ? "on" : ""}`} onClick={() => setSettings({ style: s.id })}>
                  <span className="emoji">{s.emoji}</span>
                  <span>
                    <strong>{s.name}</strong>
                    <small>{s.tagline}</small>
                  </span>
                </button>
              ))}
            </div>
            <button className="link small" onClick={onQuiz}>
              Not sure? Take the vibe quiz
            </button>
            <h3>Theme</h3>
            <div className="themes">
              {THEMES.map((t) => (
                <button key={t.id} className={`theme ${settings.theme === t.id ? "on" : ""}`} onClick={() => setSettings({ theme: t.id })} title={t.name}>
                  <span className="sw">
                    {t.swatch.map((c) => (
                      <i key={c} style={{ background: c }} />
                    ))}
                  </span>
                  {t.name}
                </button>
              ))}
            </div>
            <h3>Pace</h3>
            <div className="seg">
              {(["snappy", "measured", "cinematic"] as Pace[]).map((p) => (
                <button key={p} className={settings.pace === p ? "on" : ""} onClick={() => setSettings({ pace: p })}>
                  {p}
                </button>
              ))}
            </div>
          </>
        )}

        {tab === "brand" && (
          <div className="brand-kit">
            <h3>Logo</h3>
            <div className="row">
              {settings.brand?.logo && <img className="logo-preview" src={settings.brand.logo} alt="Logo" />}
              <label className="btn ghost small">
                {settings.brand?.logo ? "Change" : "Upload logo"}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = () => setBrand({ logo: String(r.result) });
                    r.readAsDataURL(f);
                  }}
                />
              </label>
              {settings.brand?.logo && (
                <button className="link small" onClick={() => setBrand({ logo: undefined })}>
                  Remove
                </button>
              )}
            </div>
            <h3>Colours</h3>
            <div className="row">
              <label className="color">
                <input type="color" value={settings.brand?.primary ?? "#f5b942"} onChange={(e) => setBrand({ primary: e.target.value })} />
                Primary
              </label>
              <label className="color">
                <input type="color" value={settings.brand?.secondary ?? "#5ad1c9"} onChange={(e) => setBrand({ secondary: e.target.value })} />
                Secondary
              </label>
            </div>
            <h3>Fonts</h3>
            <label>
              Headings
              <select value={settings.brand?.headingFont ?? ""} onChange={(e) => setBrand({ headingFont: e.target.value || undefined })}>
                {FONTS.map((f) => (
                  <option key={f} value={f}>{f || "Theme default"}</option>
                ))}
              </select>
            </label>
            <label>
              Body
              <select value={settings.brand?.bodyFont ?? ""} onChange={(e) => setBrand({ bodyFont: e.target.value || undefined })}>
                {FONTS.map((f) => (
                  <option key={f} value={f}>{f || "Theme default"}</option>
                ))}
              </select>
            </label>
            <button className="link small" onClick={() => setSettings({ brand: undefined })}>
              Clear brand kit
            </button>
          </div>
        )}

        {tab === "share" && (
          <div className="share">
            <button className="btn ghost" onClick={doShare}>🔗 Copy share link</button>
            <p className="muted small">The whole presentation lives in the link. No account needed to view it.</p>
            <button className="btn ghost" onClick={() => download(`${safeFileName(deck.title)}.html`, exportHtml(pres))}>⬇ Download HTML</button>
            <p className="muted small">One file that plays offline, with images.</p>
            <button className="btn ghost" onClick={() => printPresentation(pres)}>🖨 Print / save as PDF</button>
            <p className="muted small">Page 1 is the full map, then one page per slide with notes.</p>
            <button className="btn ghost" onClick={doRecord}>⏺ Record video</button>
            <p className="muted small">Plays hands-free and records this tab. Choose "This tab" when asked.</p>
          </div>
        )}
      </aside>
    </main>
  );
}
