/**
 * A round on-screen stick. Hold and drag the knob: `value` is the offset, −1..1 per axis
 * (x right, y down). Works with touch and mouse.
 */
export class VirtualStick {
  readonly el: HTMLElement;
  private readonly knob: HTMLElement;
  private id: number | null = null;
  value = { x: 0, y: 0 };

  constructor(root: HTMLElement, className: string, label: string) {
    this.el = document.createElement("div");
    this.el.className = `vstick ${className}`;
    this.el.innerHTML = `<div class="knob"></div><span>${label}</span>`;
    root.appendChild(this.el);
    this.knob = this.el.querySelector(".knob")!;
    this.el.addEventListener("pointerdown", (e) => {
      if (this.id !== null) return;
      e.preventDefault();
      e.stopPropagation();
      this.id = e.pointerId;
      this.el.setPointerCapture?.(e.pointerId);
      this.track(e);
    });
    this.el.addEventListener("pointermove", (e) => e.pointerId === this.id && this.track(e));
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.id) return;
      this.id = null;
      this.value = { x: 0, y: 0 };
      this.knob.style.transform = "";
    };
    this.el.addEventListener("pointerup", end);
    this.el.addEventListener("pointercancel", end);
  }

  /** True while a finger or the mouse holds it. */
  get held(): boolean {
    return this.id !== null;
  }

  private track(e: PointerEvent): void {
    const r = this.el.getBoundingClientRect();
    const max = r.width / 2;
    let dx = e.clientX - (r.left + max);
    let dy = e.clientY - (r.top + max);
    const len = Math.hypot(dx, dy);
    if (len > max) {
      dx *= max / len;
      dy *= max / len;
    }
    this.value = { x: dx / max, y: dy / max };
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }
}

/** Response curve: small moves are fine, full deflection is fast. */
export const curve = (v: number) => Math.sign(v) * v * v;
