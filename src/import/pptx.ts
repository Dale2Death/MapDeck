import JSZip from "jszip";
import { makeDeck, newId } from "../core/deck";
import type { Deck, Slide } from "../core/types";

const NS_P = "http://schemas.openxmlformats.org/presentationml/2006/main";
const NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function xml(text: string): Document {
  return new DOMParser().parseFromString(text, "application/xml");
}

function resolve(base: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = base.split("/").slice(0, -1);
  for (const seg of target.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg !== ".") parts.push(seg);
  }
  return parts.join("/");
}

async function rels(zip: JSZip, partPath: string): Promise<Map<string, string>> {
  const dir = partPath.split("/").slice(0, -1).join("/");
  const name = partPath.split("/").pop();
  const file = zip.file(`${dir}/_rels/${name}.rels`);
  const map = new Map<string, string>();
  if (!file) return map;
  const doc = xml(await file.async("text"));
  for (const r of Array.from(doc.getElementsByTagName("Relationship"))) {
    if (r.getAttribute("TargetMode") === "External") continue;
    map.set(r.getAttribute("Id")!, resolve(partPath, r.getAttribute("Target")!));
  }
  return map;
}

function paragraphs(el: Element): string[] {
  return Array.from(el.getElementsByTagNameNS(NS_A, "p"))
    .map((p) =>
      Array.from(p.getElementsByTagNameNS(NS_A, "t"))
        .map((t) => t.textContent ?? "")
        .join("")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
};

async function slideFromXml(zip: JSZip, path: string, section: string): Promise<Slide> {
  const doc = xml(await zip.file(path)!.async("text"));
  let title = "";
  const points: string[] = [];
  for (const sp of Array.from(doc.getElementsByTagNameNS(NS_P, "sp"))) {
    const ph = sp.getElementsByTagNameNS(NS_P, "ph")[0];
    const type = ph?.getAttribute("type") ?? "";
    const text = paragraphs(sp);
    if (!text.length) continue;
    if (!title && (type === "title" || type === "ctrTitle")) title = text.join(" ");
    else if (type === "sldNum" || type === "dt" || type === "ftr") continue;
    else points.push(...text);
  }
  // Tables count as text too.
  for (const tbl of Array.from(doc.getElementsByTagNameNS(NS_A, "tbl"))) {
    for (const tr of Array.from(tbl.getElementsByTagNameNS(NS_A, "tr"))) {
      const cells = Array.from(tr.getElementsByTagNameNS(NS_A, "tc")).map((c) => paragraphs(c).join(" "));
      if (cells.some(Boolean)) points.push(cells.join(" · "));
    }
  }
  if (!title && points.length) title = points.shift()!;

  // First picture on the slide, if any.
  let image: string | undefined;
  const blip = doc.getElementsByTagNameNS(NS_A, "blip")[0];
  const rid = blip?.getAttributeNS(NS_R, "embed");
  if (rid) {
    const target = (await rels(zip, path)).get(rid);
    const ext = target?.split(".").pop()?.toLowerCase() ?? "";
    const file = target ? zip.file(target) : null;
    if (file && MIME[ext]) image = `data:${MIME[ext]};base64,${await file.async("base64")}`;
  }

  // Speaker notes.
  let notes: string | undefined;
  for (const [, target] of await rels(zip, path)) {
    if (/notesSlide/.test(target) && zip.file(target)) {
      const nd = xml(await zip.file(target)!.async("text"));
      const body = Array.from(nd.getElementsByTagNameNS(NS_P, "sp")).filter(
        (sp) => sp.getElementsByTagNameNS(NS_P, "ph")[0]?.getAttribute("type") === "body",
      );
      notes = body.flatMap(paragraphs).join("\n") || undefined;
    }
  }
  return { id: newId(), title, points, section, image, notes };
}

export async function parsePptx(data: ArrayBuffer, fallbackTitle = "Untitled"): Promise<Deck> {
  const zip = await JSZip.loadAsync(data);
  const presPath = "ppt/presentation.xml";
  const presFile = zip.file(presPath);
  if (!presFile) throw new Error("This doesn't look like a PowerPoint file.");
  const pres = xml(await presFile.async("text"));
  const presRels = await rels(zip, presPath);

  const idToPath = new Map<string, string>();
  const order: string[] = [];
  for (const s of Array.from(pres.getElementsByTagNameNS(NS_P, "sldId"))) {
    const path = presRels.get(s.getAttributeNS(NS_R, "id") ?? "");
    if (path && zip.file(path)) {
      idToPath.set(s.getAttribute("id")!, path);
      order.push(path);
    }
  }

  // PowerPoint sections live in an extension list (p14:sectionLst).
  const sectionOf = new Map<string, string>();
  for (const sec of Array.from(pres.getElementsByTagName("*")).filter((e) => e.localName === "section")) {
    const name = sec.getAttribute("name") ?? "";
    for (const ref of Array.from(sec.getElementsByTagName("*")).filter((e) => e.localName === "sldId")) {
      const path = idToPath.get(ref.getAttribute("id") ?? "");
      if (path) sectionOf.set(path, name);
    }
  }

  const slides: Slide[] = [];
  for (const path of order) slides.push(await slideFromXml(zip, path, sectionOf.get(path) ?? ""));

  let title = "";
  const core = zip.file("docProps/core.xml");
  if (core) title = xml(await core.async("text")).getElementsByTagName("dc:title")[0]?.textContent?.trim() ?? "";
  return { ...makeDeck(title || slides[0]?.title || fallbackTitle, slides, "pptx") };
}

