import "./action-pad.css";

export interface ActionPadButton {
  /** The Switch letter on its face (A, B, X, Y). */
  readonly letter: "A" | "B" | "X" | "Y";
  readonly label: string;
  /** A toggle stays lit while on (Correr). */
  readonly toggle?: boolean;
  /** Keyboard key. */
  readonly key?: string;
}

/**
 * The action buttons (Berón 2026-11-19: «los mandos deben recrear los de una Nintendo Switch y tener transparencia…
 * agrega también el botón para acelerar (correr), el de saltar y el de trepar»; reglas.md §5.7): the right
 * Joy-Con's diamond, X on top, A right, B below, Y left, round and semi-transparent, beside the look stick.
 */
export class ActionPad {
  readonly el: HTMLElement;
  private readonly on = new Set<string>();

  constructor(root: HTMLElement, buttons: readonly ActionPadButton[], private readonly press: (letter: string, on: boolean) => void) {
    this.el = document.createElement("div");
    this.el.className = "action-pad";
    this.el.innerHTML = buttons
      .map((b) => `<button class="ap-btn ap-${b.letter.toLowerCase()}" data-letter="${b.letter}" data-toggle="${b.toggle ? 1 : 0}" aria-label="${b.label}${b.key ? ` (${b.key})` : ""}" aria-pressed="false"><b>${b.letter}</b><span>${b.label}</span></button>`)
      .join("");
    root.appendChild(this.el);
    for (const btn of this.el.querySelectorAll<HTMLButtonElement>(".ap-btn")) {
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.tap(btn.dataset.letter!);
      });
    }
    window.addEventListener("keydown", (e) => {
      if (e.repeat || (e.target as HTMLElement).closest("input, textarea")) return;
      const b = buttons.find((q) => q.key && e.code === q.key);
      if (b) this.tap(b.letter);
    });
  }

  private tap(letter: string): void {
    const btn = this.el.querySelector<HTMLButtonElement>(`[data-letter="${letter}"]`)!;
    if (btn.dataset.toggle === "1") {
      const now = !this.on.has(letter);
      this.set(letter, now);
      this.press(letter, now);
    } else {
      btn.classList.add("hit");
      window.setTimeout(() => btn.classList.remove("hit"), 160);
      this.press(letter, true);
    }
  }

  /** Light a toggle on or off (e.g. Correr goes off when she stops). */
  set(letter: string, on: boolean): void {
    if (on) this.on.add(letter);
    else this.on.delete(letter);
    const btn = this.el.querySelector<HTMLButtonElement>(`[data-letter="${letter}"]`);
    btn?.classList.toggle("on", on);
    btn?.setAttribute("aria-pressed", String(on));
  }

  /** Grey a button out when it can do nothing now (Trepar with nothing ahead). */
  enable(letter: string, on: boolean): void {
    this.el.querySelector<HTMLButtonElement>(`[data-letter="${letter}"]`)?.classList.toggle("idle", !on);
  }

  isOn(letter: string): boolean {
    return this.on.has(letter);
  }
}
