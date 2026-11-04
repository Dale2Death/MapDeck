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
  it("renders every layout in the hand-drawn look", () => {
    for (const layout of ["title", "statement", "list", "stat", "steps", "compare", "quote"] as const) {
      expect(cardHtml(slide("T", ["a 50%", "b"], { layout }), 1, undefined, 0, { look: "sketch" })).toContain(`mdp-l-${layout}`);
    }
  });
});

describe("basalt slides", () => {
  it("renders every layout by default", () => {
    for (const layout of ["title", "statement", "list", "stat", "steps", "compare", "quote"] as const) {
      const html = cardHtml(slide("T", ["a 50%", "b"], { layout }), 1);
      expect(html).toContain(`mdb-l-${layout}`);
      expect(html).not.toMatch(/undefined|NaN/);
    }
  });
  it("puts the section in the running header and highlights key numbers", () => {
    const html = cardHtml(slide("Results", ["Spend fell 25% to $48.6K", "More to come"], { section: "Overview", layout: "list" }), 4, undefined, 3, { deckTitle: "Northwind", sectionIndex: 1, sectionCount: 3 });
    expect(html).toContain("<b>02</b><span>Overview</span>");
    expect(html).toContain("Northwind");
    expect(html).toContain('<b class="mdb-key">25%</b>');
    expect(html).toContain('<b class="mdb-key">$48.6K</b>');
  });
  it("escapes slide text", () => {
    expect(cardHtml(slide("<script>", ["<b>x</b>"], { layout: "list" }), 2)).not.toContain("<script>");
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
  it("hears a request for the hand-drawn look", () => {
    expect(interpretVibe("hand-drawn and playful, like a notebook").look).toBe("sketch");
  });
  it("still answers when nothing matches", () => {
    const r = interpretVibe("blah");
    expect(r.matched).toEqual([]);
    expect(r.theme).toBe("guru");
    expect(r.look).toBeUndefined();
  });
  it("quiz still scores", () => {
    expect(scoreQuiz([0, 0, 1, 1, 1]).ranking[0].style).toBe("journey");
    expect(scoreQuiz([0, 0, 1, 1, 1]).theme).toBe("basalt");
    expect(scoreQuiz([0, 0, 3, 1, 1]).theme).toBe("harbour");
  });
});
