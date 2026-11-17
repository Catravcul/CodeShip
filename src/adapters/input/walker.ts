import { VirtualStick, curve } from "./stick";

/**
 * Walking inside the habitat: WASD + arrows, or two on-screen sticks (left walks, right looks).
 * Sticks show on every device. Dragging the screen never turns the camera (reglas.md §5.7): only the look stick.
 */
export class Walker {
  private readonly keys = new Set<string>();
  private readonly moveStick: VirtualStick;
  private readonly lookStick: VirtualStick;
  enabled = false;
  /** Whether the arrow keys look around (off in zero g, where they hop: arrow-pad.ts). */
  arrowsLook = true;

  /** Stick classes and label can change so another mode (the EVA) gets its own pair. */
  constructor(root: HTMLElement, sticks = { move: "walk-stick", look: "look-stick", moveLabel: "Caminar" }) {
    window.addEventListener("keydown", (e) => this.enabled && this.keys.add(e.code));
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.keys.clear());
    this.moveStick = new VirtualStick(root, sticks.move, sticks.moveLabel);
    this.lookStick = new VirtualStick(root, sticks.look, "Mirar");
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
    const ar = (c: string) => (this.arrowsLook ? k(c) : 0);
    return {
      yaw: (ar("ArrowLeft") - ar("ArrowRight") + k("KeyQ") - k("KeyE") - curve(s.x)) * 2.0 * dt,
      pitch: (ar("ArrowUp") - ar("ArrowDown") - curve(s.y)) * 1.4 * dt,
    };
  }
}
