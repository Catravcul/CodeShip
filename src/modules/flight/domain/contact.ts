import type { Vec3 } from "@core/math/vec3";

/** Touch down slower than this (relative to the ground) and the anchors hold. Bennu's escape speed is ~0.2 m/s. */
export const LANDING_SPEED_MS = 0.1;
/** Above this the landing gear fails and the hull takes damage. */
export const CRASH_SPEED_MS = 1;
/** Default reach when the ship's shape is unknown: contact begins when its centre is this close to the ground. */
export const GEAR_HEIGHT_M = 1;
/** Landing legs below the belly (body −Y). Game value, about the leg length of small landers. */
export const GEAR_LEG_M = 0.5;
/**
 * Most the belly may tilt from the local vertical and still stand on its legs. Real legged landers
 * accept roughly 20–30° on rough ground (Apollo LM: 12° slope + attitude; Philae: ~30° design);
 * game value inside that range.
 */
export const MAX_LANDING_TILT_RAD = (30 * Math.PI) / 180;

/**
 * How far the ship reaches toward the ground from its centre: the hull box (plus nose) along the
 * downward direction, or the legs when the belly faces the ground.
 * @param halfSize hull half extents (body frame)
 * @param downBody unit vector pointing at the ground, in the ship's body frame
 */
export function reachToward(halfSize: Vec3, downBody: Vec3, noseM = 0): number {
  const box = halfSize.x * Math.abs(downBody.x) + halfSize.y * Math.abs(downBody.y) + (halfSize.z + (downBody.z < 0 ? noseM : 0)) * Math.abs(downBody.z);
  const legs = downBody.y < 0 ? (halfSize.y + GEAR_LEG_M) * -downBody.y : 0;
  return Math.max(box, legs);
}

const RESTITUTION = 0.5;
const FRICTION_KEEP = 0.8;

export interface Ground {
  /** Ship centre height above the surface, metres. */
  readonly height: number;
  /** Outward surface normal (unit). */
  readonly normal: Vec3;
  readonly groundVelocity: Vec3;
  /** How far the ship reaches toward the ground from its centre (see `reachToward`). */
  readonly reach?: number;
  /** Angle between the belly (body −Y) and the local down; undefined = always upright. */
  readonly tiltRad?: number;
}

export type Contact =
  | { kind: "none" }
  | { kind: "landed" }
  /** Slow touch on the hull instead of the legs: it slides off, no damage. */
  | { kind: "tilted"; velocity: Vec3 }
  | { kind: "bounce"; velocity: Vec3 }
  | { kind: "crash"; velocity: Vec3; hullDamage: number };

/** Pure rule for what happens when the ship meets the ground. Velocities are world-frame. */
export function evaluateContact(ground: Ground, shipVelocity: Vec3): Contact {
  if (ground.height > (ground.reach ?? GEAR_HEIGHT_M)) return { kind: "none" };
  const rel = shipVelocity.sub(ground.groundVelocity);
  const vn = rel.dot(ground.normal);
  if (vn >= 0) return { kind: "none" };
  const speed = rel.length();
  const upright = (ground.tiltRad ?? 0) <= MAX_LANDING_TILT_RAD;
  if (speed < LANDING_SPEED_MS && upright) return { kind: "landed" };

  // Reflect the normal component with restitution, keep part of the tangential one.
  const normalPart = ground.normal.scale(vn);
  const tangential = rel.sub(normalPart).scale(FRICTION_KEEP);
  const velocity = tangential.add(ground.normal.scale(-vn * RESTITUTION)).add(ground.groundVelocity);
  if (speed < LANDING_SPEED_MS) return { kind: "tilted", velocity };
  if (speed < CRASH_SPEED_MS) return { kind: "bounce", velocity };
  return { kind: "crash", velocity, hullDamage: Math.min(1, (speed - CRASH_SPEED_MS) * 0.25 + 0.1) };
}
