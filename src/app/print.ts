import type { Presentation } from "../core/types";
import { cardClass, cardHtml } from "../player/card";
import { Player } from "../player/player";

/**
 * Print / save as PDF: page 1 is the full map in the chosen style, then one
 * page per slide. Uses the browser's print dialog ("Save as PDF").
 */
export async function printPresentation(pres: Presentation) {
  const root = document.getElementById("print-root")!;
  root.innerHTML = "";
  const { theme, style } = pres.settings;

  const mapPage = document.createElement("div");
  mapPage.className = "print-page";
  root.appendChild(mapPage);
  const player = new Player(mapPage, pres, { controls: false, minimap: false });
  player.overview(true);

  const sections = [...new Set(pres.deck.slides.map((s) => s.section))];
  pres.deck.slides.forEach((s, i) => {
    const page = document.createElement("div");
    page.className = "print-page mdp";
    page.dataset.theme = theme;
    page.dataset.style = style;
    const card = document.createElement("div");
    card.className = cardClass(s) + " print-card";
    card.style.setProperty("--sec", `var(--c${sections.indexOf(s.section) % 5})`);
    card.innerHTML = cardHtml(s, i + 1, pres.settings.brand?.logo);
    page.appendChild(card);
    if (s.notes) {
      const n = document.createElement("div");
      n.className = "print-notes";
      n.textContent = s.notes;
      page.appendChild(n);
    }
    root.appendChild(page);
  });

  await document.fonts?.ready;
  await new Promise((r) => setTimeout(r, 400));
  const done = () => {
    player.destroy();
    root.innerHTML = "";
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  window.print();
}
