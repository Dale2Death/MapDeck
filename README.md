# MapDeck

Turn an existing deck or document into a presentation you fly through like a map.

Drop in a PowerPoint, PDF, Markdown or plain text. MapDeck lays the content out in one
of five styles and moves a camera from slide to slide, so the audience always sees
where they are in the bigger picture.

| Style | What it looks like |
| --- | --- |
| 🧭 **Journey** | Slides are billboards along a winding road. A pin travels the road; signposts mark each section. |
| 🔭 **Zoom in / out** | One big canvas. Sections are frames; the camera dives into a section, then each slide, and pulls back out. |
| 🕸️ **Spider web** | The opening slide is the hub. Sections are branch nodes on a web, and their slides fan out around them. |
| ✨ **Constellation** | A night sky. Each section is a constellation and each slide a star. |
| 🎲 **Game board** | Slides are squares on a snaking board game track. A pawn hops square to square. |

## Features

- **Import**: `.pptx` (titles, bullets, tables, first picture, speaker notes, PowerPoint sections),
  `.pdf` (one slide per page with a picture of the page, title from the largest text),
  Markdown (`#` = section, `##` = slide, or `---` slide breaks) and plain text.
  Google Slides: *File → Download → Microsoft PowerPoint*, then import the file.
- **Vibe quiz**: five multiple-choice questions (story shape, movie, colour mood, pace, audience)
  recommend a style, theme and pace, with a live preview of your deck.
- **Live remix**: switch style mid-presentation (number keys 1–5 or the Remix buttons). Every slide
  morphs to its new spot and the camera stays on the current slide.
- **Minimap**: overview in the corner showing where you are. Click it to jump.
- **Studio**: reorder slides by drag and drop or arrows (original order is kept by default, with a
  one-click reset), edit titles, sections, points and notes, pick theme and pace.
- **Brand kit**: logo, primary and secondary colours, heading and body fonts (Google Fonts).
- **Presenter view**: second window with speaker notes, up-next, elapsed timer and clock. It drives
  the main window.
- **Share & export**:
  - Share link: the whole presentation is compressed into the link, so it works without a server.
    Images are left out if they would make the link too long.
  - HTML: one self-contained file that plays offline, images included.
  - PDF: print view with the full map on page 1 and one page per slide (with notes).
  - Video: plays hands-free and records the tab (WebM/MP4, browser permitting).
- **Google sign-in**: set `VITE_GOOGLE_CLIENT_ID` (see `.env.example`). Decks are saved in the
  browser, per user.

## Keyboard

| Key | Action |
| --- | --- |
| → / Space / Enter | Next |
| ← | Back |
| O | Overview |
| M | Toggle minimap |
| 1–5 | Remix to Journey, Zoom, Spider web, Constellation, Game board |
| F | Full screen |
| Esc | Leave presenting |

Drag to pan and scroll to zoom freely; the next key press flies back on track.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # parser and layout tests
npm run build      # type-check and build to dist/
```

The GitHub Actions workflow tests every push and PR and deploys `main` to GitHub Pages
(enable Pages with source "GitHub Actions" in the repo settings).

### How it fits together

```
src/
  import/    PPTX, PDF, Markdown/text  → Deck (slides with title, points, section, image, notes)
  styles/    one file per style: layout(deck) → card positions, decor SVG, camera steps
  player/    the engine: places cards, flies the camera, remix morphing, minimap, controls
  core/      deck helpers, quiz scoring, share links, HTML export
  app/       React UI: home, quiz, studio, present, presenter view
```

To add a style, write a `StyleDef` in `src/styles/` (see `journey.ts`) and add it to
`STYLES` in `src/styles/index.ts`. The player, remix, minimap, quiz chips and exports pick it up.

The player has no React dependency; `scripts/build-player.mjs` bundles it into the script
that exported HTML files embed.

See [ROADMAP.md](ROADMAP.md) for what's next.
