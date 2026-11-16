import { Vec3 } from "@core/math/vec3";
import type { MountedThruster, ThrusterModel } from "./components";

/**
 * What a thruster answers to: only translation commands, only rotation commands (the game's decoupled
 * 24-jet layout), or both, like a real quad jet (Apollo LM: each of its 16 jets fires for either).
 */
export type RcsRole = "translation" | "rotation" | "shared";

export interface RcsThruster extends MountedThruster {
  readonly role: RcsRole;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * How hard a thruster fires (0..1) for a command (body frame, axes -1..1): along its push for a
 * translation, along its torque for a rotation, the sum (saturated) for a shared jet.
 */
export function rcsDuty(t: RcsThruster, translation: Vec3, rotation: Vec3): number {
  const push = () => clamp01(t.direction.dot(translation));
  const turn = () => {
    const torque = t.position.cross(t.direction);
    return torque.length() < 1e-9 ? 0 : clamp01(torque.normalize().dot(rotation));
  };
  if (t.role === "translation") return push();
  if (t.role === "rotation") return turn();
  return clamp01(push() + turn());
}

/**
 * The Apollo LM's reaction control layout: four quads of four jets at 45° between the body axes, each
 * with an up-firing and a down-firing jet and two horizontal jets firing outward (one along x, one
 * along z), 16 in all, every one shared between translation and rotation (Apollo LM, RCS: «sixteen
 * thrusters in four quads»). The quads sit `radiusM` off the thrust axis, in the plane of the centre of
 * mass (on the real LM they are a little above it: a simplification so translation does not turn it).
 * Translation: 4 jets up or down, 2 along x or z; rotation: 4 jets in couples.
 */
export function buildQuadRcsLayout(model: ThrusterModel, radiusM: number): RcsThruster[] {
  const a = radiusM / Math.SQRT2;
  const out: RcsThruster[] = [];
  for (const sx of [1, -1])
    for (const sz of [1, -1]) {
      const position = new Vec3(sx * a, 0, sz * a);
      out.push({ model, role: "shared", position, direction: Vec3.Y });
      out.push({ model, role: "shared", position, direction: Vec3.Y.scale(-1) });
      out.push({ model, role: "shared", position, direction: new Vec3(-sx, 0, 0) });
      out.push({ model, role: "shared", position, direction: new Vec3(0, 0, -sz) });
    }
  return out;
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
