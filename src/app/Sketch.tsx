import { useMemo } from "react";
import { ink, type InkOptions } from "../design/sketch";

/** A hand-inked underline that stretches to its container. */
export function Underline({ seed = 7, color = "var(--accent)", width = 3 }: { seed?: number; color?: string; width?: number }) {
  const svg = useMemo(
    () => ink.curve([[4, 15], [90, 8], [200, 13], [296, 6]], { seed, width, roughness: 1.5, stroke: color } as InkOptions),
    [seed, color, width],
  );
  return <svg className="underline" viewBox="0 0 300 22" preserveAspectRatio="none" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** A small hand-drawn compass-rose mark for the brand. */
export function BrandMark() {
  const svg = useMemo(
    () =>
      ink.circle(16, 16, 26, { seed: 3, width: 1.6, roughness: 1, stroke: "currentColor" }) +
      ink.polygon([[16, 4], [19, 16], [16, 28], [13, 16]], { seed: 5, width: 1.4, roughness: 0.6, stroke: "currentColor", fill: "var(--accent)", fillStyle: "solid" }) +
      ink.line(4, 16, 28, 16, { seed: 8, width: 1, roughness: 0.6, stroke: "currentColor" }),
    [],
  );
  return <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}
