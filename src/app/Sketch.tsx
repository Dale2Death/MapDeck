/** A straight signal rule under a word (Basalt: one mark, square ends). */
export function Underline() {
  return (
    <svg className="underline" viewBox="0 0 300 22" preserveAspectRatio="none" aria-hidden="true">
      <rect x="0" y="15" width="300" height="5" style={{ fill: "var(--signal, var(--accent))" }} />
    </svg>
  );
}

/** The MapDeck mark: a square frame with a route running through it to one signal point. */
export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="2" y="2" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <polyline points="7,24 13,15 19,19 24,10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="miter" />
      <rect x="21.5" y="7.5" width="5" height="5" style={{ fill: "var(--signal, var(--accent))" }} />
    </svg>
  );
}
