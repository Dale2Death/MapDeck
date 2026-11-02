import type { ThemeId } from "../core/types";

export interface ThemeDef {
  id: ThemeId;
  name: string;
  swatch: string[];
}

/** Ink palettes: the watercolour washes used for sections and highlights. */
export const THEMES: ThemeDef[] = [
  { id: "field", name: "Field notes", swatch: ["#d9a33f", "#3f6fd1", "#6f9e7b"] },
  { id: "harbour", name: "Harbour", swatch: ["#2f7fc1", "#e2725b", "#3ba69a"] },
  { id: "orchard", name: "Orchard", swatch: ["#7a9e5a", "#a2507f", "#e39b5b"] },
  { id: "graphite", name: "Graphite & red", swatch: ["#2a2f3a", "#c8402f", "#8a909c"] },
];

/** Older saved decks used different theme names. */
export function normalizeTheme(t: string | undefined): ThemeId {
  return (THEMES.some((x) => x.id === t) ? t : "field") as ThemeId;
}

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Styles for the player. Injected at runtime so exported files carry them too. */
export const PLAYER_CSS = /* css */ `
.mdp{position:relative;width:100%;height:100%;overflow:hidden;color:var(--ink);font-family:var(--font);
  background-color:var(--paper);user-select:none;-webkit-user-select:none;touch-action:none;
  --font:"Instrument Sans",system-ui,sans-serif;--font-display:"Instrument Serif",Georgia,serif;
  --font-hand:"Shantell Sans","Comic Neue",cursive;--font-mono:"IBM Plex Mono",ui-monospace,monospace}
.mdp::before{content:"";position:absolute;inset:0;background-image:${GRAIN};opacity:var(--grain);pointer-events:none;z-index:0;mix-blend-mode:multiply}
.mdp[data-paper=light]{--paper:#f1ede4;--paper-2:#fbf9f3;--ink:#1d2230;--ink-soft:#5d6271;--rule:rgba(29,34,48,.16);
  --grain:.35;--shadow:0 18px 40px -22px rgba(40,34,20,.55);--tape:rgba(214,196,150,.55);--wash-blend:multiply}
.mdp[data-paper=dark]{--paper:#11151e;--paper-2:#1a1f2b;--ink:#ebe5d8;--ink-soft:#a49f93;--rule:rgba(235,229,216,.16);
  --grain:.5;--shadow:0 22px 50px -24px rgba(0,0,0,.9);--tape:rgba(235,229,216,.16);--wash-blend:screen}
.mdp[data-paper=dark]::before{mix-blend-mode:screen;opacity:.12}
.mdp[data-theme=field]{--c0:#d9a33f;--c1:#3f6fd1;--c2:#6f9e7b;--c3:#c8553d;--c4:#8b6fb8}
.mdp[data-theme=harbour]{--c0:#2f7fc1;--c1:#e2725b;--c2:#3ba69a;--c3:#f0b44c;--c4:#6c5ba8}
.mdp[data-theme=orchard]{--c0:#7a9e5a;--c1:#a2507f;--c2:#e39b5b;--c3:#4c86a8;--c4:#d4b74a}
.mdp[data-theme=graphite]{--c0:#c8402f;--c1:#7d8492;--c2:#c8402f;--c3:#7d8492;--c4:#c8402f}
.mdp{--accent:var(--c0)}
.mdp .wash{mix-blend-mode:var(--wash-blend)}

.mdp-stage{position:absolute;inset:0;cursor:grab;z-index:1}
.mdp-stage.is-dragging{cursor:grabbing}
.mdp-world{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}
.mdp-svg{position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible;pointer-events:none}
.mdp-svg text{font-family:var(--font-hand);fill:var(--ink)}
.mdp-svg .lbl-mono{font-family:var(--font-mono);letter-spacing:.12em}
.mdp-svg .lbl-display{font-family:var(--font-display)}
.mdp-layer{transition:opacity .6s ease}
.mdp-layer.is-leaving,.mdp-layer.is-entering{opacity:0}
.mdp-twinkle{animation:mdp-twinkle 4s ease-in-out infinite}
@keyframes mdp-twinkle{0%,100%{opacity:.9}50%{opacity:.3}}

.mdp-card{position:absolute;left:0;top:0;width:960px;height:540px;transform-origin:480px 270px;background:var(--paper-2);color:var(--ink);
  overflow:visible;cursor:pointer;box-shadow:var(--shadow);border-radius:6px;
  transition-property:transform,opacity,filter;transition-timing-function:cubic-bezier(.6,.05,.25,1)}
.mdp-sheet{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
.mdp-tape{fill:var(--tape)}
.mdp.is-focused .mdp-card:not(.is-active){opacity:.5}
.mdp-card>div{position:absolute;inset:0;padding:54px 64px 50px;display:flex;flex-direction:column;gap:18px}
.mdp-kicker{font:500 19px/1 var(--font-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--ink-soft);display:flex;gap:16px;align-items:center}
.mdp-no{color:var(--ink);border-bottom:3px solid var(--sec);padding-bottom:3px}
.mdp-title{margin:0;font:600 50px/1.06 var(--font);letter-spacing:-.025em;text-wrap:balance}
.mdp-title.is-long{font-size:42px}
.mdp-title.is-xlong{font-size:34px}
.mdp-display{font-family:var(--font-display);font-weight:400;letter-spacing:-.01em}
.mdp-hand{font-family:var(--font-hand);color:var(--ink-soft)}
.mdp-doodle{width:100%;height:100%;display:block;overflow:visible}
.mdp-art{flex:none;width:300px;height:300px}
.mdp-art-sm{position:absolute;right:56px;top:40px;width:150px;height:150px}
.mdp-art-corner{position:absolute;right:46px;top:34px;width:128px;height:128px}

.mdp-l-title{flex-direction:row !important;align-items:center;gap:30px}
.mdp-l-title .mdp-col{flex:1;display:flex;flex-direction:column;gap:14px;min-width:0}
.mdp-l-title .mdp-title{font-size:92px;line-height:.98}
.mdp-l-title .mdp-title.is-long{font-size:72px}
.mdp-l-title .mdp-title.is-xlong{font-size:56px}
.mdp-l-title .mdp-hand{font-size:30px;margin:0}
.mdp-swoosh{width:320px;height:24px;margin-top:-6px}
.mdp-logo{max-height:70px;max-width:220px;object-fit:contain;align-self:flex-start;margin-bottom:6px}

.mdp-l-statement{justify-content:center}
.mdp-l-statement .mdp-title{font-size:78px;line-height:1.02;max-width:640px}
.mdp-l-statement .mdp-title.is-long{font-size:60px}
.mdp-l-statement .mdp-title.is-xlong{font-size:46px;max-width:700px}
.mdp-l-statement .mdp-kicker{position:absolute;top:54px;left:64px}
.mdp-annot{font-size:28px;margin:6px 0 0;max-width:680px}

.mdp-l-list header,.mdp-l-stat header,.mdp-l-steps header,.mdp-l-compare header{display:flex;flex-direction:column;gap:14px;padding-right:150px}
.mdp-points{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:14px;font:400 29px/1.32 var(--font);min-height:0;overflow:hidden}
.mdp-points.is-dense{font-size:24px;gap:10px}
.mdp-points.is-xdense{font-size:20px;gap:8px}
.mdp-points li{display:flex;gap:16px;align-items:flex-start}
.mdp-bul{flex:none;width:.72em;height:.72em;margin-top:.32em}

.mdp-stats{display:grid;gap:26px;flex:1;align-items:center}
.mdp-stats.n1{grid-template-columns:1fr}.mdp-stats.n2{grid-template-columns:1fr 1fr}.mdp-stats.n3{grid-template-columns:repeat(3,1fr)}.mdp-stats.n4{grid-template-columns:repeat(2,1fr);gap:14px 26px}
.mdp-stat{display:flex;flex-direction:column;gap:8px;min-width:0}
.mdp-stat-v{position:relative;align-self:flex-start;padding:4px 28px 10px 18px;font:400 96px/1 var(--font-display);letter-spacing:-.02em;white-space:nowrap}
.mdp-stats.n1 .mdp-stat-v{font-size:150px}
.mdp-stats.n3 .mdp-stat-v{font-size:76px}.mdp-stats.n4 .mdp-stat-v{font-size:62px;padding:2px 22px 6px 14px}
.mdp-ring{position:absolute;inset:-12px -14px -6px -18px;width:calc(100% + 32px);height:calc(100% + 18px);overflow:visible}
.mdp-stat p{margin:0;font:400 24px/1.3 var(--font);color:var(--ink-soft)}
.mdp-stats.n1 .mdp-stat p{font-size:30px;max-width:640px}
.mdp-stats.n4 .mdp-stat p{font-size:19px}

.mdp-steps-art{width:100%;height:120px;overflow:visible;margin-top:auto}
.mdp-step-n{font:700 40px var(--font-hand);fill:var(--ink)}
.mdp-steps{display:grid;gap:18px;margin-bottom:auto}
.mdp-steps.n2{grid-template-columns:repeat(2,1fr)}.mdp-steps.n3{grid-template-columns:repeat(3,1fr)}.mdp-steps.n4{grid-template-columns:repeat(4,1fr)}.mdp-steps.n5{grid-template-columns:repeat(5,1fr)}
.mdp-steps p{margin:0;text-align:center;font:500 23px/1.3 var(--font)}
.mdp-steps.n5 p{font-size:19px}

.mdp-cmp{flex:1;display:grid;grid-template-columns:1fr 80px 1fr;gap:12px;min-height:0}
.mdp-cmp-col h3{margin:0 0 10px;font-size:32px;color:var(--ink);font-weight:600}
.mdp-cmp-col ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:12px;font:400 24px/1.3 var(--font)}
.mdp-cmp-col li{padding-left:22px;position:relative}
.mdp-cmp-col li::before{content:"";position:absolute;left:0;top:.55em;width:10px;height:3px;background:var(--sec);border-radius:2px}
.mdp-cmp-mid{position:relative}
.mdp-cmp-mid svg{width:100%;height:100%;overflow:visible}
.mdp-cmp-mid span{position:absolute;left:0;right:0;top:50%;transform:translateY(-55%);text-align:center;font-size:30px;font-weight:700;color:var(--ink)}

.mdp-l-quote{justify-content:center;padding-left:120px !important;padding-right:110px !important}
.mdp-l-quote .mdp-kicker{position:absolute;top:54px;left:64px}
.mdp-qmark{position:absolute;left:44px;top:96px;font:400 240px/1 var(--font-display);color:var(--sec);opacity:.9}
.mdp-l-quote blockquote{margin:0;font-size:52px;line-height:1.12;font-style:italic;text-wrap:balance}
.mdp-l-quote blockquote.is-long{font-size:38px}
.mdp-l-quote .mdp-hand{font-size:28px;margin:0}

.mdp-l-photo{flex-direction:row !important;gap:40px;align-items:center}
.mdp-l-photo figure{position:relative;margin:0;width:52%;height:100%;flex:none;transform:rotate(-1.5deg)}
.mdp-l-photo figure img{width:100%;height:100%;object-fit:cover;border:10px solid #fff;box-shadow:0 10px 24px -12px rgba(0,0,0,.5)}
.mdp-tape-c{position:absolute;width:110px;height:34px;background:var(--tape)}
.mdp-tape-c.a{left:-30px;top:-8px;transform:rotate(-30deg)}.mdp-tape-c.b{right:-30px;bottom:-6px;transform:rotate(-30deg)}
.mdp-l-photo .mdp-col{flex:1;display:flex;flex-direction:column;gap:16px;min-width:0}
.mdp-l-photo .mdp-points{font-size:22px}

.mdp-token{position:absolute;left:0;top:0;width:0;height:0;transition:transform var(--move-ms,1s) cubic-bezier(.6,.05,.25,1);pointer-events:none;z-index:3}
.mdp-token-inner{position:absolute;transform:translate(-50%,-100%)}
.mdp-token.is-hopping .mdp-token-inner{animation:mdp-hop var(--move-ms,1s) ease-in-out}
@keyframes mdp-hop{0%,100%{transform:translate(-50%,-100%)}50%{transform:translate(-50%,-165%)}}
.mdp-token svg{display:block;overflow:visible}

.mdp-chrome{position:absolute;left:50%;bottom:calc(16px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);display:flex;gap:2px;align-items:center;padding:6px;border-radius:14px;
  background:var(--paper-2);color:var(--ink);font:500 13px/1 var(--font);border:1.5px solid var(--ink);
  box-shadow:3px 4px 0 var(--rule);transition:opacity .3s;z-index:5;max-width:calc(100% - 24px);overflow-x:auto;scrollbar-width:none}
.mdp-chrome::-webkit-scrollbar{display:none}
.mdp.is-idle .mdp-chrome{opacity:0}
.mdp-chrome button{appearance:none;border:0;background:transparent;color:inherit;font:inherit;height:36px;min-width:36px;padding:0 10px;border-radius:9px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap}
.mdp-chrome button:hover{background:var(--rule)}
.mdp-chrome button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.mdp-chrome button[aria-pressed=true]{background:var(--ink);color:var(--paper-2)}
.mdp-chrome svg{width:18px;height:18px;display:block}
.mdp-chrome .mdp-sep{width:1.5px;height:20px;background:var(--rule);margin:0 4px;flex:none}
.mdp-count{min-width:58px;text-align:center;font:500 12px/1 var(--font-mono);letter-spacing:.06em;font-variant-numeric:tabular-nums}
.mdp-remix-label{font:500 10px/1 var(--font-mono);text-transform:uppercase;letter-spacing:.16em;color:var(--ink-soft);padding:0 4px 0 6px}
.mdp-caption{position:absolute;left:calc(22px + env(safe-area-inset-left,0px));top:calc(18px + env(safe-area-inset-top,0px));color:var(--ink);z-index:4;max-width:50%;pointer-events:none;display:flex;flex-direction:column;gap:4px}
.mdp-caption .t{font:400 22px/1.1 var(--font-display)}
.mdp-caption small{font:500 11px/1.2 var(--font-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--ink-soft)}
.mdp-mini{position:absolute;right:calc(16px + env(safe-area-inset-right,0px));top:calc(16px + env(safe-area-inset-top,0px));width:200px;border-radius:10px;background:var(--paper-2);border:1.5px solid var(--ink);
  box-shadow:3px 4px 0 var(--rule);padding:8px;z-index:5;cursor:pointer;transition:opacity .3s}
.mdp-mini svg{display:block;width:100%;height:auto}
.mdp-mini[hidden]{display:none}
.mdp-toast{position:absolute;left:50%;top:22px;transform:translate(-50%,-10px) rotate(-1deg);background:var(--paper-2);color:var(--ink);padding:10px 18px;border:1.5px solid var(--ink);border-radius:10px;
  font:500 17px var(--font-hand);opacity:0;transition:all .35s;pointer-events:none;z-index:6;box-shadow:3px 4px 0 var(--rule)}
.mdp-toast.is-on{opacity:1;transform:translate(-50%,0) rotate(-1deg)}
@media (max-width:640px){.mdp-mini{width:120px}.mdp-remix-label,.mdp-hide-sm{display:none}.mdp-caption{max-width:60%}}
@media (prefers-reduced-motion:reduce){.mdp-card,.mdp-token{transition-duration:0s !important}.mdp-twinkle{animation:none}}
@media print{.mdp-chrome,.mdp-mini,.mdp-toast,.mdp-caption{display:none}}
`;
