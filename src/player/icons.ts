import ui from "../generated/ui-icons.json";

const ICONS = ui as Record<string, string>;

/** A crisp interface icon (Tabler, MIT) that follows the text colour. */
export function icon(name: string, size = 18): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] ?? ""}</svg>`;
}
