import type { Arrow } from "@modules/gravity/domain/hops";
import "../../ui/zero-g.css";

const KEYS: Readonly<Record<string, Arrow>> = { ArrowUp: "arriba", KeyW: "arriba", ArrowDown: "abajo", KeyS: "abajo", ArrowLeft: "izquierda", KeyA: "izquierda", ArrowRight: "derecha", KeyD: "derecha" };
const GLYPH: Readonly<Record<Arrow, string>> = { arriba: "▲", abajo: "▼", izquierda: "◀", derecha: "▶" };
const LABEL: Readonly<Record<Arrow, string>> = { arriba: "Saltar hacia delante", abajo: "Saltar hacia atrás", izquierda: "Saltar a la izquierda", derecha: "Saltar a la derecha" };

/**
 * The zero-g arrow pad (docs/design/ingravidez.md, «Fase C: flechas»): each arrow hops to the next
 * landing point that way, relative to the view. While a hop is under way the pad is disabled (dimmed);
 * an arrow with nothing that way is dimmed too. Holding an arrow chains hops. Keys: arrows or WASD.
 */
export class ArrowPad {
  private readonly el: HTMLElement;
  private readonly buttons = new Map<Arrow, HTMLButtonElement>();
  private tapped: Arrow | null = null;
  private holding: Arrow | null = null;
  private busy = false;
  private on = false;
  private key = "";

  constructor(root: HTMLElement) {
    this.el = document.createElement("div");
    this.el.className = "zg-pad hidden";
    this.el.innerHTML = (["arriba", "izquierda", "derecha", "abajo"] as const)
      .map((a) => `<button class="zg-arrow zg-${a}" data-arrow="${a}" aria-label="${LABEL[a]}">${GLYPH[a]}</button>`)
      .join("") + `<span class="zg-pad-label">Saltar</span>`;
    root.appendChild(this.el);
    for (const b of this.el.querySelectorAll<HTMLButtonElement>(".zg-arrow")) {
      const a = b.dataset.arrow as Arrow;
      this.buttons.set(a, b);
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        b.setPointerCapture?.(e.pointerId);
        this.press(a);
      });
      const up = () => this.holding === a && (this.holding = null);
      b.addEventListener("pointerup", up);
      b.addEventListener("pointercancel", up);
      b.addEventListener("lostpointercapture", up);
    }
    window.addEventListener("keydown", (e) => {
      const a = KEYS[e.code];
      if (!this.on || !a) return;
      e.preventDefault();
      if (!e.repeat) this.press(a);
    });
    window.addEventListener("keyup", (e) => KEYS[e.code] === this.holding && (this.holding = null));
    window.addEventListener("blur", () => (this.holding = null));
  }

  private press(a: Arrow): void {
    this.holding = a;
    if (this.busy || this.buttons.get(a)!.classList.contains("none")) return;
    this.tapped = a;
  }

  show(on: boolean): void {
    if (on === this.on) return;
    this.on = on;
    this.el.classList.toggle("hidden", !on);
    if (!on) this.tapped = this.holding = null;
  }

  /** Which arrows have somewhere to go, and whether a hop is under way (all disabled). */
  sync(available: Readonly<Record<Arrow, boolean>>, busy: boolean): void {
    this.busy = busy;
    if (busy) this.tapped = null;
    const key = `${busy}${available.arriba}${available.abajo}${available.izquierda}${available.derecha}`;
    if (key === this.key) return;
    this.key = key;
    this.el.classList.toggle("busy", busy);
    for (const [a, b] of this.buttons) {
      // While hopping every arrow is off (the pad dims); what each will do is known again on arrival.
      if (!busy) b.classList.toggle("none", !available[a]);
      b.setAttribute("aria-disabled", String(busy || !available[a]));
    }
  }

  /** The arrow tapped since the last call; or, with none, the one still held (to chain hops). */
  take(): Arrow | null {
    const a = this.tapped ?? (this.busy ? null : this.holding);
    this.tapped = null;
    return a;
  }
}
