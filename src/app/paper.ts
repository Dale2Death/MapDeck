import { useSyncExternalStore } from "react";
import type { Paper } from "../core/types";
import { getPref, setPref } from "./storage";

/** The app's own paper (light/dark), separate from each deck's setting. */
let pref: Paper = getPref<Paper>("paper", "auto");
const listeners = new Set<() => void>();
const mq = typeof window !== "undefined" ? window.matchMedia?.("(prefers-color-scheme: dark)") : undefined;

function system(): "light" | "dark" {
  return mq?.matches ? "dark" : "light";
}

function apply() {
  const root = document.documentElement;
  if (pref === "auto") delete root.dataset.paper;
  else root.dataset.paper = pref;
  listeners.forEach((l) => l());
}

mq?.addEventListener?.("change", apply);
if (typeof document !== "undefined") apply();

export function resolvedPaper(): "light" | "dark" {
  return pref === "auto" ? system() : pref;
}

/** Flip to the other paper. Landing back on the device's choice returns to "auto". */
export function togglePaper() {
  const next = resolvedPaper() === "dark" ? "light" : "dark";
  pref = next === system() ? "auto" : next;
  setPref("paper", pref);
  apply();
}

export function usePaper(): { pref: Paper; resolved: "light" | "dark" } {
  const resolved = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => `${pref}:${resolvedPaper()}`,
  );
  const [p, r] = resolved.split(":") as [Paper, "light" | "dark"];
  return { pref: p, resolved: r };
}
