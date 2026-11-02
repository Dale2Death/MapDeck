import { describe, expect, it } from "vitest";
import { SAMPLE_MD } from "../src/app/sample";
import { parseMarkdown, parsePlainText } from "../src/import/markdown";

describe("parseMarkdown", () => {
  it("uses H1 as sections and H2 as slides", () => {
    const d = parseMarkdown(SAMPLE_MD);
    expect(d.title).toBe("Launching Northstar");
    expect(d.slides[0].title).toBe("Launching Northstar");
    expect(d.slides.map((s) => s.title)).toContain("Phase 2: Team pilot");
    const pilot = d.slides.find((s) => s.title === "Phase 2: Team pilot")!;
    expect(pilot.section).toBe("The plan");
    expect(pilot.points).toEqual(["Roll out to 3 internal teams", "Collect feedback every week", "Brand kits for every client"]);
    expect(new Set(d.slides.map((s) => s.section))).toEqual(new Set(["Why now", "The plan", "Success"]));
    expect(d.originalOrder).toEqual(d.slides.map((s) => s.id));
  });

  it("splits on --- slide breaks", () => {
    const d = parseMarkdown("# Deck\n\n---\n## One\n- a\n- **b**\n---\n## Two\nSome [linked](http://x) text\n");
    expect(d.slides.map((s) => s.title)).toEqual(["Deck", "One", "Two"]);
    expect(d.slides[1].points).toEqual(["a", "b"]);
    expect(d.slides[2].points).toEqual(["Some linked text"]);
  });

  it("handles a single heading level", () => {
    const d = parseMarkdown("## A\ntext\n## B\n- x\n## C\n## D\n## E\n## F\n");
    expect(d.slides.length).toBe(6);
    // Flat decks get auto-grouped so Zoom and Spider web have branches.
    expect(new Set(d.slides.map((s) => s.section)).size).toBeGreaterThan(1);
  });

  it("parses plain text", () => {
    const d = parsePlainText("Quarterly review\n\nRevenue\nUp 12% on last quarter.\nChurn down.\n\nNext steps\n\nHire two designers.");
    expect(d.slides.map((s) => s.title)).toEqual(["Quarterly review", "Revenue", "Next steps"]);
    expect(d.slides[2].points).toEqual(["Hire two designers."]);
  });
});
