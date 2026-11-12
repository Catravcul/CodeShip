import { VirtualStick, curve } from "./stick";

/**
 * Walking inside the habitat: WASD + arrows, or two on-screen sticks (left walks, right looks),
 * and dragging anywhere else also looks around. Sticks show on every device.
 */
export class Walker {
  private readonly keys = new Set<string>();
  private lookDelta = { x: 0, y: 0 };
  private lookId: number | null = null;
  private last = { x: 0, y: 0 };
  private readonly moveStick: VirtualStick;
  private readonly lookStick: VirtualStick;
  enabled = false;

  constructor(root: HTMLElement) {
    window.addEventListener("keydown", (e) => this.enabled && this.keys.add(e.code));
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.keys.clear());
    this.moveStick = new VirtualStick(root, "walk-stick", "Caminar");
    this.lookStick = new VirtualStick(root, "look-stick", "Mirar");
    root.addEventListener("pointerdown", (e) => {
      if (!this.enabled || (e.target as HTMLElement).closest("button, .duel, .board, .vstick")) return;
      if (this.lookId !== null) return;
      this.lookId = e.pointerId;
      this.last = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener("pointermove", (e) => {
      if (e.pointerId !== this.lookId) return;
      this.lookDelta.x += e.clientX - this.last.x;
      this.lookDelta.y += e.clientY - this.last.y;
      this.last = { x: e.clientX, y: e.clientY };
    });
    const end = (e: PointerEvent) => e.pointerId === this.lookId && (this.lookId = null);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  /** Movement intent: forward (+) / right (+), each −1..1. */
  move(): { forward: number; right: number } {
    const k = (c: string) => (this.keys.has(c) ? 1 : 0);
    const s = this.moveStick.value;
    return {
      forward: Math.max(-1, Math.min(1, k("KeyW") - k("KeyS") - s.y)),
      right: Math.max(-1, Math.min(1, k("KeyD") - k("KeyA") + s.x)),
    };
  }

  /** Look change since last call, radians (yaw: + turns left; pitch: + looks up). */
  look(dt: number): { yaw: number; pitch: number } {
    const k = (c: string) => (this.keys.has(c) ? 1 : 0);
    const s = this.lookStick.value;
    const out = {
      yaw: -this.lookDelta.x * 0.006 + (k("ArrowLeft") - k("ArrowRight") + k("KeyQ") - k("KeyE") - curve(s.x)) * 2.0 * dt,
      pitch: -this.lookDelta.y * 0.006 + (k("ArrowUp") - k("ArrowDown") - curve(s.y)) * 1.4 * dt,
    };
    this.lookDelta = { x: 0, y: 0 };
    return out;
  }
}
