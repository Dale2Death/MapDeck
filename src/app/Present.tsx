import { useEffect, useRef, useState } from "react";
import { download, safeFileName } from "../core/export";
import type { Presentation, StyleId } from "../core/types";
import type { Player } from "../player/player";
import { PlayerView } from "./PlayerView";
import { recordPlayback } from "./record";
import { CHANNEL, type PresenterMsg } from "./Presenter";

interface Props {
  pres: Presentation;
  shared?: boolean;
  recordStream?: MediaStream | null;
  onStyle?: (s: StyleId) => void;
  onExit: () => void;
}

/** Full-window presenting, with a presenter-view link over BroadcastChannel. */
export function Present({ pres, shared, recordStream, onStyle, onExit }: Props) {
  const player = useRef<Player | null>(null);
  const live = useRef(pres);
  const chan = useRef<BroadcastChannel | null>(null);
  const [rec, setRec] = useState<"idle" | "recording">("idle");

  const broadcast = () => {
    const p = player.current;
    if (!p || !chan.current) return;
    const msg: PresenterMsg = {
      type: "state",
      pres: { ...live.current, settings: { ...live.current.settings, style: p.style } },
      index: p.stepIndex,
    };
    chan.current.postMessage(msg);
  };

  useEffect(() => {
    live.current = pres;
    broadcast();
  }, [pres]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const c = new BroadcastChannel(CHANNEL);
    chan.current = c;
    c.onmessage = (e: MessageEvent<PresenterMsg>) => {
      const m = e.data;
      const p = player.current;
      if (!p) return;
      if (m.type === "hello") broadcast();
      else if (m.type === "next") p.next();
      else if (m.type === "prev") p.prev();
      else if (m.type === "go") p.go(m.index);
    };
    return () => c.close();
  }, []);

  useEffect(() => {
    if (!recordStream || !player.current) return;
    setRec("recording");
    const p = player.current;
    const stepMs = { snappy: 3500, measured: 4500, cinematic: 6000 }[pres.settings.pace];
    recordPlayback(p, recordStream, stepMs)
      .then((blob) => download(`${safeFileName(pres.deck.title)}.${blob.type.includes("mp4") ? "mp4" : "webm"}`, blob))
      .finally(() => {
        setRec("idle");
        onExit();
      });
    // Start once per stream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordStream, player.current]);

  const [, force] = useState(0);
  const openPresenter = () => window.open(`${location.pathname}${location.search}#/presenter`, "mapdeck-presenter", "width=1100,height=720");

  return (
    <>
      <PlayerView
        pres={pres}
        onReady={(p) => {
          player.current = p;
          force((n) => n + 1);
        }}
        options={{
          controls: rec === "idle",
          minimap: !recordStream,
          keyboard: true,
          onStep: () => broadcast(),
          onStyle: (s) => {
            onStyle?.(s);
            broadcast();
          },
          onExit,
          extraButtons: shared
            ? [{ label: "Make your own", title: "Open MapDeck", onClick: () => (location.href = location.pathname) }]
            : [{ label: "🗒", title: "Presenter view (notes + timer)", onClick: openPresenter }],
        }}
      />
      {rec === "recording" && <div className="rec-badge">● Recording… press Stop sharing to end early</div>}
    </>
  );
}
