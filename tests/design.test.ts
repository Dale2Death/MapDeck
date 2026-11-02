import { describe, expect, it } from "vitest";
import type { Slide } from "../src/core/types";
import { interpretVibe, scoreQuiz } from "../src/core/quiz";
import { extractStat, layoutOf, splitLong } from "../src/design/classify";
import { pickDoodle } from "../src/design/doodles";
import { cardHtml } from "../src/player/card";

const slide = (title: string, points: string[] = [], extra: Partial<Slide> = {}): Slide => ({ id: title, title, points, section: "Main", ...extra });

describe("layoutOf", () => {
  it("picks a layout from the content", () => {
    expect(layoutOf(slide("Launching Northstar", ["A subtitle"]), 0)).toBe("title");
    expect(layoutOf(slide("Thank you"), 5)).toBe("statement");
    expect(layoutOf(slide("Results", ["Recall up 65%", "$2.4M saved"]), 3)).toBe("stat");
    expect(layoutOf(slide("How it works", ["Import", "Pick a style", "Present"]), 2)).toBe("steps");
    expect(layoutOf(slide("Old vs new", ["Before: slow", "After: fast"]), 2)).toBe("compare");
    expect(layoutOf(slide("What people say", ["“It changed how we pitch”", "Sam, Acme"]), 2)).toBe("quote");
    expect(layoutOf(slide("Why", ["One", "Two thing here", "Three things to say", "Four"]), 2)).toBe("list");
    expect(layoutOf(slide("Why", ["One", "Two"], { layout: "steps" }), 2)).toBe("steps");
  });

  it("only features numbers worth featuring", () => {
    expect(extractStat("Visual storytelling lifts recall by up to 65%")?.value).toBe("65%");
    expect(extractStat("3 internal teams")).toBeNull();
    expect(extractStat("Founded in 2019")).toBeNull();
  });
});

describe("splitLong", () => {
  it("splits crowded slides into parts", () => {
    let n = 0;
    const out = splitLong([slide("Lots", Array.from({ length: 11 }, (_, i) => `Point ${i}`))], () => `n${n++}`);
    expect(out.length).toBeGreaterThan(1);
    expect(out[0].title).toBe(`Lots (1/${out.length})`);
    expect(out.flatMap((s) => s.points)).toHaveLength(11);
  });
});

describe("doodles", () => {
  it("draws from the slide's words", () => {
    expect(pickDoodle(slide("Our team"), 1)).toBe("users");
    expect(pickDoodle(slide("Anything", [], { doodle: "none" }), 1)).toBeNull();
    expect(pickDoodle(slide("zzz qqq"), 1)).toBeTruthy();
  });
  it("renders every layout", () => {
    for (const layout of ["title", "statement", "list", "stat", "steps", "compare", "quote"] as const) {
      expect(cardHtml(slide("T", ["a 50%", "b"], { layout }), 1)).toContain(`mdp-l-${layout}`);
    }
  });
});

describe("describe it", () => {
  it("turns a description into a style, inks, pace and paper", () => {
    const r = interpretVibe("A dreamy night sky full of ideas, slow and cinematic");
    expect(r.ranking[0].style).toBe("constellation");
    expect(r.pace).toBe("cinematic");
    expect(r.paper).toBe("dark");
    expect(r.matched).toContain("night sky");
    expect(interpretVibe("A playful workshop with levels").ranking[0].style).toBe("gameboard");
    expect(interpretVibe("A road trip, warm and steady").ranking[0].style).toBe("journey");
  });
  it("still answers when nothing matches", () => {
    const r = interpretVibe("blah");
    expect(r.matched).toEqual([]);
    expect(r.theme).toBe("field");
  });
  it("quiz still scores", () => {
    expect(scoreQuiz([0, 0, 1, 1, 1]).ranking[0].style).toBe("journey");
    expect(scoreQuiz([0, 0, 1, 1, 1]).theme).toBe("harbour");
  });
});

describe("autoSection", () => {
  it("uses title-only divider slides as sections", async () => {
    const { autoSection } = await import("../src/core/deck");
    const out = autoSection([
      slide("Deck", ["sub"], { section: "" }),
      slide("Where we are", [], { section: "" }),
      slide("Numbers", ["a", "b"], { section: "" }),
      slide("The plan", [], { section: "" }),
      slide("Steps", ["x"], { section: "" }),
      slide("Thanks", ["Questions?"], { section: "" }),
    ]);
    expect(out.map((s) => s.section)).toEqual(["Where we are", "Where we are", "Where we are", "The plan", "The plan", "The plan"]);
  });
});
