/**
 * First-person walking inside the habitat: WASD/arrows + mouse drag on desktop,
 * a virtual stick (left) and drag-to-look (anywhere else) on touch screens.
 */
export class Walker {
  private readonly keys = new Set<string>();
  private stick = { x: 0, y: 0 };
  private lookDelta = { x: 0, y: 0 };
  private readonly el: HTMLElement;
  private stickId: number | null = null;
  private lookId: number | null = null;
  private last = { x: 0, y: 0 };
  enabled = false;

  constructor(root: HTMLElement) {
    window.addEventListener("keydown", (e) => this.enabled && this.keys.add(e.code));
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    this.el = document.createElement("div");
    this.el.className = "walk-stick";
    this.el.innerHTML = '<div class="knob"></div>';
    root.appendChild(this.el);
    const knob = this.el.firstElementChild as HTMLElement;
    const canvasTarget = root;
    canvasTarget.addEventListener("pointerdown", (e) => {
      if (!this.enabled || (e.target as HTMLElement).closest("button, .duel, .board")) return;
      const r = this.el.getBoundingClientRect();
      const inStick = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (inStick && this.stickId === null) this.stickId = e.pointerId;
      else if (this.lookId === null) {
        this.lookId = e.pointerId;
        this.last = { x: e.clientX, y: e.clientY };
      }
    });
    window.addEventListener("pointermove", (e) => {
      if (e.pointerId === this.stickId) {
        const r = this.el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const max = r.width / 2;
        const dx = Math.max(-max, Math.min(max, e.clientX - cx));
        const dy = Math.max(-max, Math.min(max, e.clientY - cy));
        this.stick = { x: dx / max, y: dy / max };
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
      } else if (e.pointerId === this.lookId) {
        this.lookDelta.x += e.clientX - this.last.x;
        this.lookDelta.y += e.clientY - this.last.y;
        this.last = { x: e.clientX, y: e.clientY };
      }
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId === this.stickId) {
        this.stickId = null;
        this.stick = { x: 0, y: 0 };
        knob.style.transform = "";
      }
      if (e.pointerId === this.lookId) this.lookId = null;
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  /** Movement intent: forward (+) / right (+), each −1..1. */
  move(): { forward: number; right: number } {
    const k = (c: string) => (this.keys.has(c) ? 1 : 0);
    return {
      forward: Math.max(-1, Math.min(1, k("KeyW") - k("KeyS") - this.stick.y)),
      right: Math.max(-1, Math.min(1, k("KeyD") - k("KeyA") + this.stick.x)),
    };
  }

  /** Look change since last call, radians (yaw: + turns left; pitch: + looks up). */
  look(dt: number): { yaw: number; pitch: number } {
    const k = (c: string) => (this.keys.has(c) ? 1 : 0);
    const out = {
      yaw: -this.lookDelta.x * 0.005 + (k("ArrowLeft") - k("ArrowRight")) * 1.8 * dt,
      pitch: -this.lookDelta.y * 0.005 + (k("ArrowUp") - k("ArrowDown")) * 1.2 * dt,
    };
    this.lookDelta = { x: 0, y: 0 };
    return out;
  }
}
