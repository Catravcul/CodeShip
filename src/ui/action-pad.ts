import "./action-pad.css";

/** Every button of a Nintendo Switch pair of Joy-Cons, by where it sits. */
export type PadKey = "A" | "B" | "X" | "Y" | "R" | "ZR" | "+" | "home" | "up" | "down" | "left" | "right" | "L" | "ZL" | "-" | "capture";

export interface ActionPadButton {
  readonly letter: PadKey;
  readonly label: string;
  /** A toggle stays lit while on (Correr). */
  readonly toggle?: boolean;
  /** Held: called with on = true when pressed and false when let go (the zoom). */
  readonly hold?: boolean;
  /** Keyboard key. */
  readonly key?: string;
}

/** What each key shows on its face (the Joy-Con's own marks). */
const FACE: Readonly<Record<PadKey, string>> = { A: "A", B: "B", X: "X", Y: "Y", R: "R", ZR: "ZR", "+": "+", home: "⌂", up: "▲", down: "▼", left: "◀", right: "▶", L: "L", ZL: "ZL", "-": "−", capture: "●" };
const LEFT: readonly PadKey[] = ["up", "down", "left", "right", "L", "ZL", "-", "capture"];
const RIGHT: readonly PadKey[] = ["X", "A", "B", "Y", "R", "ZR", "+", "home"];

/**
 * The Switch controls (Berón 2026-11-19: «los mandos deben recrear los de una Nintendo Switch y tener
 * transparencia»; then «deberían haber 4 botones a la derecha y 4 a la izquierda… primero crear los botones que tiene
 * la Switch y luego iremos asignándoles funcionalidad»; reglas.md §5.7). Every Joy-Con button is here: on the left,
 * the D-pad beside the move stick, L and ZL over it, «−» and capture; on the right, the A/B/X/Y diamond beside the
 * look stick, R and ZR over it, «+» and home. A button with no job yet shows only its mark, faded.
 */
export class ActionPad {
  readonly el: HTMLElement;
  private readonly on = new Set<string>();
  private readonly spec = new Map<PadKey, ActionPadButton>();

  constructor(root: HTMLElement, buttons: readonly ActionPadButton[], private readonly press: (letter: PadKey, on: boolean) => void) {
    for (const b of buttons) this.spec.set(b.letter, b);
    this.el = document.createElement("div");
    this.el.className = "switch-pad";
    const btn = (k: PadKey) => {
      const b = this.spec.get(k);
      const cls = k.replace("+", "plus").replace("-", "minus").toLowerCase();
      return `<button class="ap-btn ap-${cls}${b ? "" : " free"}" data-letter="${k}" aria-label="${b ? `${b.label}${b.key ? ` (${b.key})` : ""}` : `Botón ${FACE[k]} (sin asignar)`}" aria-pressed="false"><b>${FACE[k]}</b>${b ? `<span>${b.label}</span>` : ""}</button>`;
    };
    this.el.innerHTML = `<div class="sp-side sp-left"><div class="sp-cluster">${LEFT.slice(0, 4).map(btn).join("")}</div>${LEFT.slice(4).map(btn).join("")}</div><div class="sp-side sp-right"><div class="sp-cluster">${RIGHT.slice(0, 4).map(btn).join("")}</div>${RIGHT.slice(4).map(btn).join("")}</div>`;
    root.appendChild(this.el);
    document.body.classList.add("has-switch-pad");
    for (const el of this.el.querySelectorAll<HTMLButtonElement>(".ap-btn")) {
      const k = el.dataset.letter as PadKey;
      el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.tap(k, true);
      });
      for (const ev of ["pointerup", "pointercancel", "pointerleave"]) el.addEventListener(ev, () => this.spec.get(k)?.hold && this.tap(k, false));
    }
    window.addEventListener("keydown", (e) => {
      if (e.repeat || (e.target as HTMLElement).closest("input, textarea")) return;
      const b = buttons.find((q) => q.key && e.code === q.key);
      if (b) this.tap(b.letter, true);
    });
    window.addEventListener("keyup", (e) => {
      const b = buttons.find((q) => q.hold && q.key && e.code === q.key);
      if (b) this.tap(b.letter, false);
    });
  }

  private tap(k: PadKey, down: boolean): void {
    const b = this.spec.get(k);
    const el = this.el.querySelector<HTMLButtonElement>(`[data-letter="${CSS.escape(k)}"]`)!;
    if (!b) {
      el.classList.add("hit");
      window.setTimeout(() => el.classList.remove("hit"), 160);
      return;
    }
    if (b.toggle) {
      if (!down) return;
      const now = !this.on.has(k);
      this.set(k, now);
      this.press(k, now);
    } else if (b.hold) {
      el.classList.toggle("hit", down);
      this.press(k, down);
    } else if (down) {
      el.classList.add("hit");
      window.setTimeout(() => el.classList.remove("hit"), 160);
      this.press(k, true);
    }
  }

  /** Light a toggle on or off (e.g. Correr goes off when she stops). */
  set(letter: PadKey, on: boolean): void {
    if (on) this.on.add(letter);
    else this.on.delete(letter);
    const btn = this.el.querySelector<HTMLButtonElement>(`[data-letter="${CSS.escape(letter)}"]`);
    btn?.classList.toggle("on", on);
    btn?.setAttribute("aria-pressed", String(on));
  }

  /** Grey a button out when it can do nothing now (Trepar with nothing ahead). */
  enable(letter: PadKey, on: boolean): void {
    this.el.querySelector<HTMLButtonElement>(`[data-letter="${CSS.escape(letter)}"]`)?.classList.toggle("idle", !on);
  }

  isOn(letter: PadKey): boolean {
    return this.on.has(letter);
  }
}
