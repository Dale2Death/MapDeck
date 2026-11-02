import type { ThemeId } from "../core/types";

export interface ThemeDef {
  id: ThemeId;
  name: string;
  swatch: string[];
}

export const THEMES: ThemeDef[] = [
  { id: "midnight", name: "Midnight & gold", swatch: ["#0d1530", "#f5b942", "#5ad1c9"] },
  { id: "paper", name: "Clean paper", swatch: ["#f6f1e7", "#1f2430", "#d9483b"] },
  { id: "sunrise", name: "Sunset glow", swatch: ["#2a1438", "#ff8a5b", "#ffd166"] },
  { id: "forest", name: "Deep forest", swatch: ["#0f2a22", "#8fe3a8", "#f2c14e"] },
];

/** Styles for the player. Injected at runtime so exported files carry them too. */
export const PLAYER_CSS = /* css */ `
.mdp{position:relative;width:100%;height:100%;overflow:hidden;font-family:var(--font);color:var(--ink);
  background:var(--bg);background-image:var(--bg-image);user-select:none;-webkit-user-select:none;touch-action:none}
.mdp *{box-sizing:border-box}
.mdp[data-theme=midnight]{--bg:#0b1229;--bg-image:radial-gradient(1200px 800px at 30% 20%,#1b2a5a 0,transparent 60%),radial-gradient(900px 700px at 80% 90%,#14363f 0,transparent 60%);
  --card:#fdfbf6;--card-ink:#16203d;--card-muted:#5b6585;--ink:#f3f1ea;--muted:#9aa3c0;--accent:#f5b942;--on-accent:#1a1406;
  --line:#c7cce0;--road:rgba(255,255,255,.10);--web:rgba(220,228,255,.22);--frame:rgba(255,255,255,.05);--board:#18224a;--star:#fff;
  --c0:#f5b942;--c1:#5ad1c9;--c2:#ff7a8a;--c3:#a98bff;--c4:#7fd36b;--font:"Inter",system-ui,sans-serif;--font-head:"Space Grotesk","Inter",system-ui,sans-serif}
.mdp[data-theme=paper]{--bg:#f4efe4;--bg-image:radial-gradient(circle at 1px 1px,rgba(31,36,48,.10) 1.5px,transparent 0);--bg-size:34px 34px;
  --card:#ffffff;--card-ink:#1f2430;--card-muted:#6a6f7d;--ink:#1f2430;--muted:#6a6f7d;--accent:#d9483b;--on-accent:#fff;
  --line:#8b8f9a;--road:rgba(31,36,48,.09);--web:rgba(31,36,48,.16);--frame:rgba(255,255,255,.55);--board:#fffaf0;--star:#1f2430;
  --c0:#d9483b;--c1:#2f6fdb;--c2:#e6a417;--c3:#2a9d74;--c4:#8a4fd1;--font:"Inter",system-ui,sans-serif;--font-head:"Fraunces",Georgia,serif}
.mdp[data-theme=sunrise]{--bg:#26112f;--bg-image:linear-gradient(160deg,#3b1640 0%,#7a2f4f 45%,#e0714f 100%);
  --card:#fff8f0;--card-ink:#2b1630;--card-muted:#7d5a6d;--ink:#fff3e6;--muted:#ffc9b0;--accent:#ffd166;--on-accent:#2b1630;
  --line:#ffd9c2;--road:rgba(255,236,220,.16);--web:rgba(255,220,200,.28);--frame:rgba(255,255,255,.08);--board:#4a1d45;--star:#fff3e6;
  --c0:#ffd166;--c1:#ff8a5b;--c2:#ef476f;--c3:#7bdff2;--c4:#b8f2a0;--font:"Inter",system-ui,sans-serif;--font-head:"Space Grotesk","Inter",system-ui,sans-serif}
.mdp[data-theme=forest]{--bg:#0d241d;--bg-image:radial-gradient(1100px 800px at 70% 10%,#1d4a3b 0,transparent 60%),radial-gradient(900px 700px at 10% 90%,#173a2b 0,transparent 60%);
  --card:#f6f8f1;--card-ink:#133126;--card-muted:#56705f;--ink:#eaf5ec;--muted:#9fc2ad;--accent:#8fe3a8;--on-accent:#0d241d;
  --line:#b9d6c3;--road:rgba(220,255,230,.10);--web:rgba(200,240,215,.22);--frame:rgba(255,255,255,.05);--board:#163a2e;--star:#eaf5ec;
  --c0:#8fe3a8;--c1:#f2c14e;--c2:#7cc6fe;--c3:#f78c6b;--c4:#d3a4ff;--font:"Inter",system-ui,sans-serif;--font-head:"Fraunces",Georgia,serif}
.mdp[data-style=constellation]{--bg:#050816;--bg-image:radial-gradient(1400px 900px at 50% 30%,#141b3d 0,transparent 70%);--ink:#eef0ff;--star:#fff;--muted:#a8b0d8}
.mdp[data-theme=paper]{background-size:var(--bg-size,auto)}
.mdp[data-theme=paper][data-style=constellation]{background-size:auto}

.mdp-stage{position:absolute;inset:0;cursor:grab}
.mdp-stage.is-dragging{cursor:grabbing}
.mdp-world{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}
.mdp-svg{position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible;pointer-events:none;font-family:var(--font-head)}
.mdp-layer{transition:opacity .6s ease}
.mdp-layer.is-leaving{opacity:0}
.mdp-layer.is-entering{opacity:0}
.mdp-twinkle{animation:mdp-twinkle 4s ease-in-out infinite}
@keyframes mdp-twinkle{0%,100%{opacity:.9}50%{opacity:.25}}

.mdp-card{position:absolute;left:0;top:0;width:960px;height:540px;transform-origin:480px 270px;border-radius:28px;
  background:var(--card);color:var(--card-ink);padding:58px 64px;overflow:hidden;cursor:pointer;
  box-shadow:0 30px 60px -20px rgba(0,0,0,.45),0 0 0 1px rgba(0,0,0,.06);
  transition-property:transform,opacity,filter;transition-timing-function:cubic-bezier(.6,.05,.25,1);display:flex;flex-direction:column;gap:22px}
.mdp-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:14px;background:var(--sec,var(--accent))}
.mdp.is-focused .mdp-card:not(.is-active){opacity:.42;filter:saturate(.6)}
.mdp-kicker{font:700 22px/1 var(--font);letter-spacing:.14em;text-transform:uppercase;color:var(--card-muted);display:flex;gap:14px;align-items:center}
.mdp-kicker b{display:inline-grid;place-items:center;min-width:44px;height:44px;padding:0 10px;border-radius:22px;background:var(--sec,var(--accent));color:#fff;letter-spacing:0;font-size:22px}
.mdp-title{margin:0;font:800 56px/1.06 var(--font-head);letter-spacing:-.02em;text-wrap:balance}
.mdp-title.is-long{font-size:44px}
.mdp-points{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:14px;font:400 30px/1.3 var(--font);flex:1;min-height:0;overflow:hidden;
  -webkit-mask-image:linear-gradient(#000 85%,transparent);mask-image:linear-gradient(#000 85%,transparent)}
.mdp-points.is-dense{font-size:24px;gap:10px}
.mdp-points.is-xdense{font-size:20px;gap:8px}
.mdp-points li{position:relative;padding-left:34px}
.mdp-points li::before{content:"";position:absolute;left:4px;top:.5em;width:14px;height:14px;border-radius:50%;background:var(--sec,var(--accent));transform:translateY(-40%)}
.mdp-body{display:flex;gap:36px;flex:1;min-height:0}
.mdp-body .mdp-points{flex:1}
.mdp-side{width:44%;border-radius:18px;object-fit:cover;background:#0001}
.mdp-card--title{justify-content:center;align-items:flex-start}
.mdp-card--title .mdp-title{font-size:84px}
.mdp-card--title .mdp-title.is-long{font-size:62px}
.mdp-card--full{padding:0;background:#fff}
.mdp-card--full img{width:100%;height:100%;object-fit:contain;display:block}
.mdp-card--full .mdp-kicker{position:absolute;left:28px;top:22px;background:rgba(255,255,255,.9);padding:6px 12px 6px 6px;border-radius:30px}

.mdp-token{position:absolute;left:0;top:0;width:0;height:0;transition:transform var(--move-ms,1s) cubic-bezier(.6,.05,.25,1);pointer-events:none;z-index:3}
.mdp-token-inner{position:absolute;transform:translate(-50%,-100%)}
.mdp-token.is-hopping .mdp-token-inner{animation:mdp-hop var(--move-ms,1s) ease-in-out}
@keyframes mdp-hop{0%,100%{transform:translate(-50%,-100%)}50%{transform:translate(-50%,-160%)}}
.mdp-traveller{width:120px;height:160px}
.mdp-pawn{width:150px;height:210px}

.mdp-chrome{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);display:flex;gap:6px;align-items:center;padding:7px;border-radius:999px;
  background:rgba(12,14,24,.72);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#fff;font:600 14px/1 system-ui,sans-serif;
  box-shadow:0 10px 30px rgba(0,0,0,.3);transition:opacity .3s;z-index:5;max-width:calc(100% - 24px);overflow-x:auto;scrollbar-width:none}
.mdp-chrome::-webkit-scrollbar{display:none}
.mdp.is-idle .mdp-chrome{opacity:0}
.mdp-chrome button{appearance:none;border:0;background:transparent;color:inherit;font:inherit;height:38px;min-width:38px;padding:0 12px;border-radius:999px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.mdp-chrome button:hover{background:rgba(255,255,255,.14)}
.mdp-chrome button[aria-pressed=true]{background:#fff;color:#111}
.mdp-chrome .mdp-sep{width:1px;height:22px;background:rgba(255,255,255,.2);margin:0 4px;flex:none}
.mdp-count{min-width:64px;text-align:center;font-variant-numeric:tabular-nums;opacity:.85}
.mdp-remix-label{opacity:.6;font-size:12px;text-transform:uppercase;letter-spacing:.1em;padding:0 4px 0 6px}
.mdp-caption{position:absolute;left:22px;top:18px;font:700 15px/1.2 system-ui,sans-serif;color:var(--ink);opacity:.75;z-index:4;max-width:50%;pointer-events:none;
  text-shadow:0 1px 8px rgba(0,0,0,.25)}
.mdp-caption small{display:block;font-weight:500;opacity:.8;margin-top:3px}
.mdp-mini{position:absolute;right:16px;top:16px;width:220px;border-radius:14px;background:rgba(12,14,24,.86);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  padding:8px;z-index:5;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.3);transition:opacity .3s}
.mdp-mini svg{display:block;width:100%;height:auto}
.mdp-mini[hidden]{display:none}
.mdp.is-compact .mdp-mini{width:140px}
.mdp-toast{position:absolute;left:50%;top:22px;transform:translate(-50%,-10px);background:rgba(12,14,24,.8);color:#fff;padding:10px 18px;border-radius:999px;
  font:600 15px system-ui,sans-serif;opacity:0;transition:all .35s;pointer-events:none;z-index:6}
.mdp-toast.is-on{opacity:1;transform:translate(-50%,0)}
@media (max-width:640px){.mdp-mini{width:130px}.mdp-remix-label,.mdp-hide-sm{display:none}}
@media print{.mdp-chrome,.mdp-mini,.mdp-toast,.mdp-caption{display:none}}
`;
