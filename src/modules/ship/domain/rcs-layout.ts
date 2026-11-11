import { Vec3 } from "@core/math/vec3";
import type { MountedThruster, ThrusterModel } from "./components";

export type RcsRole = "translation" | "rotation";

export interface RcsThruster extends MountedThruster {
  readonly role: RcsRole;
}

const AXES = [Vec3.X, Vec3.Y, Vec3.Z] as const;

/**
 * Game simplification of a reaction control system: 24 thrusters in dedicated pairs.
 * - Translation: for each axis and sign, two thrusters placed symmetrically so their torques cancel.
 * - Rotation: for each axis and sign, a couple of two opposite thrusters so their forces cancel.
 * Real spacecraft share thrusters between roles; this layout keeps commands decoupled and easy to fly.
 */
export function buildRcsLayout(model: ThrusterModel, hullSize: Vec3): RcsThruster[] {
  const half = hullSize.scale(0.5);
  const thrusters: RcsThruster[] = [];
  AXES.forEach((a, i) => {
    const b = AXES[(i + 1) % 3]!;
    const leverB = Math.abs(b.dot(half));
    for (const s of [1, -1]) {
      const dir = a.scale(s);
      thrusters.push({ model, role: "translation", position: b.scale(leverB), direction: dir });
      thrusters.push({ model, role: "translation", position: b.scale(-leverB), direction: dir });
      const tangential = a.cross(b).scale(s);
      thrusters.push({ model, role: "rotation", position: b.scale(leverB), direction: tangential });
      thrusters.push({ model, role: "rotation", position: b.scale(-leverB), direction: tangential.scale(-1) });
    }
  });
  return thrusters;
}
