import type { Vec3 } from "@core/math/vec3";

/** Touch down slower than this (relative to the ground) and the anchors hold. Bennu's escape speed is ~0.2 m/s. */
export const LANDING_SPEED_MS = 0.1;
/** Above this the landing gear fails and the hull takes damage. */
export const CRASH_SPEED_MS = 1;
/** Height of the landing gear: contact begins when the ship's centre is this close to the ground. */
export const GEAR_HEIGHT_M = 1;

const RESTITUTION = 0.5;
const FRICTION_KEEP = 0.8;

export interface Ground {
  /** Ship centre height above the surface, metres. */
  readonly height: number;
  /** Outward surface normal (unit). */
  readonly normal: Vec3;
  readonly groundVelocity: Vec3;
}

export type Contact =
  | { kind: "none" }
  | { kind: "landed" }
  | { kind: "bounce"; velocity: Vec3 }
  | { kind: "crash"; velocity: Vec3; hullDamage: number };

/** Pure rule for what happens when the ship meets the ground. Velocities are world-frame. */
export function evaluateContact(ground: Ground, shipVelocity: Vec3): Contact {
  if (ground.height > GEAR_HEIGHT_M) return { kind: "none" };
  const rel = shipVelocity.sub(ground.groundVelocity);
  const vn = rel.dot(ground.normal);
  if (vn >= 0) return { kind: "none" };
  const speed = rel.length();
  if (speed < LANDING_SPEED_MS) return { kind: "landed" };

  // Reflect the normal component with restitution, keep part of the tangential one.
  const normalPart = ground.normal.scale(vn);
  const tangential = rel.sub(normalPart).scale(FRICTION_KEEP);
  const velocity = tangential.add(ground.normal.scale(-vn * RESTITUTION)).add(ground.groundVelocity);
  if (speed < CRASH_SPEED_MS) return { kind: "bounce", velocity };
  return { kind: "crash", velocity, hullDamage: Math.min(1, (speed - CRASH_SPEED_MS) * 0.25 + 0.1) };
}
