import type { Deck } from "../core/types";
import { parseMarkdown } from "./markdown";

export const ACCEPT = ".md,.markdown,.txt,.pptx,.pdf";

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
}

/** Pick a parser by file type. PPTX and PDF parsers are loaded on demand. */
export async function importFile(file: File, onProgress?: (p: number) => void): Promise<Deck> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const title = baseName(file.name);
  if (ext === "pptx") {
    const { parsePptx } = await import("./pptx");
    return parsePptx(await file.arrayBuffer(), title);
  }
  if (ext === "pdf") {
    const { parsePdf } = await import("./pdf");
    return parsePdf(await file.arrayBuffer(), title, onProgress);
  }
  if (ext === "ppt" || ext === "key") {
    throw new Error("Please save this as .pptx (or PDF) first. Older .ppt and Keynote files aren't supported yet.");
  }
  return parseMarkdown(await file.text(), title);
}

export function importText(text: string): Deck {
  return parseMarkdown(text);
}
