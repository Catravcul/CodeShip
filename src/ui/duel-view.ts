import type { Answer, CodeBlock, Exercise } from "@modules/mind-duel/domain/exercise";
import { Attempts, sessionOutcome } from "@modules/mind-duel/domain/attempts";
import { keepRight, pickStep, slotMarks, wrongPicks } from "@modules/mind-duel/domain/order-steps";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Stable pseudo-random order for the tray, so the solution is never shown in order. */
function trayOrder(ex: Exercise & { kind: "order" }): CodeBlock[] {
  const blocks = [...ex.blocks];
  let h = 0;
  for (const c of ex.id) h = (h * 31 + c.charCodeAt(0)) | 0;
  for (let i = blocks.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) | 0;
    const j = Math.abs(h) % (i + 1);
    [blocks[i], blocks[j]] = [blocks[j]!, blocks[i]!];
  }
  if (blocks.every((b, i) => b.id === ex.solution[i]) && blocks.length > 1) blocks.push(blocks.shift()!);
  return blocks;
}

/** What the screen needs from a duel with a mind or from a chore: the current challenge and two meters. */
export interface SessionLike {
  readonly current: Exercise | undefined;
  readonly progress: number;
  readonly goal: number;
  readonly lives: number;
  readonly maxLives: number;
}

const UI_KEY = "codeship.retos-ui";
/** Player setting: HUD challenge UI (floating over the scene like the cockpit HUD) or the full panel. */
export function compactUi(): boolean {
  try {
    return localStorage.getItem(UI_KEY) === "compacta";
  } catch {
    return false;
  }
}
export function setCompactUi(on: boolean): void {
  try {
    localStorage.setItem(UI_KEY, on ? "compacta" : "panel");
  } catch {
    /* private mode: keep it for this session only */
  }
  document.body.classList.toggle("ui-compact", on);
}

const ORDER_KEY = "codeship.retos-ordenar";
/**
 * Player setting for order challenges: «Paso a paso» (each pick checked at once, a wrong pick is one
 * failure, like the recipe steps) or «Ordenar todo y enviar» (default: place every block, then send;
 * a wrong order marks each slot ✓/✗). Exported for the general settings.
 */
export function stepByStep(): boolean {
  try {
    return localStorage.getItem(ORDER_KEY) === "pasos";
  } catch {
    return stepFallback;
  }
}
let stepFallback = false;
export function setStepByStep(on: boolean): void {
  stepFallback = on;
  try {
    localStorage.setItem(ORDER_KEY, on ? "pasos" : "todo");
  } catch {
    /* private mode: keep it for this session only */
  }
}

export interface SessionText {
  readonly title: string;
  /** Panel view: label of the progress meter ("Persuasión", "Plan", "Pasos"). */
  readonly progress: string;
  /** Panel view: label of the lives meter ("Paciencia", "Intentos"). */
  readonly lives?: string;
  /** HUD view: what a right answer is, in plural, after the hit count ("ideas", "pasos"); defaults to `progress`. */
  readonly unit?: string;
  readonly order: string;
  readonly submit: string;
  readonly ok: string;
  readonly bad: string;
  /** Bottom sheet: leaves the 3D scene visible above (chores, yoga). */
  readonly sheet?: boolean;
}

export const asteroidText = (name: string): SessionText => ({
  title: `Mente de ${name}`,
  progress: "Persuasión",
  lives: "Paciencia",
  unit: "ideas",
  order: "Ordena el pensamiento",
  submit: "Enviar idea",
  ok: "La idea encaja: el asteroide se deja persuadir",
  bad: "La idea se rechaza: pierde paciencia",
});

/**
 * Mobile-first challenge screen, shared by duels with minds and by chores on board. Tap a block in the tray to place it; tap a placed block to send it back.
 * Every block shows Spanish pseudocode or JavaScript.
 */
export class DuelView {
  private readonly el: HTMLElement;
  private showJs = false;
  /** Order challenges: the block in each slot (a gap where the player took one out). */
  private slots: (string | undefined)[] = [];
  /** «Ordenar todo»: the last wrong order of the challenge on screen; a slot still holding its block shows ✓ or ✗. */
  private review: (string | undefined)[] | null = null;
  /** Counts answers so the feedback line re-animates even when the text repeats. */
  private answers = 0;
  private feedback: { ok: boolean; text: string } | null = null;
  /** Wrong answers already given to the challenge on screen: shown crossed out, never sent twice. */
  private readonly attempts = new Attempts();
  /** Meter values at the last render, to pulse the one that changed. */
  private shown = { progress: 0, fails: 0 };
  /** Taps are ignored until then: a double tap never answers twice nor hits the button that replaces the options. */
  private lockedUntil = 0;

  private text: SessionText = asteroidText("");
  private onAnswer: (a: Answer) => { ok: boolean } = () => ({ ok: false });

  constructor(root: HTMLElement) {
    document.body.classList.toggle("ui-compact", compactUi());
    this.el = document.createElement("div");
    this.el.className = "duel hidden";
    root.appendChild(this.el);
    this.el.addEventListener("click", (e) => this.onClick(e));
  }

  private duel: SessionLike | undefined;

  show(session: SessionLike, text: SessionText, onAnswer: (a: Answer) => { ok: boolean }): void {
    this.duel = session;
    this.text = text;
    this.onAnswer = onAnswer;
    this.el.classList.toggle("sheet", !!text.sheet);
    this.clearOrder();
    this.feedback = null;
    this.attempts.on(undefined);
    this.shown = { progress: session.progress, fails: session.maxLives - session.lives };
    this.lockedUntil = 0;
    this.el.classList.remove("hidden");
    document.body.classList.add("in-duel");
    this.render();
  }

  onClose?: () => void;

  get visible(): boolean {
    return !this.el.classList.contains("hidden");
  }

  hide(): void {
    this.el.classList.add("hidden");
    document.body.classList.remove("in-duel");
  }

  private clearOrder(): void {
    this.slots = [];
    this.review = null;
  }

  /** Blocks in place, in slot order (step by step they are always a gapless run of right ones). */
  private get placed(): string[] {
    return this.slots.filter((id): id is string => id !== undefined);
  }

  /** «Ordenar todo»: slots whose block is still the one marked ✓/✗ after the last wrong order. */
  private marks(ex: Exercise & { kind: "order" }): ("ok" | "bad" | undefined)[] {
    if (stepByStep()) return this.slots.map((id) => (id ? "ok" : undefined));
    const review = this.review;
    if (!review) return [];
    return slotMarks(ex, this.slots).map((m, i) => (this.slots[i] !== undefined && this.slots[i] === review[i] ? m : undefined));
  }

  private face(b: CodeBlock): string {
    return esc(this.showJs ? b.js : b.pseudo);
  }

  private onClick(e: Event): void {
    const t = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
    if (!t || !this.duel) return;
    const ex = this.duel.current;
    const act = t.dataset.act;
    if (act === "toggle") this.showJs = !this.showJs;
    else if (act === "ui") setCompactUi(!compactUi());
    else if (act === "mode") {
      setStepByStep(!stepByStep());
      // Into step by step the order starts over (keeping the right ones would tell for free which they are).
      if (stepByStep()) this.clearOrder();
      this.feedback = null;
    }
    else if (performance.now() < this.lockedUntil || t.hasAttribute("disabled")) return;
    else if (act === "close") {
      this.hide();
      this.onClose?.();
      return;
    } else if (ex?.kind === "order" && act === "place" && t.dataset.id) this.place(ex, t.dataset.id);
    else if (ex?.kind === "order" && act === "unplace" && t.dataset.slot) this.slots[Number(t.dataset.slot)] = undefined;
    else if (ex?.kind === "order" && act === "retry") {
      // The right blocks stay in their slots (with their ✓); the wrong ones go back to the tray.
      const marks = this.marks(ex);
      this.slots = this.slots.map((id, i) => (marks[i] === "bad" ? undefined : id));
    }
    else if (ex?.kind === "order" && act === "submit") this.submit({ kind: "order", order: this.placed });
    else if (ex?.kind === "choice" && act === "choose") this.submit({ kind: "choice", index: Number(t.dataset.index) });
    this.render();
  }

  /** A block tapped in the tray: into the first gap, or, step by step, checked at once for the next slot. */
  private place(ex: Exercise & { kind: "order" }, id: string): void {
    if (!stepByStep()) {
      const gap = ex.solution.findIndex((_, i) => this.slots[i] === undefined);
      if (gap >= 0) this.slots[gap] = id;
      return;
    }
    this.attempts.on(ex);
    const placed = this.placed;
    const v = pickStep(ex, placed, id, this.attempts);
    if (v.kind === "right") {
      this.slots = [...placed, id];
      if (v.done) this.submit({ kind: "order", order: this.slots as string[] });
      return;
    }
    this.answers++;
    if (v.kind === "repeated") {
      this.feedback = { ok: false, text: `Ese ya falló en el paso ${placed.length + 1}: prueba otro` };
      return;
    }
    const { ok } = this.onAnswer(v.answer);
    this.attempts.record(v.answer, ok);
    const same = this.duel!.current?.id === ex.id;
    this.feedback = { ok: false, text: same ? `${this.text.bad}: ese no va en el paso ${placed.length + 1}, elige otro` : this.text.bad };
    if (!same) this.clearOrder();
    this.lockedUntil = performance.now() + (this.duel!.current ? 300 : 900);
  }

  private submit(a: Answer): void {
    const ex = this.duel!.current;
    this.attempts.on(ex);
    this.answers++;
    if (this.attempts.repeated(a)) {
      // Already answered wrong: it stays a failure, costs nothing more and changes nothing.
      this.feedback = { ok: false, text: a.kind === "order" ? "Ese orden ya falló: cambia los ✗" : "Esa ya falló: prueba otra" };
      if (a.kind === "order") this.review = [...this.slots];
      return;
    }
    const { ok } = this.onAnswer(a);
    this.attempts.record(a, ok);
    this.feedback = { ok, text: ok ? this.text.ok : this.text.bad };
    // A wrong order of a challenge still on screen stays in place with its ✓/✗ until «Reintentar» or an edit.
    if (!ok && a.kind === "order" && ex?.kind === "order" && this.duel!.current?.id === ex.id) {
      this.review = [...this.slots];
      const right = keepRight(ex, this.slots).filter(Boolean).length;
      this.feedback = { ok, text: `${this.text.bad}: ${right} de ${ex.solution.length} en su sitio (✓)` };
    } else this.clearOrder();
    this.lockedUntil = performance.now() + (this.duel!.current ? 300 : 900);
  }

  /** Written indicator, styled like the cockpit's speed readout: the number is what matters. */
  /** Panel view (unchanged since its creation): a row of cells per meter. The label is for screen readers and checks. */
  private meter(label: string, value: number, max: number, cls: string, aria: string): string {
    const cells = Array.from({ length: max }, (_, i) => `<span class="cell ${i < value ? "on" : ""}"></span>`).join("");
    return `<div class="meter ${cls}" role="status" aria-label="${esc(aria)}"><span class="label">${esc(label)}</span>${cells}</div>`;
  }

  /** HUD view: written indicator, styled like the cockpit's speed readout. */
  private stat(cls: string, label: string, value: number, max: number, unit: string, level: string, changed: boolean): string {
    return `<div class="stat ${cls} ${level} ${changed ? "bump" : ""}" data-n="${this.answers}" role="status"><span class="k">${label}</span> <b>${value}/${max}</b>${unit ? ` <span class="lbl">${esc(unit)}</span>` : ""}</div>`;
  }

  private render(): void {
    const d = this.duel!;
    const ex = d.current;
    this.attempts.on(ex);
    const fails = d.maxLives - d.lives;
    const hitsChanged = d.progress !== this.shown.progress;
    const failsChanged = fails !== this.shown.fails;
    this.shown = { progress: d.progress, fails };
    const failLevel = fails === 0 ? "calm" : d.lives <= 1 ? "danger" : "warn";
    const step = stepByStep();
    // Like the view toggle, it names the mode it switches to; the accessible name says both.
    const orderToggle =
      ex?.kind === "order"
        ? `<button class="ui-toggle order-toggle" data-act="mode" aria-pressed="${step}" aria-label="${step ? "Modo paso a paso activo: cambiar a ordenar todo y enviar" : "Modo ordenar todo y enviar activo: cambiar a paso a paso"}">${step ? "Ordenar todo" : "Paso a paso"}</button>`
        : "";
    const sheetTools = this.text.sheet
      ? `<div class="duel-tools">${orderToggle}<button class="ui-toggle" data-act="ui">${compactUi() ? "Vista panel" : "Vista HUD"}</button><button class="x" data-act="close" aria-label="Cerrar">×</button></div>`
      : "";
    const head = `
      <div class="duel-top">${sheetTools}
      <div class="duel-head">
        <div class="duel-title">${esc(this.text.title)}</div>
        <div class="duel-meters">
          ${this.meter(this.text.progress, d.progress, d.goal, "persuasion", `Aciertos ${d.progress}/${d.goal}`)}
          ${this.meter(this.text.lives ?? "Intentos", d.lives, d.maxLives, "patience", `Fallos ${fails}/${d.maxLives}`)}
        </div>
        <div class="duel-stats">
          ${this.stat("hits", "Aciertos", d.progress, d.goal, (this.text.unit ?? this.text.progress).toLowerCase(), d.progress > 0 ? "good" : "calm", hitsChanged)}
          ${this.stat("fails", "Fallos", fails, d.maxLives, d.lives === 1 && ex ? "uno más y se pierde" : "", failLevel, failsChanged)}
        </div>
      </div>
      ${this.feedback && ex ? `<div class="feedback ${this.feedback.ok ? "ok" : "bad"}" data-n="${this.answers}" role="alert">${this.feedback.ok ? "✓" : "✗"} ${esc(this.feedback.text)}</div>` : ""}
      </div>`;

    if (!ex) {
      const won = sessionOutcome(d) === "won";
      const result = won
        ? `<div class="result won" role="alert"><b>✓ Conseguido</b><span>${d.progress}/${d.goal} ${esc(this.text.progress.toLowerCase())} con ${fails} ${fails === 1 ? "fallo" : "fallos"}</span></div>`
        : `<div class="result lost" role="alert"><b>✗ Reto perdido</b><span>${fails} fallos de ${d.maxLives}: no se ha gastado nada, puedes volver a intentarlo</span></div>`;
      this.el.innerHTML = `${head}${result}<button class="submit end" data-act="close">${won ? "Continuar" : "Cerrar"}</button>`;
      return;
    }

    const toggle = `<button class="toggle" data-act="toggle">${this.showJs ? "Ver pseudocódigo" : "Ver JavaScript"}</button>`;
    let body = "";
    if (ex.kind === "order") {
      const byId = new Map(ex.blocks.map((b) => [b.id, b]));
      const marks = this.marks(ex);
      const mark = (m: "ok" | "bad" | undefined) =>
        m ? `<span class="mark ${m}" role="img" aria-label="${m === "ok" ? "en su sitio" : "no va aquí"}">${m === "ok" ? "✓" : "✗"}</span>` : "";
      const slots = ex.solution
        .map((_, i) => {
          const id = this.slots[i];
          const b = id ? byId.get(id) : undefined;
          if (!b) return `<div class="block slot"><span class="n">${i + 1}</span></div>`;
          const m = marks[i];
          // Step by step a placed block is right and stays: nothing to take back.
          return step
            ? `<div class="block placed ${m ?? ""}"><span class="n">${i + 1}</span>${this.face(b)}${mark(m)}</div>`
            : `<button class="block placed ${m ?? ""}" data-act="unplace" data-slot="${i}" data-id="${b.id}"><span class="n">${i + 1}</span>${this.face(b)}${mark(m)}</button>`;
        })
        .join("");
      const wrong = step ? new Set(wrongPicks(this.placed, this.attempts)) : new Set<string>();
      const tray = trayOrder(ex)
        .filter((b) => !this.slots.includes(b.id))
        .map((b) =>
          wrong.has(b.id)
            ? `<button class="block wrong" data-act="place" data-id="${b.id}" aria-disabled="true"><span class="mark bad" role="img" aria-label="falló en este paso">✗</span>${this.face(b)}</button>`
            : `<button class="block" data-act="place" data-id="${b.id}">${this.face(b)}</button>`,
        )
        .join("");
      const full = this.placed.length === ex.solution.length;
      const bad = marks.some((m) => m === "bad");
      const next = this.placed.length + 1;
      const action = step
        ? ""
        : bad
          ? `<button class="submit retry" data-act="retry">Reintentar: quitar los ✗</button>`
          : `<button class="submit" data-act="submit" ${full ? "" : "disabled"}>${esc(this.text.submit)}</button>`;
      body = `
        <div class="question">${esc(this.text.order)}${step ? ` · paso a paso: elige el paso ${Math.min(next, ex.solution.length)} de ${ex.solution.length}` : ""}</div>
        <div class="slots">${slots}</div>
        <div class="tray">${tray}</div>
        ${action}`;
    } else {
      const wrong = new Set(this.attempts.wrongChoices());
      const code = ex.code.map((b) => `<div class="code-line">${this.face(b)}</div>`).join("");
      const options = ex.options
        .map((o, i) =>
          wrong.has(i)
            ? `<button class="option wrong" data-act="choose" data-index="${i}" aria-disabled="true"><span class="mark" aria-label="falló">✗</span>${esc(o)}</button>`
            : `<button class="option" data-act="choose" data-index="${i}">${esc(o)}</button>`,
        )
        .join("");
      body = `
        ${code ? `<div class="code">${code}</div>` : ""}
        <div class="question">${esc(ex.question)}</div>
        <div class="options">${options}</div>`;
    }
    this.el.innerHTML = `${head}<div class="idea">«${esc(ex.idea)}»</div>${toggle}${body}`;
  }
}
