import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parsePptx } from "../src/import/pptx";

describe("parsePptx", () => {
  it("reads titles, bullets, notes and images in slide order", async () => {
    const buf = readFileSync("tests/fixtures/sample.pptx");
    const d = await parsePptx(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    expect(d.title).toBe("Fixture Deck");
    expect(d.slides.map((s) => s.title)).toEqual(["Fixture Deck", "Agenda", "Picture"]);
    expect(d.slides[0].points).toEqual(["A subtitle"]);
    expect(d.slides[1].points).toEqual(["First point", "Second point"]);
    expect(d.slides[1].notes).toBe("Say hello");
    expect(d.slides[2].image).toMatch(/^data:image\/png;base64,/);
  });
});
