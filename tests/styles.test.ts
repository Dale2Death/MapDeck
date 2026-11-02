import { describe, expect, it } from "vitest";
import { SAMPLE_MD } from "../src/app/sample";
import { moveSlide, resetOrder, isOriginalOrder } from "../src/core/deck";
import { parseMarkdown } from "../src/import/markdown";
import { STYLES } from "../src/styles";

const decks = {
  sample: parseMarkdown(SAMPLE_MD),
  one: parseMarkdown("## Only slide\n- hi"),
  flat: parseMarkdown(Array.from({ length: 13 }, (_, i) => `## Slide ${i + 1}\n- point`).join("\n")),
};

describe.each(STYLES.map((s) => [s.id, s] as const))("%s layout", (_id, style) => {
  for (const [name, deck] of Object.entries(decks)) {
    it(`places every slide and visits them in order (${name})`, () => {
      const l = style.layout(deck);
      for (const s of deck.slides) {
        const c = l.cards[s.id];
        expect(c, s.title).toBeDefined();
        expect(Number.isFinite(c.x) && Number.isFinite(c.y) && c.w > 0).toBe(true);
      }
      const visited = l.steps.filter((s) => s.kind === "slide").map((s) => s.slideId);
      expect(visited).toEqual(deck.slides.map((s) => s.id));
      for (const st of l.steps) expect(Number.isFinite(st.rect.w) && st.rect.w > 0).toBe(true);
      expect(l.decor).not.toMatch(/NaN|undefined/);
      expect(l.overlay ?? "").not.toMatch(/NaN|undefined/);
    });
  }

  it("follows a reordered deck", () => {
    const moved = moveSlide(decks.sample, 0, 4);
    const visited = style.layout(moved).steps.filter((s) => s.kind === "slide").map((s) => s.slideId);
    expect(visited).toEqual(moved.slides.map((s) => s.id));
  });
});

describe("ordering", () => {
  it("resets to the original order", () => {
    const d = decks.sample;
    const moved = moveSlide(d, 1, 6);
    expect(isOriginalOrder(moved)).toBe(false);
    expect(resetOrder(moved).slides.map((s) => s.id)).toEqual(d.originalOrder);
    expect(isOriginalOrder(resetOrder(moved))).toBe(true);
  });
});
