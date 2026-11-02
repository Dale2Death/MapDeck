import { useEffect, useRef } from "react";
import type { Presentation } from "../core/types";
import { Player, type PlayerOptions } from "../player/player";

interface Props {
  pres: Presentation;
  options?: PlayerOptions;
  onReady?: (p: Player) => void;
  className?: string;
}

/** React wrapper around the Player. Later prop changes morph in place. */
export function PlayerView({ pres, options, onReady, className }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<Player | null>(null);
  const opts = useRef(options);
  opts.current = options;

  useEffect(() => {
    const p = new Player(host.current!, pres, {
      ...options,
      onStep: (...a) => opts.current?.onStep?.(...a),
      onStyle: (s) => opts.current?.onStyle?.(s),
      onExit: options?.onExit ? () => opts.current?.onExit?.() : undefined,
    });
    player.current = p;
    onReady?.(p);
    return () => {
      p.destroy();
      player.current = null;
    };
    // The player is created once; updates go through update() below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    player.current?.update(pres);
  }, [pres]);

  return <div ref={host} className={className} style={{ width: "100%", height: "100%" }} />;
}
