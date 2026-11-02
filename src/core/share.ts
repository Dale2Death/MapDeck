import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type { Presentation } from "./types";

/** Links longer than this drop images so they stay usable. */
const MAX_LINK = 60_000;

export interface ShareResult {
  url: string;
  droppedImages: boolean;
}

/**
 * Share links carry the whole presentation inside the URL (after #), so
 * they work without a server. Big images don't fit, so they're left out.
 */
export function shareLink(pres: Presentation, base = location.href.split("#")[0]): ShareResult {
  let payload = compressToEncodedURIComponent(JSON.stringify(pres));
  let droppedImages = false;
  if (payload.length > MAX_LINK) {
    const lite: Presentation = {
      ...pres,
      settings: { ...pres.settings, brand: pres.settings.brand ? { ...pres.settings.brand, logo: undefined } : undefined },
      deck: { ...pres.deck, slides: pres.deck.slides.map(({ image, imageFit, ...s }) => s) },
    };
    payload = compressToEncodedURIComponent(JSON.stringify(lite));
    droppedImages = true;
  }
  return { url: `${base}#/p/${payload}`, droppedImages };
}

export function readShareHash(hash: string): Presentation | null {
  const m = hash.match(/^#\/p\/(.+)$/);
  if (!m) return null;
  try {
    const json = decompressFromEncodedURIComponent(m[1]);
    const pres = json ? (JSON.parse(json) as Presentation) : null;
    return pres?.deck?.slides ? pres : null;
  } catch {
    return null;
  }
}
