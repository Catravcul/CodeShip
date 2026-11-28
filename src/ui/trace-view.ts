import "./trace.css";
import type { Chore } from "@modules/chores/domain/chore";
import { ELEMENT_COLOR, type Compound, type Particle } from "@modules/trazos/data/compounds";
import { glyphOf } from "@modules/trazos/data/glyphs";
import { formulaText, parseFormula, type FormulaGlyph } from "@modules/trazos/domain/formula";
import { TraceRun } from "@modules/trazos/domain/run";
import { bounds, pt, resample, type Pt } from "@modules/trazos/domain/shape";
import { StrokeTracker, WHY_TEXT } from "@modules/trazos/domain/trace";
import { choreParts, glyphBeats, stepsUpTo } from "@modules/trazos/application/trace-chore";

/**
 * THE WAND: A CHALLENGE DRAWN AS A COMPOUND (Berón, 2026-11-25; docs/design/retos-trazos.md). In the challenge sheet's
 * place (only the sheet and the scene are seen, reglas.md §4.3, as with ui/duel-view.ts): the whole formula above with
 * the glyph to draw lit, and that glyph big, with its guide (the start dot, arrows the way to go) and the finger's
 * glowing trail, in the compound's look (its palette and particles: drops, bubbles, cubic crystals…). Finger or mouse
 * (pointer events). When the formula is done its molecule is drawn and the challenge closes, right; «×» leaves it.
 */
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const ROLE_NAME = { base: "", sub: "subíndice ", sup: "superíndice " } as const;
const glyphName = (f: FormulaGlyph) => (/[0-9]/.test(f.char) ? `${ROLE_NAME[f.role]}${f.char}` : f.char === "+" ? "signo más" : f.char === "−" ? "signo menos" : f.char === "(" ? "paréntesis que abre" : f.char === ")" ? "paréntesis que cierra" : `${f.char === f.char.toUpperCase() ? "letra" : "minúscula"} ${f.char}`);

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  age: number;
  size: number;
  spin: number;
}

/** The view's frame (CSS px) round the glyph: em units to px. */
interface Fit {
  s: number;
  ox: number;
  oy: number;
}

export interface TraceOpen {
  readonly title: string;
  readonly compound: Compound;
  /** A glyph finished (index, of how many). */
  readonly onGlyph?: (i: number, of: number) => void;
  readonly onEnd: (ok: boolean) => void;
}

export class TraceView {
  private readonly el: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly titleEl: HTMLElement;
  private readonly formulaEl: HTMLElement;
  private readonly hintEl: HTMLElement;
  private readonly nameEl: HTMLElement;
  private readonly stepsEl: HTMLElement;
  private opts?: TraceOpen;
  private run?: TraceRun;
  private glyphs: FormulaGlyph[] = [];
  private tracker?: StrokeTracker;
  private pointer?: number;
  /** The strokes of the glyph now already drawn right (px). */
  private inked: Pt[][] = [];
  private trail: { x: number; y: number; t: number }[] = [];
  private sparks: Spark[] = [];
  private shake = 0;
  private flash = 0;
  private finale = 0;
  private raf = 0;
  private last = 0;

  constructor(
    root: HTMLElement,
    /** The challenge sheet whose place it takes (its `standIn` keeps the scene's lens and pause on). */
    private readonly sheet?: { standIn: boolean },
  ) {
    this.el = document.createElement("div");
    this.el.className = "trace hidden";
    this.el.setAttribute("role", "dialog");
    this.el.setAttribute("aria-modal", "false");
    this.el.innerHTML = `
      <div class="trace-top"><h2 class="trace-title"></h2><button class="trace-close" type="button" aria-label="Cerrar el reto sin terminarlo">×</button></div>
      <div class="trace-formula" aria-live="polite"></div>
      <div class="trace-pad"><canvas class="trace-canvas" role="img"></canvas></div>
      <p class="trace-hint" role="status" aria-live="polite"></p>
      <div class="trace-foot"><span class="trace-name"></span><span class="trace-steps"></span></div>`;
    root.appendChild(this.el);
    this.canvas = this.el.querySelector("canvas")!;
    this.ctx = this.canvas.getContext("2d")!;
    this.titleEl = this.el.querySelector(".trace-title")!;
    this.formulaEl = this.el.querySelector(".trace-formula")!;
    this.hintEl = this.el.querySelector(".trace-hint")!;
    this.nameEl = this.el.querySelector(".trace-name")!;
    this.stepsEl = this.el.querySelector(".trace-steps")!;
    this.el.querySelector(".trace-close")!.addEventListener("click", () => this.close(false));
    const c = this.canvas;
    c.addEventListener("pointerdown", (e) => this.down(e));
    c.addEventListener("pointermove", (e) => this.move(e));
    c.addEventListener("pointerup", (e) => this.up(e));
    c.addEventListener("pointercancel", (e) => this.up(e));
    c.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  get visible(): boolean {
    return !this.el.classList.contains("hidden");
  }

  open(o: TraceOpen): void {
    this.opts = o;
    this.glyphs = parseFormula(o.compound.formula);
    this.run = new TraceRun(this.glyphs, glyphOf);
    this.inked = [];
    this.trail = [];
    this.sparks = [];
    this.finale = 0;
    this.tracker = undefined;
    const [c0, c1, c2] = o.compound.look.palette;
    this.el.style.setProperty("--tc0", c0);
    this.el.style.setProperty("--tc1", c1);
    this.el.style.setProperty("--tc2", c2);
    this.titleEl.textContent = o.title;
    this.el.setAttribute("aria-label", `Reto: ${o.title}. Dibuja ${o.compound.name}, ${formulaText(o.compound.formula)}`);
    this.nameEl.textContent = `${o.compound.name} · ${o.compound.real}`;
    this.hint("Pasa el dedo por la figura: empieza en el punto y sigue la flecha");
    this.el.classList.remove("hidden");
    document.body.classList.add("in-duel", "in-trace");
    if (this.sheet) this.sheet.standIn = true;
    this.renderFormula();
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  /** «Pasos 2/5»: the challenge's steps done so far. */
  setSteps(done: number, of: number): void {
    this.stepsEl.textContent = `Pasos ${done}/${of}`;
  }

  close(ok: boolean): void {
    if (!this.visible) return;
    this.el.classList.add("hidden");
    document.body.classList.remove("in-duel", "in-trace");
    if (this.sheet) this.sheet.standIn = false;
    cancelAnimationFrame(this.raf);
    const o = this.opts;
    this.opts = undefined;
    o?.onEnd(ok);
  }

  // --- Test hooks (window.codeshipS3.trace) -------------------------------------------------------------------------
  /** The ideal finger paths (client px) of the glyph now, from the stroke to draw on: the journeys trace with them. */
  ideal(): { x: number; y: number }[][] {
    const g = this.run?.glyph;
    if (!g || this.finale) return [];
    const r = this.canvas.getBoundingClientRect();
    const f = this.fit();
    return g.strokes.slice(this.run!.strokeIndex).map((s) => resample(this.px(s, f), 6).map((p) => ({ x: r.left + p.x, y: r.top + p.y })));
  }
  /** Where the drawing is: the formula, the glyph and stroke now, and whether the molecule is showing. */
  get state(): { formula: string; glyph: number; of: number; char?: string; stroke: number; finale: boolean } | undefined {
    const run = this.run;
    if (!run || !this.visible) return undefined;
    return { formula: this.opts?.compound.formula ?? "", glyph: run.glyphIndex, of: this.glyphs.length, char: run.glyph?.char, stroke: run.strokeIndex, finale: this.finale > 0 };
  }

  // --- Drawing with the finger --------------------------------------------------------------------------------------
  private at(e: PointerEvent): Pt {
    const r = this.canvas.getBoundingClientRect();
    return pt(e.clientX - r.left, e.clientY - r.top);
  }
  private down(e: PointerEvent): void {
    const run = this.run;
    const stroke = run?.stroke;
    if (!run || !stroke || this.finale || this.pointer !== undefined) return;
    e.preventDefault();
    this.pointer = e.pointerId;
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* a synthetic pointer */
    }
    const f = this.fit();
    const h = run.help;
    this.tracker = new StrokeTracker(this.px(stroke, f), this.tol(f) * h.widen, h.rules);
    this.trail = [];
    this.feed(this.at(e));
  }
  private move(e: PointerEvent): void {
    if (e.pointerId !== this.pointer || !this.tracker) return;
    e.preventDefault();
    const evs = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
    for (const q of evs.length ? evs : [e]) this.feed(this.at(q));
  }
  private feed(p: Pt): void {
    this.tracker!.add(p);
    this.trail.push({ x: p.x, y: p.y, t: performance.now() });
    this.emit(p.x, p.y, 1);
  }
  private up(e: PointerEvent): void {
    if (e.pointerId !== this.pointer) return;
    this.pointer = undefined;
    const t = this.tracker;
    const run = this.run;
    this.tracker = undefined;
    if (!t || !run || run.done) return;
    const check = t.finish();
    const g = run.glyphIndex;
    const ev = run.submit(check);
    if (ev === "repite") {
      this.shake = 1;
      this.hint(`${WHY_TEXT[check.why ?? "corto"]}${run.help.widen > 1 ? " (ahora con más margen)" : ""}`);
      return;
    }
    this.inked.push(t.samples);
    if (ev === "trazo") return this.hint("Bien: ahora el siguiente trazo, desde su punto");
    // A glyph done: a burst in its look, the formula moves on.
    const f = this.fit();
    for (const s of this.inked) for (const p of s.filter((_, i) => i % 3 === 0)) this.emit(p.x, p.y, 1);
    this.inked = [];
    this.flash = 1;
    this.opts?.onGlyph?.(g, this.glyphs.length);
    this.renderFormula();
    void f;
    if (ev === "compuesto") {
      this.finale = performance.now();
      this.hint(`${this.opts?.compound.name}: ${formulaText(this.opts?.compound.formula ?? "")} completo`);
      return;
    }
    this.hint(`¡${this.glyphs[g]!.char}! Ahora: ${glyphName(this.glyphs[g + 1]!)}`);
  }

  private hint(text: string): void {
    this.hintEl.textContent = text;
    this.updateLabel();
  }

  private updateLabel(): void {
    const run = this.run;
    const g = run?.glyph;
    const f = this.glyphs[run?.glyphIndex ?? 0];
    this.canvas.setAttribute(
      "aria-label",
      g && f && !this.finale
        ? `Dibuja ${glyphName(f)}: trazo ${run!.strokeIndex + 1} de ${g.strokes.length}. ${this.hintEl.textContent ?? ""}`
        : `Molécula de ${this.opts?.compound.name ?? ""}`,
    );
  }

  private renderFormula(): void {
    const i = this.run?.glyphIndex ?? 0;
    this.formulaEl.innerHTML = this.glyphs
      .map((f, k) => `<span class="tg ${f.role}${k < i ? " done" : k === i ? " now" : ""}" aria-hidden="true">${esc(f.char)}</span>`)
      .join("");
    const f = this.glyphs[i];
    this.formulaEl.setAttribute("aria-label", `Fórmula ${formulaText(this.opts?.compound.formula ?? "")}${f ? `: ahora ${glyphName(f)}, ${i + 1} de ${this.glyphs.length}` : ": completa"}`);
    this.formulaEl.setAttribute("role", "img");
    this.updateLabel();
  }

  // --- Geometry -----------------------------------------------------------------------------------------------------
  private size(): { w: number; h: number } {
    return { w: this.canvas.clientWidth || 1, h: this.canvas.clientHeight || 1 };
  }
  /** The glyph now in the middle of the pad: every glyph on the same baseline and size (em −0,05 to 1,35 tall). */
  private fit(): Fit {
    const { w, h } = this.size();
    const g = this.run?.glyph;
    const width = g?.width ?? 0.6;
    const m = 18;
    const s = Math.max(10, Math.min((h - 2 * m) / 1.4, (w - 2 * m) / Math.max(width, 0.9)));
    return { s, ox: (w - width * s) / 2, oy: (h - 1.4 * s) / 2 + 0.05 * s };
  }
  private px(line: readonly Pt[], f: Fit): Pt[] {
    return line.map((p) => pt(f.ox + p.x * f.s, f.oy + p.y * f.s));
  }
  /** How far the finger may be from the line: 12 % of the glyph's height, at least 18 px. */
  private tol(f: Fit): number {
    return Math.max(18, 0.12 * f.s);
  }

  // --- Particles: the compound's look --------------------------------------------------------------------------------
  private emit(x: number, y: number, n: number): void {
    const kind = this.opts?.compound.look.particle ?? "chispas";
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 20 + Math.random() * 40;
      const s: Spark = { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.9 + Math.random() * 0.6, age: 0, size: 3 + Math.random() * 4, spin: Math.random() * 6 };
      if (kind === "gotas") s.vy = -30 + Math.random() * 20;
      if (kind === "burbujas" || kind === "llamas" || kind === "humo") s.vy = -30 - Math.random() * 40;
      if (kind === "humo") s.size = 6 + Math.random() * 6;
      if (kind === "chispas") ((s.vx *= 3), (s.vy *= 3), (s.life = 0.4));
      this.sparks.push(s);
    }
    if (this.sparks.length > 400) this.sparks.splice(0, this.sparks.length - 400);
  }
  private stepSparks(dt: number, kind: Particle): void {
    for (const s of this.sparks) {
      s.age += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (kind === "gotas" || kind === "polvo") s.vy += (kind === "gotas" ? 260 : 40) * dt;
      if (kind === "burbujas") s.vx += Math.sin(s.age * 8 + s.spin) * 30 * dt;
      if (kind === "humo") s.size += 10 * dt;
      s.vx *= 1 - 1.5 * dt;
      s.spin += dt * 3;
    }
    this.sparks = this.sparks.filter((s) => s.age < s.life);
  }
  private drawSpark(c: CanvasRenderingContext2D, s: Spark, kind: Particle, col: string, glow: string): void {
    const k = 1 - s.age / s.life;
    c.globalAlpha = Math.max(0, k);
    c.fillStyle = col;
    c.strokeStyle = glow;
    switch (kind) {
      case "gotas":
        c.beginPath();
        c.arc(s.x, s.y, s.size * 0.6, 0, Math.PI);
        c.lineTo(s.x, s.y - s.size * 1.4);
        c.closePath();
        c.fill();
        break;
      case "burbujas":
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        c.stroke();
        c.beginPath();
        c.arc(s.x - s.size * 0.35, s.y - s.size * 0.35, s.size * 0.25, 0, Math.PI * 2);
        c.fillStyle = glow;
        c.fill();
        break;
      case "cristales": {
        // A little cube seen corner on: three faces.
        const r = s.size;
        c.save();
        c.translate(s.x, s.y);
        c.rotate(s.spin * 0.3);
        c.fillStyle = glow;
        c.fillRect(-r / 2, -r / 2, r, r);
        c.strokeStyle = col;
        c.lineWidth = 1;
        c.strokeRect(-r / 2, -r / 2, r, r);
        c.beginPath();
        c.moveTo(-r / 2, -r / 2);
        c.lineTo(-r / 4, -r * 0.8);
        c.lineTo(r * 0.75, -r * 0.8);
        c.lineTo(r / 2, -r / 2);
        c.moveTo(r * 0.75, -r * 0.8);
        c.lineTo(r * 0.75, r * 0.2);
        c.lineTo(r / 2, r / 2);
        c.stroke();
        c.restore();
        break;
      }
      case "chispas":
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(s.x, s.y);
        c.lineTo(s.x - s.vx * 0.04, s.y - s.vy * 0.04);
        c.stroke();
        break;
      case "humo":
        c.globalAlpha = Math.max(0, k * 0.35);
        c.beginPath();
        c.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        c.fill();
        break;
      case "llamas":
        c.fillStyle = k > 0.5 ? glow : col;
        c.beginPath();
        c.ellipse(s.x, s.y, s.size * 0.5 * k + 1, s.size * k + 1, 0, 0, Math.PI * 2);
        c.fill();
        break;
      case "fibras":
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(s.x - Math.cos(s.spin) * s.size * 1.6, s.y - Math.sin(s.spin) * s.size * 1.6);
        c.quadraticCurveTo(s.x + s.size, s.y - s.size, s.x + Math.cos(s.spin) * s.size * 1.6, s.y + Math.sin(s.spin) * s.size * 1.6);
        c.stroke();
        break;
      case "polvo":
        c.beginPath();
        c.arc(s.x, s.y, s.size * 0.35, 0, Math.PI * 2);
        c.fill();
        break;
    }
    c.globalAlpha = 1;
  }

  // --- Each frame ---------------------------------------------------------------------------------------------------
  private frame(t: number): void {
    if (!this.visible) return;
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    const cv = this.canvas;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const { w, h } = this.size();
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    const c = this.ctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    const look = this.opts?.compound.look;
    const [c0, c1, c2] = look?.palette ?? ["#fff", "#fff", "#000"];
    const kind = look?.particle ?? "chispas";
    const bg = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) * 0.7);
    bg.addColorStop(0, c2);
    bg.addColorStop(1, "#05060c");
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);
    this.shake = Math.max(0, this.shake - dt * 3);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    c.save();
    if (this.shake) c.translate(Math.sin(t / 25) * 8 * this.shake, 0);
    if (this.finale) this.drawMolecule(c, w, h, (t - this.finale) / 1000, c0, c1);
    else this.drawGlyph(c, t, c0, c1);
    this.stepSparks(dt, kind);
    for (const s of this.sparks) this.drawSpark(c, s, kind, c0, c1);
    c.restore();
    if (this.finale && t - this.finale > 2600) return this.close(true);
    this.raf = requestAnimationFrame((q) => this.frame(q));
  }

  private drawGlyph(c: CanvasRenderingContext2D, t: number, c0: string, c1: string): void {
    const run = this.run;
    const g = run?.glyph;
    if (!run || !g) return;
    const f = this.fit();
    const tol = this.tol(f);
    const path = (pts: readonly Pt[]) => {
      c.beginPath();
      pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    };
    c.lineCap = "round";
    c.lineJoin = "round";
    // The shape: every stroke, wide and faint (the band the finger may move in).
    const strokes = g.strokes.map((s) => this.px(s, f));
    c.strokeStyle = "rgba(255,255,255,0.07)";
    c.lineWidth = tol * 2;
    for (const s of strokes) (path(s), c.stroke());
    c.strokeStyle = "rgba(255,255,255,0.16)";
    c.lineWidth = 2;
    for (const s of strokes) (path(s), c.stroke());
    // The strokes already drawn, lit.
    c.shadowColor = c0;
    c.shadowBlur = 16;
    c.strokeStyle = c0;
    c.lineWidth = Math.max(6, f.s * 0.07);
    for (const s of this.inked) (path(s), c.stroke());
    // The stroke to draw: the guide, filling in as the finger goes.
    const now = strokes[run.strokeIndex];
    if (now) {
      c.shadowBlur = 0;
      c.setLineDash([10, 9]);
      c.lineDashOffset = -t / 40;
      c.strokeStyle = c1;
      c.globalAlpha = 0.7;
      c.lineWidth = 3;
      path(now);
      c.stroke();
      c.setLineDash([]);
      c.globalAlpha = 1;
      const tr = this.tracker;
      if (tr) {
        const upto = tr.samples.slice(0, Math.max(1, Math.round(tr.progress * tr.samples.length)));
        c.shadowColor = c0;
        c.shadowBlur = 18;
        c.strokeStyle = c0;
        c.lineWidth = Math.max(6, f.s * 0.07);
        path(upto);
        c.stroke();
        c.shadowBlur = 0;
      }
      // Arrows the way to go, every ~70 px.
      const rs = resample(now, 6);
      const every = Math.max(4, Math.round(70 / 6));
      c.fillStyle = c1;
      for (let i = every; i < rs.length - 2; i += every) {
        const a = rs[i]!;
        const b = rs[i + 1]!;
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        c.save();
        c.translate(a.x, a.y);
        c.rotate(ang);
        c.beginPath();
        c.moveTo(9, 0);
        c.lineTo(-6, -7);
        c.lineTo(-2, 0);
        c.lineTo(-6, 7);
        c.closePath();
        c.fill();
        c.restore();
      }
      // The start dot, pulsing (an arrowhead at the end of a short stroke too).
      const s0 = now[0]!;
      const pulse = 1 + 0.25 * Math.sin(t / 180);
      c.shadowColor = c1;
      c.shadowBlur = 20;
      c.fillStyle = c1;
      c.beginPath();
      c.arc(s0.x, s0.y, Math.max(9, f.s * 0.045) * pulse, 0, Math.PI * 2);
      c.fill();
      c.shadowBlur = 0;
      c.fillStyle = "#05060c";
      c.font = `bold ${Math.round(Math.max(10, f.s * 0.05))}px system-ui, sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(String(run.strokeIndex + 1), s0.x, s0.y + 0.5);
    }
    // The wand's trail: the last half second of the finger, glowing and thinning.
    const tn = performance.now();
    this.trail = this.trail.filter((p) => tn - p.t < 500);
    for (let i = 1; i < this.trail.length; i++) {
      const a = this.trail[i - 1]!;
      const b = this.trail[i]!;
      const k = 1 - (tn - b.t) / 500;
      c.strokeStyle = c1;
      c.shadowColor = c0;
      c.shadowBlur = 14;
      c.globalAlpha = k;
      c.lineWidth = 2 + 8 * k;
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.stroke();
    }
    c.globalAlpha = 1;
    c.shadowBlur = 0;
    const tip = this.trail.at(-1);
    if (tip && this.tracker) {
      const r = c.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 22);
      r.addColorStop(0, "#ffffff");
      r.addColorStop(0.3, c1);
      r.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = r;
      c.beginPath();
      c.arc(tip.x, tip.y, 22, 0, Math.PI * 2);
      c.fill();
    }
    if (this.flash) {
      c.globalAlpha = this.flash * 0.4;
      c.fillStyle = c1;
      c.fillRect(0, 0, this.size().w, this.size().h);
      c.globalAlpha = 1;
    }
  }

  /** The closing animation: the molecule (or a bit of the crystal), its atoms popping in and the bonds drawn. */
  private drawMolecule(c: CanvasRenderingContext2D, w: number, h: number, sec: number, c0: string, c1: string): void {
    const cp = this.opts!.compound;
    const m = cp.molecule;
    const b = bounds([m.atoms.map((a) => pt(a.x, a.y))]);
    const top = 34;
    const k = Math.min(70, (w - 40) / Math.max(1, b.x1 - b.x0 + 1), (h - top - 50) / Math.max(1, b.y1 - b.y0 + 1));
    const cx = w / 2 - ((b.x0 + b.x1) / 2) * k;
    const cy = top + (h - top - 40) / 2 - ((b.y0 + b.y1) / 2) * k;
    const wob = Math.sin(sec * 2) * 0.04;
    const P = (a: { x: number; y: number }) => {
      const x = a.x * Math.cos(wob) - a.y * Math.sin(wob);
      const y = a.x * Math.sin(wob) + a.y * Math.cos(wob);
      return { x: cx + x * k, y: cy + y * k };
    };
    const per = Math.min(0.12, 1.2 / m.atoms.length);
    const shown = (i: number) => Math.max(0, Math.min(1, (sec - i * per) / 0.25));
    c.lineCap = "round";
    for (const bd of m.bonds) {
      const s = Math.min(shown(bd.a), shown(bd.b));
      if (!s) continue;
      const A = P(m.atoms[bd.a]!);
      const B = P(m.atoms[bd.b]!);
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const L = Math.hypot(dx, dy) || 1;
      const nx = (-dy / L) * 4;
      const ny = (dx / L) * 4;
      c.globalAlpha = s;
      c.strokeStyle = bd.n === 0 ? c1 : "#e8e4ff";
      c.lineWidth = bd.n === 0 ? 1.5 : 3;
      c.setLineDash(bd.n === 0 ? [4, 5] : []);
      const offs = bd.n === 2 ? [-1, 1] : bd.n === 3 ? [-1.6, 0, 1.6] : [0];
      for (const o of offs) {
        c.beginPath();
        c.moveTo(A.x + nx * o, A.y + ny * o);
        c.lineTo(A.x + nx * o + dx * s, A.y + ny * o + dy * s);
        c.stroke();
      }
    }
    c.setLineDash([]);
    m.atoms.forEach((a, i) => {
      const s = shown(i);
      if (!s) return;
      if (s < 1 && s > 0.9) this.emit(P(a).x, P(a).y, 2);
      const p = P(a);
      const r = (a.el === "H" ? 0.2 : 0.3) * k * (s < 1 ? 0.6 + 0.6 * s : 1);
      c.globalAlpha = 1;
      c.shadowColor = c0;
      c.shadowBlur = 14;
      const col = ELEMENT_COLOR[a.el] ?? "#ccc";
      const gr = c.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, r * 0.1, p.x, p.y, r);
      gr.addColorStop(0, "#ffffffaa");
      gr.addColorStop(0.3, col);
      gr.addColorStop(1, col);
      c.fillStyle = gr;
      c.beginPath();
      c.arc(p.x, p.y, r, 0, Math.PI * 2);
      c.fill();
      c.shadowBlur = 0;
      if (r > 9) {
        c.fillStyle = ["H", "S", "Si", "Mg", "Ca", "Cl", "Ag", "Co"].includes(a.el) ? "#111" : "#fff";
        c.font = `bold ${Math.round(r * 0.9)}px system-ui, sans-serif`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(a.el, p.x, p.y + 0.5);
      }
    });
    c.globalAlpha = Math.min(1, sec / 0.6);
    c.fillStyle = c1;
    c.textAlign = "center";
    c.textBaseline = "top";
    c.font = `bold 20px system-ui, sans-serif`;
    c.fillText(`${formulaText(cp.formula)} · ${cp.name}`, w / 2, 8, w - 16);
    c.font = `13px system-ui, sans-serif`;
    c.fillStyle = "#c9c4e8";
    c.textBaseline = "bottom";
    c.fillText(m.kind === "red" ? "Un trozo de su cristal" : m.withH ? "Su molécula" : "Su molécula (sin los H, como la dibujan los químicos)", w / 2, h - 8, w - 16);
    c.globalAlpha = 1;
  }
}

/**
 * A challenge drawn as a compound, for any sanctuary (sanctuary 3 opens all its challenges this way): the chore's steps
 * keep their beats, glyph i of G completing the steps up to ⌈(i+1)·N/G⌉ (application/trace-chore.ts); `done(true)`
 * when the whole formula is drawn, `done(false)` on «×».
 */
export function openTraceChallenge(view: TraceView, chore: Chore, compound: Compound, beat: (index: number, part: number) => void, done: (ok: boolean) => void): void {
  const parts = choreParts(chore);
  view.open({
    title: chore.title,
    compound,
    onGlyph: (i, of) => {
      for (const [index, part] of glyphBeats(parts, i, of)) beat(index, part);
      view.setSteps(stepsUpTo(i, of, parts.length), parts.length);
    },
    onEnd: done,
  });
  view.setSteps(0, parts.length);
}
