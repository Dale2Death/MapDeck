import type { Presentation } from "../core/types";

export interface SavedDeck {
  id: string;
  savedAt: number;
  pres: Presentation;
}

const KEY = (owner: string) => `mapdeck:decks:${owner}`;

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Decks are kept in this browser, per signed-in user (or "guest"). */
export function listDecks(owner: string): SavedDeck[] {
  return read<SavedDeck[]>(KEY(owner), []).sort((a, b) => b.savedAt - a.savedAt);
}

export function saveDeck(owner: string, id: string, pres: Presentation): { ok: boolean; withoutImages: boolean } {
  const others = listDecks(owner).filter((d) => d.id !== id);
  const entry: SavedDeck = { id, savedAt: Date.now(), pres };
  if (write(KEY(owner), [entry, ...others].slice(0, 20))) return { ok: true, withoutImages: false };
  // Browser storage is small; retry without images.
  const lite: Presentation = { ...pres, deck: { ...pres.deck, slides: pres.deck.slides.map(({ image, imageFit, ...s }) => s) } };
  const ok = write(KEY(owner), [{ ...entry, pres: lite }, ...others].slice(0, 20));
  return { ok, withoutImages: ok };
}

export function deleteDeck(owner: string, id: string) {
  write(KEY(owner), listDecks(owner).filter((d) => d.id !== id));
}

export function getPref<T>(key: string, fallback: T): T {
  return read(`mapdeck:pref:${key}`, fallback);
}
export function setPref(key: string, value: unknown) {
  write(`mapdeck:pref:${key}`, value);
}
