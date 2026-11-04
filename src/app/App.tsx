import { useCallback, useEffect, useState } from "react";
import { readShareHash } from "../core/share";
import type { Presentation } from "../core/types";
import { currentUser, type User } from "./auth";
import { Home } from "./Home";
import { Present } from "./Present";
import { Presenter } from "./Presenter";
import { Quiz } from "./Quiz";
import { Studio } from "./Studio";
import { getPref, saveDeck, setPref } from "./storage";
import { TopBar } from "./TopBar";
import { DEFAULT_LOOK, DEFAULT_THEME, normalizeTheme } from "../player/css";
import "./paper";

/** Older saved decks used theme names that no longer exist. */
function normalize(p: Presentation | null): Presentation | null {
  return p ? { ...p, settings: { ...p.settings, theme: normalizeTheme(p.settings.theme) } } : p;
}

type View = "home" | "quiz" | "studio" | "present";

export const DEFAULT_SETTINGS: Presentation["settings"] = { style: "journey", look: DEFAULT_LOOK, theme: DEFAULT_THEME, paper: "auto", pace: "measured" };

export function App() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => setHash(location.hash);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  if (hash.startsWith("#/presenter")) return <Presenter />;
  const shared = normalize(readShareHash(hash));
  if (shared) return <SharedView pres={shared} />;
  return <Editor />;
}

function SharedView({ pres }: { pres: Presentation }) {
  useEffect(() => {
    document.title = pres.deck.title;
  }, [pres]);
  return (
    <div className="present-full">
      <Present pres={pres} shared onExit={() => (location.hash = "")} />
    </div>
  );
}

function Editor() {
  const [user, setUser] = useState<User | null>(currentUser);
  const owner = user?.email ?? "guest";
  const [view, setView] = useState<View>(() => (getPref<Presentation | null>("current", null) ? "studio" : "home"));
  const [pres, setPres] = useState<Presentation | null>(() => normalize(getPref<Presentation | null>("current", null)));
  const [deckId, setDeckId] = useState<string>(() => getPref("currentId", `d${Date.now().toString(36)}`));
  const [recording, setRecording] = useState<MediaStream | null>(null);

  // Keep the working deck across reloads, and in the user's deck list.
  useEffect(() => {
    if (!pres) return;
    const t = setTimeout(() => {
      setPref("current", pres);
      setPref("currentId", deckId);
      saveDeck(owner, deckId, pres);
    }, 400);
    return () => clearTimeout(t);
  }, [pres, deckId, owner]);

  const startNew = useCallback((p: Presentation, id?: string, skipQuiz = false) => {
    setPres(normalize(p));
    setDeckId(id ?? `d${Date.now().toString(36)}`);
    setView(skipQuiz ? "studio" : "quiz");
  }, []);

  const goHome = () => setView("home");

  return (
    <div className="app">
      {view !== "present" && <TopBar view={view} user={user} onUser={setUser} onHome={goHome} hasDeck={!!pres} onStudio={() => setView("studio")} />}
      {view === "home" && <Home owner={owner} onDeck={startNew} />}
      {view === "quiz" && pres && (
        <Quiz
          pres={pres}
          onDone={(p, present) => {
            setPres(p);
            setView(present ? "present" : "studio");
          }}
          onSkip={() => setView("studio")}
        />
      )}
      {view === "studio" && pres && (
        <Studio
          pres={pres}
          onChange={setPres}
          onPresent={() => setView("present")}
          onRecord={(stream) => {
            setRecording(stream);
            setView("present");
          }}
          onQuiz={() => setView("quiz")}
        />
      )}
      {view === "present" && pres && (
        <div className="present-full">
          <Present
            pres={pres}
            recordStream={recording}
            onStyle={(style) => setPres((p) => (p ? { ...p, settings: { ...p.settings, style } } : p))}
            onExit={() => {
              setRecording(null);
              setView("studio");
            }}
          />
        </div>
      )}
    </div>
  );
}
