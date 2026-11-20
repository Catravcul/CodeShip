import { Vec3 } from "@core/math/vec3";

/** What flies: a rock, a volatile charge that bursts near the target, or a nuclear charge. */
export type ProjectileKind = "roca" | "carga" | "nuclear";

export interface Projectile {
  readonly id: number;
  readonly kind: ProjectileKind;
  /** The asteroid that threw it. */
  readonly sourceId: string;
  readonly targetId: string;
  readonly position: Vec3;
  readonly velocity: Vec3;
  readonly massKg: number;
  readonly radiusM: number;
  readonly ageS: number;
}

/** Thrown rock diameter from the asteroid's diameter: d = k·√D (game value, so it grows with the body but stays a rock). */
export const ROCK_SIZE_K = 0.022;
/** Bulk density used for thrown rock when the asteroid's is unknown, kg/m³ (Bennu's). */
export const DEFAULT_ROCK_DENSITY = 1190;

export function rockDiameterM(asteroidDiameterM: number): number {
  return Math.min(4, Math.max(0.05, ROCK_SIZE_K * Math.sqrt(asteroidDiameterM)));
}

/** Mass of a sphere of diameter d and density ρ, kg. */
export const sphereMassKg = (diameterM: number, densityKgM3: number): number => densityKgM3 * (Math.PI / 6) * diameterM ** 3;

/** Kinetic energy ½mv², J. */
export const kineticEnergyJ = (massKg: number, speedMs: number): number => 0.5 * massKg * speedMs * speedMs;

/**
 * Velocity to throw at `speed` from `from` so as to meet a target moving in a straight line
 * (|p + v·t − o| = s·t). Falls back to straight at it when it cannot be caught.
 */
export function interceptVelocity(from: Vec3, targetPos: Vec3, targetVel: Vec3, speed: number): Vec3 {
  const d = targetPos.sub(from);
  const a = targetVel.dot(targetVel) - speed * speed;
  const b = 2 * d.dot(targetVel);
  const c = d.dot(d);
  let t = -1;
  if (Math.abs(a) < 1e-9) t = b !== 0 ? -c / b : -1;
  else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const s = Math.sqrt(disc);
      const t1 = (-b - s) / (2 * a);
      const t2 = (-b + s) / (2 * a);
      t = Math.min(...[t1, t2].filter((x) => x > 0), Infinity);
      if (!Number.isFinite(t)) t = -1;
    }
  }
  const aim = t > 0 ? d.add(targetVel.scale(t)) : d;
  const len = aim.length();
  return len < 1e-9 ? Vec3.ZERO : aim.scale(speed / len);
}

/**
 * Guidance acceleration the asteroid can put on its projectile at distance r from its centre:
 * "steered by its gravity", so it falls like gravity, with 1/r² (game licence: the magnitude is a
 * game value per tier, far above the real pull of a small body).
 */
export function guidanceAccelMs2(surfaceAccelMs2: number, radiusM: number, distanceM: number, anger: number): number {
  const r = Math.max(distanceM, radiusM);
  return surfaceAccelMs2 * anger * (radiusM / r) ** 2;
}

export interface FlightContext {
  readonly asteroidPosition: Vec3;
  readonly asteroidRadiusM: number;
  /** Gravity of the asteroid at a point, m/s² (real point mass). */
  readonly gravityAt: (p: Vec3) => Vec3;
  readonly guidanceMs2: number;
  readonly anger: number;
  readonly maxSpeedMs: number;
  /** Target to home on, or undefined to fly ballistic (beyond reach). */
  readonly target?: { readonly position: Vec3; readonly velocity: Vec3 };
}

/**
 * One step of a projectile: the asteroid's real gravity plus a limited steering acceleration that
 * turns its velocity toward the intercept, then speed capped at the tier's top speed.
 */
export function stepProjectile(p: Projectile, ctx: FlightContext, dtS: number): Projectile {
  let accel = ctx.gravityAt(p.position);
  if (ctx.target) {
    const r = p.position.sub(ctx.asteroidPosition).length();
    const aMax = guidanceAccelMs2(ctx.guidanceMs2, ctx.asteroidRadiusM, r, ctx.anger);
    const speed = Math.max(p.velocity.length(), 0.5);
    const want = interceptVelocity(p.position, ctx.target.position, ctx.target.velocity, speed);
    const steer = want.sub(p.velocity).scale(1 / Math.max(dtS, 1e-3));
    const len = steer.length();
    accel = accel.add(len > aMax ? steer.scale(aMax / len) : steer);
  }
  let v = p.velocity.add(accel.scale(dtS));
  const vLen = v.length();
  if (vLen > ctx.maxSpeedMs) v = v.scale(ctx.maxSpeedMs / vLen);
  return { ...p, position: p.position.add(v.scale(dtS)), velocity: v, ageS: p.ageS + dtS };
}

/**
 * Closest distance between a projectile and a target during a step of length dt, both moving in
 * straight lines from their positions at the start of the step.
 */
export function closestApproachM(pPos: Vec3, pVel: Vec3, tPos: Vec3, tVel: Vec3, dtS: number): number {
  const rel = pPos.sub(tPos);
  const relV = pVel.sub(tVel);
  const vv = relV.dot(relV);
  const t = vv < 1e-12 ? 0 : Math.max(0, Math.min(dtS, -rel.dot(relV) / vv));
  return rel.add(relV.scale(t)).length();
}
