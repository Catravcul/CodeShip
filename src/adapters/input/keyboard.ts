import { Vec3 } from "@core/math/vec3";
import type { ThrustCommand } from "@modules/ship/domain/ship";

/**
 * Keyboard bindings -> pilot command. Body axes: x right, y up, z back (forward is -z).
 * Translation: W/S forward/back, A/D left/right, R/F up/down.
 * Rotation: arrows pitch/yaw, Q/E roll. Main engine: Space. Assist toggle: T.
 */
export class KeyboardPilot {
  private readonly down = new Set<string>();
  onToggleAssist: () => void = () => {};

  constructor(target: Window) {
    target.addEventListener("keydown", (e) => {
      if (e.code === "KeyT" && !e.repeat) this.onToggleAssist();
      this.down.add(e.code);
      if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
    });
    target.addEventListener("keyup", (e) => this.down.delete(e.code));
    target.addEventListener("blur", () => this.down.clear());
  }

  private axis(pos: string, neg: string): number {
    return (this.down.has(pos) ? 1 : 0) - (this.down.has(neg) ? 1 : 0);
  }

  command(): ThrustCommand {
    return {
      mainThrottle: this.down.has("Space") ? 1 : 0,
      translation: new Vec3(this.axis("KeyD", "KeyA"), this.axis("KeyR", "KeyF"), this.axis("KeyS", "KeyW")),
      rotation: new Vec3(this.axis("ArrowDown", "ArrowUp"), this.axis("ArrowLeft", "ArrowRight"), this.axis("KeyQ", "KeyE")),
    };
  }
}
