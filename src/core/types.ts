export interface Slide {
  id: string;
  title: string;
  /** Bullet points or short paragraphs, in reading order. */
  points: string[];
  /** Section/group this slide belongs to. Drives Zoom and Spider web layouts. */
  section: string;
  /** Optional picture (data URL), e.g. a rendered PDF page or a PPTX image. */
  image?: string;
  /** Legacy: "full" meant a picture of the old slide. No longer produced. */
  imageFit?: "full" | "side";
  notes?: string;
  /** Layout override. When unset, MapDeck picks one from the content. */
  layout?: SlideLayout;
  /** Doodle override (a doodle name, or "none"). When unset, picked from the words. */
  doodle?: string;
}

export type SlideLayout = "title" | "statement" | "list" | "stat" | "steps" | "compare" | "quote" | "photo";

export interface Deck {
  title: string;
  slides: Slide[];
  /** Slide ids in the order they were imported, so the user can reset. */
  originalOrder: string[];
  /** Section of each slide at import, restored by "reset order". */
  originalSections?: Record<string, string>;
  source: "markdown" | "text" | "pptx" | "pdf" | "sample";
}

export type StyleId = "journey" | "zoom" | "spider" | "constellation" | "gameboard";
/** Ink palette: the wash colours used for sections and accents. */
export type ThemeId = "field" | "harbour" | "orchard" | "graphite";
/** Paper: light sketchbook, dark night paper, or follow the device. */
export type Paper = "auto" | "light" | "dark";
export type Pace = "snappy" | "measured" | "cinematic";

export interface BrandKit {
  /** Logo as a data URL. */
  logo?: string;
  /** Main brand colour; also leads the section colours. */
  primary?: string;
  /** Second brand colour. */
  secondary?: string;
  /** Font family names (Google Fonts). */
  headingFont?: string;
  bodyFont?: string;
}

export interface PresentSettings {
  style: StyleId;
  theme: ThemeId;
  paper?: Paper;
  pace: Pace;
  brand?: BrandKit;
}

/** Everything needed to play a presentation, used by share links and exports. */
export interface Presentation {
  deck: Deck;
  settings: PresentSettings;
}

export const PACE_MS: Record<Pace, number> = {
  snappy: 600,
  measured: 1000,
  cinematic: 1700,
};
