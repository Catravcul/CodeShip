import type { PushStrength } from "@modules/gravity/domain/iva";
import "../../ui/zero-g.css";

/** Holding «Impulsarse» this long makes it a hard push, ms. */
const HARD_MS = 450;

/**
 * Buttons for moving about in zero g (docs/design/ingravidez.md): «Impulsarse» pushes off the rail
 * she holds (tap: an ordinary push; hold: a hard one) and «Agarrarse» catches a rail in reach mid-flight.
 * Keys: Space pushes (Shift+Space hard), G grabs.
 */
export class ZeroGControls {
  private readonly el: HTMLElement;
  private readonly pushBtn: HTMLButtonElement;
  private readonly grabBtn: HTMLButtonElement;
  private push: PushStrength | null = null;
  private grab = false;
  private downAt = 0;
  private hardTimer = 0;
  enabled = false;

  constructor(root: HTMLElement) {
    this.el = document.createElement("div");
    this.el.className = "zg-controls hidden";
    this.el.innerHTML = `<button class="zg-grab hidden">Agarrarse</button><button class="zg-push"><b>Impulsarse</b><small>mantén: fuerte</small></button>`;
    root.appendChild(this.el);
    this.pushBtn = this.el.querySelector(".zg-push")!;
    this.grabBtn = this.el.querySelector(".zg-grab")!;
    this.pushBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.downAt = performance.now();
      window.clearTimeout(this.hardTimer);
      this.hardTimer = window.setTimeout(() => this.pushBtn.classList.add("hard"), HARD_MS);
    });
    const release = (e: PointerEvent) => {
      if (!this.downAt) return;
      e.stopPropagation();
      window.clearTimeout(this.hardTimer);
      this.pushBtn.classList.remove("hard");
      this.push = performance.now() - this.downAt >= HARD_MS ? "fuerte" : "suave";
      this.downAt = 0;
    };
    this.pushBtn.addEventListener("pointerup", release);
    this.pushBtn.addEventListener("pointercancel", () => {
      this.downAt = 0;
      this.pushBtn.classList.remove("hard");
    });
    this.grabBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.grab = true;
    });
    window.addEventListener("keydown", (e) => {
      if (!this.enabled || e.repeat) return;
      if (e.code === "Space") {
        e.preventDefault();
        this.push = e.shiftKey ? "fuerte" : "suave";
      }
      if (e.code === "KeyG") this.grab = true;
    });
  }

  /** Show or hide the controls, and the grab button (only worth showing when a rail is in reach mid-flight). */
  show(on: boolean, canGrab = false): void {
    this.enabled = on;
    this.el.classList.toggle("hidden", !on);
    this.grabBtn.classList.toggle("hidden", !canGrab);
    if (!on) {
      this.push = null;
      this.grab = false;
    }
  }

  /** The push asked for since the last call, if any. */
  takePush(): PushStrength | null {
    const p = this.push;
    this.push = null;
    return p;
  }

  takeGrab(): boolean {
    const g = this.grab;
    this.grab = false;
    return g;
  }
}
