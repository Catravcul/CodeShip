import { VirtualStick, curve } from "./stick";
import { addZoomButtons, cameraStep } from "./camera-stick";

/**
 * The on-screen controls of a first- or third-person area. The look stick («Mirar») moves only the camera, with
 * «+» and «−» beside it to zoom (reglas.md §5.7: never a drag on the screen). Only an area with gravity or water
 * (core/realism.ts `moveJoystick`: sanctuary 3) also gets the stick that moves her (left) and WASD; in zero g she
 * moves by herself (arrows, routes, «Ir», taps). Arrow keys and Q/E look around.
 */
export class Walker {
  private readonly keys = new Set<string>();
  private readonly moveStick: VirtualStick | undefined;
  private zoomDir: -1 | 0 | 1 = 0;
  /** The camera the zoom buttons act on (its `zoom`, 1 = the area's own view). */
  camera?: { zoom: number; updateProjectionMatrix(): void };
  private readonly lookStick: VirtualStick;
  enabled = false;
  /** Whether the arrow keys look around (off in zero g, where they hop: arrow-pad.ts). */
  arrowsLook = true;

  /** Stick classes and label can change so another mode (the EVA) gets its own pair. */
  constructor(
    root: HTMLElement,
    sticks = { move: "walk-stick", look: "look-stick", moveLabel: "Caminar" },
    /** An area with gravity or water (core/realism.ts `moveJoystick`): only then a stick moves her. */
    private readonly moves = false,
  ) {
    window.addEventListener("keydown", (e) => this.enabled && this.keys.add(e.code));
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.keys.clear());
    this.moveStick = moves ? new VirtualStick(root, sticks.move, sticks.moveLabel) : undefined;
    this.lookStick = new VirtualStick(root, sticks.look, "Mirar");
    addZoomButtons(this.lookStick.el, (dir) => (this.zoomDir = dir));
  }

  /** Movement intent: forward (+) / right (+), each −1..1. */
  move(): { forward: number; right: number } {
    if (!this.moves || !this.moveStick) return { forward: 0, right: 0 };
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
    const cam = this.camera;
    if (cam && this.zoomDir) {
      cam.zoom = Math.max(0.6, Math.min(3, cam.zoom * cameraStep({ x: 0, y: 0 }, this.zoomDir, dt).zoom ** -1));
      cam.updateProjectionMatrix();
    }
    return {
      yaw: (ar("ArrowLeft") - ar("ArrowRight") + k("KeyQ") - k("KeyE") - curve(s.x)) * 2.0 * dt,
      pitch: (ar("ArrowUp") - ar("ArrowDown") - curve(s.y)) * 1.4 * dt,
    };
  }
}
