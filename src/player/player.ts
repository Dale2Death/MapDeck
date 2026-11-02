import { PACE_MS, type Deck, type Presentation, type PresentSettings, type StyleId } from "../core/types";
import { STYLES, getStyle, type Layout, type Rect, type Step } from "../styles";
import { CARD_H, CARD_W } from "../styles/util";
import { easeInOut, interpolateZoom, type View } from "./camera";
import { cardClass, cardHtml } from "./card";
import { PLAYER_CSS } from "./css";

export interface PlayerOptions {
  /** Show the control bar (prev/next, remix, minimap...). */
  controls?: boolean;
  minimap?: boolean;
  /** Listen to the keyboard on window. */
  keyboard?: boolean;
  /** Start on this step. */
  startStep?: number;
  /** Called after every step change. */
  onStep?: (index: number, step: Step, total: number) => void;
  /** Called when the viewer remixes to another style. */
  onStyle?: (style: StyleId) => void;
  onExit?: () => void;
  /** Extra buttons on the control bar. */
  extraButtons?: { label: string; title: string; onClick: () => void }[];
}

const SVG_NS = "http://www.w3.org/2000/svg";
const FONT_LINK_ID = "mdp-fonts";

function injectCss() {
  if (document.getElementById("mdp-css")) return;
  const style = document.createElement("style");
  style.id = "mdp-css";
  style.textContent = PLAYER_CSS;
  document.head.appendChild(style);
}

/** Load Google Fonts used by the themes or a brand kit. Best effort. */
export function loadFonts(extra: (string | undefined)[] = []) {
  const families = ["Inter:wght@400;600;700;800", "Space Grotesk:wght@600;700;800", "Fraunces:opsz,wght@9..144,700;9..144,800;9..144,900"];
  for (const f of extra) if (f) families.push(`${f}:wght@400;700;800`);
  const href = `https://fonts.googleapis.com/css2?${families.map((f) => "family=" + encodeURIComponent(f).replace(/%20/g, "+")).join("&")}&display=swap`;
  let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}

/**
 * The presentation engine. Places slide cards according to a style's layout
 * and flies a camera between steps. Changing style mid-show ("remix") moves
 * every card to its new spot while the camera follows the current slide.
 */
export class Player {
  readonly el: HTMLDivElement;
  private stage: HTMLDivElement;
  private world: HTMLDivElement;
  private cardsEl: HTMLDivElement;
  private decorSvg: SVGSVGElement;
  private overlaySvg: SVGSVGElement;
  private tokenEl: HTMLDivElement;
  private captionEl: HTMLDivElement;
  private miniEl: HTMLDivElement;
  private toastEl: HTMLDivElement;
  private chromeEl: HTMLDivElement | null = null;
  private countEl: HTMLSpanElement | null = null;
  private cardEls = new Map<string, HTMLDivElement>();

  private deck: Deck;
  private settings: PresentSettings;
  private layout!: Layout;
  private index = 0;
  private view: View = [0, 0, 1000];
  private anim = 0;
  private ro: ResizeObserver;
  private idleTimer = 0;
  private autoplayTimer = 0;
  private opts: PlayerOptions;
  private disposers: (() => void)[] = [];

  constructor(host: HTMLElement, pres: Presentation, opts: PlayerOptions = {}) {
    injectCss();
    loadFonts([pres.settings.brand?.headingFont, pres.settings.brand?.bodyFont]);
    this.opts = { controls: true, minimap: true, ...opts };
    this.deck = pres.deck;
    this.settings = { ...pres.settings };

    this.el = document.createElement("div");
    this.el.className = "mdp";
    this.el.tabIndex = -1;
    this.el.innerHTML = `
      <div class="mdp-stage"><div class="mdp-world"></div></div>
      <div class="mdp-caption"></div>
      <div class="mdp-mini"></div>
      <div class="mdp-toast"></div>`;
    host.appendChild(this.el);
    this.stage = this.el.querySelector(".mdp-stage")!;
    this.world = this.el.querySelector(".mdp-world")!;
    this.captionEl = this.el.querySelector(".mdp-caption")!;
    this.miniEl = this.el.querySelector(".mdp-mini")!;
    this.toastEl = this.el.querySelector(".mdp-toast")!;

    this.decorSvg = this.svg("mdp-decor");
    this.cardsEl = document.createElement("div");
    this.overlaySvg = this.svg("mdp-overlay");
    this.tokenEl = document.createElement("div");
    this.tokenEl.className = "mdp-token";
    this.world.append(this.decorSvg, this.cardsEl, this.overlaySvg, this.tokenEl);

    this.miniEl.hidden = !this.opts.minimap;
    if (this.opts.controls) this.buildChrome();
    this.applyLook();
    this.syncCards(false);
    this.layout = getStyle(this.settings.style).layout(this.deck);
    this.renderLayout(false);
    this.index = Math.min(opts.startStep ?? 0, this.layout.steps.length - 1);
    this.jumpTo(this.currentStep().rect);
    this.afterStep(false);

    this.ro = new ResizeObserver(() => this.jumpTo(this.currentStep().rect));
    this.ro.observe(this.stage);
    this.bindPointer();
    if (this.opts.keyboard) this.bindKeys();
    this.bindIdle();
  }

  // ---------- public API ----------

  get stepIndex() {
    return this.index;
  }
  get steps(): Step[] {
    return this.layout.steps;
  }
  get style(): StyleId {
    return this.settings.style;
  }

  next() {
    this.go(this.index + 1);
  }
  prev() {
    this.go(this.index - 1);
  }
  go(i: number) {
    const total = this.layout.steps.length;
    if (!total) return;
    const prevAnchor = this.tokenTarget();
    this.index = Math.max(0, Math.min(total - 1, i));
    this.flyTo(this.currentStep().rect);
    this.afterStep(true, prevAnchor);
  }
  overview(instant = false) {
    const i = this.layout.steps.findIndex((s) => s.kind === "overview");
    if (instant) this.jumpTo(this.layout.bounds);
    else this.flyTo(this.layout.bounds);
    if (i >= 0) {
      this.index = i;
      this.afterStep(true);
    }
  }
  goToSlide(id: string) {
    const i = this.layout.steps.findIndex((s) => s.slideId === id);
    if (i >= 0) this.go(i);
  }

  /** Live remix: switch style and keep the audience on the same slide. */
  setStyle(style: StyleId, announce = true) {
    if (style === this.settings.style) return;
    const current = this.currentSlideId();
    const wasOverview = this.currentStep()?.kind === "overview";
    this.settings.style = style;
    this.el.dataset.style = style;
    this.layout = getStyle(style).layout(this.deck);
    this.renderLayout(true);
    let i = current && !wasOverview ? this.layout.steps.findIndex((s) => s.slideId === current) : 0;
    if (wasOverview && this.index > 0) i = this.layout.steps.length - 1;
    this.index = Math.max(0, i);
    this.flyTo(this.currentStep().rect, this.morphMs());
    this.afterStep(false);
    this.updateChrome();
    if (announce) this.toast(`${getStyle(style).emoji} Remixed to ${getStyle(style).name}`);
    this.opts.onStyle?.(style);
  }

  /** Update deck and/or settings, morphing cards where they moved. */
  update(pres: Partial<Presentation>) {
    const current = this.currentSlideId();
    if (pres.settings) {
      const styleChanged = pres.settings.style !== this.settings.style;
      this.settings = { ...pres.settings, style: this.settings.style };
      this.applyLook();
      loadFonts([this.settings.brand?.headingFont, this.settings.brand?.bodyFont]);
      if (styleChanged) {
        if (pres.deck) this.deck = pres.deck;
        this.syncCards(true);
        this.setStyle(pres.settings.style, false);
        return;
      }
    }
    if (pres.deck) this.deck = pres.deck;
    this.syncCards(true);
    this.layout = getStyle(this.settings.style).layout(this.deck);
    this.renderLayout(true);
    const i = current ? this.layout.steps.findIndex((s) => s.slideId === current) : -1;
    this.index = i >= 0 ? i : Math.min(this.index, this.layout.steps.length - 1);
    this.flyTo(this.currentStep().rect, this.morphMs());
    this.afterStep(false);
    this.updateChrome();
  }

  setMinimap(on: boolean) {
    this.opts.minimap = on;
    this.miniEl.hidden = !on;
    this.updateChrome();
    if (on) this.drawMinimap();
  }

  /** Advance automatically every `ms` milliseconds; 0 stops. Resolves at the end. */
  autoplay(ms: number): Promise<void> {
    clearInterval(this.autoplayTimer);
    if (!ms) return Promise.resolve();
    return new Promise((resolve) => {
      this.autoplayTimer = window.setInterval(() => {
        if (this.index >= this.layout.steps.length - 1) {
          clearInterval(this.autoplayTimer);
          resolve();
        } else this.next();
      }, ms);
    });
  }

  destroy() {
    cancelAnimationFrame(this.anim);
    clearInterval(this.autoplayTimer);
    clearTimeout(this.idleTimer);
    this.ro.disconnect();
    this.disposers.forEach((d) => d());
    this.el.remove();
  }

  // ---------- layout & rendering ----------

  private svg(cls: string): SVGSVGElement {
    const s = document.createElementNS(SVG_NS, "svg");
    s.setAttribute("class", `mdp-svg ${cls}`);
    s.setAttribute("width", "1");
    s.setAttribute("height", "1");
    return s;
  }

  private morphMs() {
    return Math.round(PACE_MS[this.settings.pace] * 1.3);
  }

  private applyLook() {
    const { theme, style, brand } = this.settings;
    this.el.dataset.theme = theme;
    this.el.dataset.style = style;
    const st = this.el.style;
    for (const v of ["--accent", "--c0", "--c1", "--font", "--font-head"]) st.removeProperty(v);
    if (brand?.primary) {
      st.setProperty("--accent", brand.primary);
      st.setProperty("--c0", brand.primary);
    }
    if (brand?.secondary) st.setProperty("--c1", brand.secondary);
    if (brand?.bodyFont) st.setProperty("--font", `"${brand.bodyFont}", system-ui, sans-serif`);
    if (brand?.headingFont) st.setProperty("--font-head", `"${brand.headingFont}", system-ui, sans-serif`);
    this.captionEl.innerHTML = "";
    if (brand?.logo) {
      const img = document.createElement("img");
      img.src = brand.logo;
      img.alt = "";
      img.style.cssText = "max-height:34px;max-width:140px;object-fit:contain;display:block;margin-bottom:6px";
      this.captionEl.appendChild(img);
    }
    const t = document.createElement("div");
    t.textContent = this.deck.title;
    this.captionEl.appendChild(t);
    const sm = document.createElement("small");
    this.captionEl.appendChild(sm);
  }

  /** Create, update or remove card elements to match the deck. */
  private syncCards(animate: boolean) {
    const seen = new Set<string>();
    const sections = [...new Set(this.deck.slides.map((s) => s.section))];
    this.deck.slides.forEach((s, i) => {
      seen.add(s.id);
      let el = this.cardEls.get(s.id);
      if (!el) {
        el = document.createElement("div");
        el.dataset.id = s.id;
        el.addEventListener("click", (e) => {
          if (this.dragMoved) return;
          e.stopPropagation();
          this.goToSlide(s.id);
        });
        if (animate) el.style.opacity = "0";
        this.cardsEl.appendChild(el);
        this.cardEls.set(s.id, el);
      }
      el.className = cardClass(s);
      el.innerHTML = cardHtml(s, i + 1, this.settings.brand?.logo);
      el.style.setProperty("--sec", `var(--c${sections.indexOf(s.section) % 5})`);
    });
    for (const [id, el] of this.cardEls) {
      if (!seen.has(id)) {
        el.remove();
        this.cardEls.delete(id);
      }
    }
  }

  private renderLayout(animate: boolean) {
    const ms = animate ? this.morphMs() : 0;
    for (const [id, el] of this.cardEls) {
      const c = this.layout.cards[id];
      if (!c) continue;
      el.style.transitionDuration = `${ms}ms`;
      el.style.transform = `translate(${c.x - CARD_W / 2}px, ${c.y - CARD_H / 2}px) rotate(${c.rotate ?? 0}deg) scale(${c.w / CARD_W})`;
      if (el.style.opacity === "0") requestAnimationFrame(() => (el.style.opacity = ""));
    }
    this.swapLayer(this.decorSvg, this.layout.decor, animate);
    this.swapLayer(this.overlaySvg, this.layout.overlay ?? "", animate);
    this.renderToken();
    this.drawMinimap();
  }

  /** Cross-fade decor between styles. */
  private swapLayer(svg: SVGSVGElement, markup: string, animate: boolean) {
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "mdp-layer");
    g.innerHTML = markup;
    if (!animate) {
      svg.replaceChildren(g);
      return;
    }
    for (const old of Array.from(svg.children)) {
      old.classList.add("is-leaving");
      setTimeout(() => old.remove(), 700);
    }
    g.classList.add("is-entering");
    svg.appendChild(g);
    setTimeout(() => g.classList.remove("is-entering"), this.morphMs() * 0.5);
  }

  private renderToken() {
    const kind = this.layout.token;
    this.tokenEl.hidden = !kind;
    if (!kind) return;
    if (this.tokenEl.dataset.kind !== kind) {
      this.tokenEl.dataset.kind = kind;
      this.tokenEl.innerHTML =
        kind === "pawn"
          ? `<div class="mdp-token-inner"><svg class="mdp-pawn" viewBox="0 0 150 210"><ellipse cx="75" cy="196" rx="70" ry="14" fill="rgba(0,0,0,.25)"/><path d="M30,190 Q30,150 55,135 Q40,120 45,95 Q50,75 75,72 Q100,75 105,95 Q110,120 95,135 Q120,150 120,190 z" style="fill:var(--accent);stroke:var(--ink)" stroke-width="7"/><circle cx="75" cy="48" r="36" style="fill:var(--accent);stroke:var(--ink)" stroke-width="7"/><circle cx="64" cy="38" r="9" fill="#fff" opacity=".7"/></svg></div>`
          : `<div class="mdp-token-inner"><svg class="mdp-traveller" viewBox="0 0 120 160"><ellipse cx="60" cy="150" rx="40" ry="9" fill="rgba(0,0,0,.25)"/><path d="M60,148 C60,148 12,90 12,58 A48,48 0 1 1 108,58 C108,90 60,148 60,148 z" style="fill:var(--accent);stroke:var(--ink)" stroke-width="6"/><circle cx="60" cy="58" r="20" style="fill:var(--ink)"/></svg></div>`;
    }
    this.placeToken(false);
  }

  private tokenTarget(): { x: number; y: number } | null {
    const anchors = this.layout?.anchors;
    if (!anchors) return null;
    const id = this.currentSlideId() ?? (this.index > 0 ? this.deck.slides[this.deck.slides.length - 1]?.id : this.deck.slides[0]?.id);
    return id ? anchors[id] ?? null : null;
  }

  private placeToken(hop: boolean, from?: { x: number; y: number } | null) {
    const p = this.tokenTarget();
    if (!p) return;
    this.tokenEl.style.setProperty("--move-ms", `${PACE_MS[this.settings.pace]}ms`);
    this.tokenEl.style.transform = `translate(${p.x}px, ${p.y}px)`;
    if (hop && this.layout.token === "pawn" && from && (from.x !== p.x || from.y !== p.y)) {
      this.tokenEl.classList.remove("is-hopping");
      void this.tokenEl.offsetWidth;
      this.tokenEl.classList.add("is-hopping");
    }
  }

  // ---------- camera ----------

  private currentStep(): Step {
    return this.layout.steps[this.index] ?? { kind: "overview", rect: this.layout.bounds };
  }

  private currentSlideId(): string | undefined {
    return this.currentStep()?.slideId;
  }

  private viewFor(r: Rect): View {
    const W = this.stage.clientWidth || 1;
    const H = this.stage.clientHeight || 1;
    // Keep the target clear of the control bar at the bottom.
    const bar = this.opts.controls ? Math.min(70, H * 0.12) : 0;
    const scale = Math.min(W / Math.max(r.w, 1), (H - bar) / Math.max(r.h, 1));
    return [r.x + r.w / 2, r.y + r.h / 2 + bar / 2 / scale, W / scale];
  }

  private applyView(v: View) {
    this.view = v;
    const W = this.stage.clientWidth || 1;
    const H = this.stage.clientHeight || 1;
    const s = W / v[2];
    this.world.style.transform = `translate(${W / 2 - v[0] * s}px, ${H / 2 - v[1] * s}px) scale(${s})`;
    this.drawViewport();
  }

  private jumpTo(r: Rect) {
    cancelAnimationFrame(this.anim);
    this.applyView(this.viewFor(r));
  }

  private flyTo(r: Rect, minMs = 0) {
    cancelAnimationFrame(this.anim);
    const from = this.view;
    const to = this.viewFor(r);
    const path = interpolateZoom(from, to);
    const base = PACE_MS[this.settings.pace];
    const dur = Math.max(minMs, Math.min(base * 2.4, base * (0.55 + 0.35 * path.S)));
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || dur < 30 || !isFinite(path.S)) {
      this.applyView(to);
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      this.applyView(path.at(easeInOut(t)));
      if (t < 1) this.anim = requestAnimationFrame(tick);
    };
    this.anim = requestAnimationFrame(tick);
  }

  private afterStep(hop: boolean, from?: { x: number; y: number } | null) {
    const step = this.currentStep();
    const focusId = step.kind === "slide" ? step.slideId : undefined;
    this.el.classList.toggle("is-focused", !!focusId);
    for (const [id, el] of this.cardEls) el.classList.toggle("is-active", id === focusId);
    this.placeToken(hop, from);
    const total = this.layout.steps.length;
    if (this.countEl) this.countEl.textContent = `${this.index + 1} / ${total}`;
    const sm = this.captionEl.querySelector("small");
    if (sm) sm.textContent = step.label ?? (focusId ? this.deck.slides.find((s) => s.id === focusId)?.section ?? "" : "");
    this.drawMinimap();
    this.opts.onStep?.(this.index, step, total);
  }

  // ---------- minimap ----------

  private drawMinimap() {
    if (!this.opts.minimap || !this.layout) return;
    const b = this.layout.bounds;
    const sections = [...new Set(this.deck.slides.map((s) => s.section))];
    const focusId = this.currentStep()?.kind === "slide" ? this.currentSlideId() : undefined;
    let inner = "";
    const ids = this.deck.slides.map((s) => s.id);
    const centres = ids.map((id) => this.layout.cards[id]).filter(Boolean);
    if (centres.length > 1) {
      inner += `<polyline points="${centres.map((c) => `${c.x},${c.y}`).join(" ")}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="${b.w / 220}"/>`;
    }
    this.deck.slides.forEach((s) => {
      const c = this.layout.cards[s.id];
      if (!c) return;
      const w = c.w;
      const h = (c.w * CARD_H) / CARD_W;
      const active = s.id === focusId;
      inner += `<rect data-id="${s.id}" x="${c.x - w / 2}" y="${c.y - h / 2}" width="${w}" height="${h}" rx="${w / 14}" style="fill:${active ? "#fff" : `var(--c${sections.indexOf(s.section) % 5})`}" opacity="${active ? 1 : 0.8}"/>`;
    });
    inner += `<rect class="mdp-mini-view" fill="none" stroke="#fff" stroke-width="${b.w / 120}" rx="${b.w / 80}"/>`;
    this.miniEl.innerHTML = `<svg viewBox="${b.x} ${b.y} ${b.w} ${b.h}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
    this.drawViewport();
  }

  private drawViewport() {
    if (!this.opts.minimap) return;
    const r = this.miniEl.querySelector(".mdp-mini-view");
    if (!r) return;
    const W = this.stage.clientWidth || 1;
    const H = this.stage.clientHeight || 1;
    const [cx, cy, vw] = this.view;
    const vh = (vw * H) / W;
    r.setAttribute("x", String(cx - vw / 2));
    r.setAttribute("y", String(cy - vh / 2));
    r.setAttribute("width", String(vw));
    r.setAttribute("height", String(vh));
  }

  // ---------- interaction ----------

  private dragMoved = false;

  private bindPointer() {
    let start: { x: number; y: number; view: View } | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      start = { x: e.clientX, y: e.clientY, view: this.view };
      this.dragMoved = false;
    };
    const onMove = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!this.dragMoved && Math.hypot(dx, dy) < 6) return;
      if (!this.dragMoved) {
        this.dragMoved = true;
        this.stage.classList.add("is-dragging");
        this.stage.setPointerCapture?.(e.pointerId);
        cancelAnimationFrame(this.anim);
      }
      const s = this.view[2] / (this.stage.clientWidth || 1);
      this.applyView([start.view[0] - dx * s, start.view[1] - dy * s, start.view[2]]);
    };
    const onUp = () => {
      start = null;
      this.stage.classList.remove("is-dragging");
      setTimeout(() => (this.dragMoved = false), 0);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cancelAnimationFrame(this.anim);
      const rect = this.stage.getBoundingClientRect();
      const W = rect.width || 1;
      const H = rect.height || 1;
      const [cx, cy, vw] = this.view;
      const s = W / vw;
      // World point under the cursor stays put while zooming.
      const wx = cx + (e.clientX - rect.left - W / 2) / s;
      const wy = cy + (e.clientY - rect.top - H / 2) / s;
      const k = Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      const b = this.layout.bounds;
      const nvw = Math.max(300, Math.min(Math.max(b.w, b.h) * 3, vw * k));
      const ns = W / nvw;
      this.applyView([wx - (e.clientX - rect.left - W / 2) / ns, wy - (e.clientY - rect.top - H / 2) / ns, nvw]);
    };
    const onMini = (e: MouseEvent) => {
      const svg = this.miniEl.querySelector("svg");
      if (!svg) return;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const m = svg.getScreenCTM();
      if (!m) return;
      const p = pt.matrixTransform(m.inverse());
      let best: string | undefined;
      let bestD = Infinity;
      for (const s of this.deck.slides) {
        const c = this.layout.cards[s.id];
        if (!c) continue;
        const d = Math.hypot(c.x - p.x, c.y - p.y);
        if (d < bestD) {
          bestD = d;
          best = s.id;
        }
      }
      if (best) this.goToSlide(best);
    };
    this.stage.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    this.stage.addEventListener("wheel", onWheel, { passive: false });
    this.miniEl.addEventListener("click", onMini);
    this.disposers.push(() => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    });
  }

  private bindKeys() {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k === "ArrowRight" || k === "ArrowDown" || k === " " || k === "PageDown" || k === "Enter") this.next();
      else if (k === "ArrowLeft" || k === "ArrowUp" || k === "PageUp" || k === "Backspace") this.prev();
      else if (k === "Home") this.go(0);
      else if (k === "End") this.go(this.layout.steps.length - 1);
      else if (k === "o" || k === "O") this.overview();
      else if (k === "m" || k === "M") this.setMinimap(!this.opts.minimap);
      else if (k === "f" || k === "F") this.toggleFullscreen();
      else if (/^[1-9]$/.test(k) && STYLES[Number(k) - 1]) this.setStyle(STYLES[Number(k) - 1].id);
      else if (k === "Escape" && !document.fullscreenElement) this.opts.onExit?.();
      else return;
      e.preventDefault();
      this.wake();
    };
    window.addEventListener("keydown", onKey);
    this.disposers.push(() => window.removeEventListener("keydown", onKey));
  }

  private bindIdle() {
    const wake = () => this.wake();
    this.el.addEventListener("pointermove", wake);
    this.wake();
  }

  private wake() {
    this.el.classList.remove("is-idle");
    clearTimeout(this.idleTimer);
    this.idleTimer = window.setTimeout(() => this.el.classList.add("is-idle"), 3000);
  }

  toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else this.el.requestFullscreen?.().catch(() => {});
  }

  private toast(text: string) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add("is-on");
    setTimeout(() => this.toastEl.classList.remove("is-on"), 1800);
  }

  private buildChrome() {
    const c = document.createElement("div");
    c.className = "mdp-chrome";
    const btn = (label: string, title: string, fn: () => void, cls = "") => {
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = label;
      b.title = title;
      if (cls) b.className = cls;
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        fn();
      });
      c.appendChild(b);
      return b;
    };
    const sep = () => c.appendChild(Object.assign(document.createElement("span"), { className: "mdp-sep" }));
    btn("◀", "Previous (←)", () => this.prev());
    this.countEl = document.createElement("span");
    this.countEl.className = "mdp-count";
    c.appendChild(this.countEl);
    btn("▶", "Next (→ or space)", () => this.next());
    sep();
    btn("⌂", "Overview (O)", () => this.overview());
    btn("▦", "Minimap (M)", () => this.setMinimap(!this.opts.minimap)).dataset.role = "mini";
    sep();
    c.appendChild(Object.assign(document.createElement("span"), { className: "mdp-remix-label", textContent: "Remix" }));
    STYLES.forEach((s, i) => {
      const b = btn(s.emoji, `${s.name} (${i + 1})`, () => this.setStyle(s.id));
      b.dataset.style = s.id;
    });
    if (this.opts.extraButtons?.length || this.opts.onExit) sep();
    for (const x of this.opts.extraButtons ?? []) btn(x.label, x.title, x.onClick);
    btn("⛶", "Full screen (F)", () => this.toggleFullscreen(), "mdp-hide-sm");
    if (this.opts.onExit) btn("✕", "Exit (Esc)", () => this.opts.onExit?.());
    this.el.appendChild(c);
    this.chromeEl = c;
    this.updateChrome();
  }

  private updateChrome() {
    if (!this.chromeEl) return;
    for (const b of Array.from(this.chromeEl.querySelectorAll<HTMLButtonElement>("button[data-style]"))) {
      b.setAttribute("aria-pressed", String(b.dataset.style === this.settings.style));
    }
    const mini = this.chromeEl.querySelector<HTMLButtonElement>("button[data-role=mini]");
    mini?.setAttribute("aria-pressed", String(!!this.opts.minimap));
  }
}
