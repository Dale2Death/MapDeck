import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { makeDeck, newId } from "../core/deck";
import type { Deck, Slide } from "../core/types";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface Line {
  text: string;
  size: number;
  y: number;
}

/**
 * Each PDF page becomes one slide. The largest text on the page is the
 * title, the rest becomes points, and a picture of the page is kept so
 * charts and visuals survive.
 */
export async function parsePdf(data: ArrayBuffer, fallbackTitle = "Untitled", onProgress?: (p: number) => void): Promise<Deck> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  const slides: Slide[] = [];
  const pages = Math.min(doc.numPages, 80);
  for (let n = 1; n <= pages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    const lines: Line[] = [];
    for (const item of content.items as any[]) {
      if (!("str" in item) || !item.str.trim()) continue;
      const size = Math.hypot(item.transform[2], item.transform[3]);
      const y = Math.round(item.transform[5]);
      const prev = lines[lines.length - 1];
      if (prev && Math.abs(prev.y - y) < size * 0.5) {
        prev.text += (prev.text.endsWith(" ") || item.str.startsWith(" ") ? "" : " ") + item.str;
        prev.size = Math.max(prev.size, size);
      } else {
        lines.push({ text: item.str, size, y });
      }
    }
    const clean = lines.map((l) => ({ ...l, text: l.text.replace(/\s+/g, " ").trim() })).filter((l) => l.text);
    let title = "";
    let rest = clean;
    if (clean.length) {
      const max = Math.max(...clean.map((l) => l.size));
      const titleLines = clean.filter((l) => l.size >= max * 0.95).slice(0, 2);
      title = titleLines.map((l) => l.text).join(" ");
      rest = clean.filter((l) => !titleLines.includes(l));
    }
    const points = rest
      .map((l) => l.text.replace(/^[•●▪◦\-–]\s*/, ""))
      .filter((t) => !/^\d{1,3}$/.test(t))
      .slice(0, 8);

    const viewport = page.getViewport({ scale: 1 });
    const scale = Math.min(1.5, 1100 / viewport.width);
    const vp = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport: vp } as any).promise;
    const image = canvas.toDataURL("image/jpeg", 0.78);

    slides.push({ id: newId(), title: title || `Page ${n}`, points, section: "", image, imageFit: "full" });
    onProgress?.(n / pages);
  }
  const meta = (await doc.getMetadata().catch(() => null)) as any;
  const metaTitle = meta?.info?.Title?.trim();
  return makeDeck(metaTitle || slides[0]?.title || fallbackTitle, slides, "pdf");
}
