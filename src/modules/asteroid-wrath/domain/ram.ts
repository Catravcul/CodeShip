import { Vec3 } from "@core/math/vec3";
import type { TargetKind } from "./power";

/**
 * A ram: an angry asteroid fast enough to close on the craft that enraged it charges and hits it with
 * its own body instead of throwing things. See docs/design/poderes-ira.md, «Embestida».
 *
 * The collision is real mechanics along the line of centres (two bodies, coefficient of restitution e):
 * - energy in the centre-of-mass frame ½·μ·v², with the reduced mass μ = m₁m₂/(m₁+m₂);
 * - the share the bounce does not give back, ½·μ·v_n²·(1 − e²), is what crushes the hull;
 * - impulse J = (1 + e)·μ·v_n along the normal: the craft gets J/m, the asteroid J/M.
 * (https://en.wikipedia.org/wiki/Coefficient_of_restitution, https://en.wikipedia.org/wiki/Inelastic_collision)
 */
export const RAM = {
  /** It may charge only if its sprint top speed reaches this, m/s (game value: Bennu from anger ~0,25; the 2,4 km members never). */
  minChargeSpeedMs: 5,
  /** And only if it can close on the craft at least this fast: top speed − the craft's speed away from it, m/s (game value). */
  minClosingMs: 2,
  /**
   * A ram-prone asteroid closes to this far from its surface before it charges, m (game value): a run
   * of about a minute for Bennu, enough for the lander (0,27 m/s²) to turn and burn 248 m sideways.
   */
  chargeGapM: 400,
  /** It starts winding up once the craft is this close to its surface, m (game value). */
  startGapM: 600,
  /** …but not closer than this: it needs a run-up for the hit to count, m (game value). Closer, it shadows the craft. */
  minRunUpM: 50,
  /** Wind-up: the warning time before it sets off, s (game value: long enough to start a sideways burn). */
  windupS: 5,
  /** A charge that has not hit after this long is given up, s (game value). */
  maxChargeS: 120,
  /** Rest between charges, s, on top of the time it needs to turn around (game value). */
  cooldownS: 10,
  /**
   * Coefficient of restitution of a craft against loose regolith. Philae's first touchdown on 67P: in at
   * ~1,0 m/s, out at ~0,38 m/s (Biele et al. 2015, Science 349:aaa9816). Bennu's surface is as loose
   * (Walsh et al. 2022, Science Advances 8:eabm6229, near-zero cohesion). Applied as an estimate.
   */
  restitution: 0.38,
  /** Speed it shakes a craft landed on it off with, m/s (same as the shake-off after a failed duel; game value). */
  shakeOffMs: 0.5,
  /** A craft this close to its surface and landed is on it, m. */
  onSurfaceM: 30,
  /** What it rams: craft out in space. Doménica in her suit is shaken, never rammed (game rule). */
  targets: ["sonda", "aterrizador"] as readonly TargetKind[],
} as const;

export type Attack = "embestir" | "sacudir" | "lanzar";

export interface AttackInput {
  readonly kind: TargetKind;
  /** The craft is resting on a surface. */
  readonly landed: boolean;
  /** …and that surface is this asteroid's. */
  readonly onThisBody: boolean;
  /** Its sprint top speed now, m/s (`chargeProfile`). */
  readonly chargeTopSpeedMs: number;
  /** The craft's speed away from it, m/s (negative when it comes closer). */
  readonly recedeMs: number;
  /** Craft to surface, m. */
  readonly gapM: number;
  /** Without a mass there is no momentum to transfer: no ram. */
  readonly craftMassKg?: number;
}

/** Fast enough to ever charge (decides how close it comes while it chases). */
export const ramCapable = (chargeTopSpeedMs: number): boolean => chargeTopSpeedMs >= RAM.minChargeSpeedMs;

/** What it does to the craft it chases: charge it, shake it off its back, or keep throwing. */
export function chooseAttack(i: AttackInput): { attack: Attack; reason: string } {
  if (!RAM.targets.includes(i.kind) || !i.craftMassKg) return { attack: "lanzar", reason: "no embiste a este blanco" };
  if (i.landed) return i.onThisBody ? { attack: "sacudir", reason: "posado encima: se lo sacude" } : { attack: "lanzar", reason: "posado en otro cuerpo" };
  if (!ramCapable(i.chargeTopSpeedMs)) return { attack: "lanzar", reason: "demasiado lento para embestir" };
  if (i.chargeTopSpeedMs - i.recedeMs < RAM.minClosingMs) return { attack: "lanzar", reason: "la nave huye más rápido de lo que él cierra" };
  if (i.gapM > RAM.startGapM) return { attack: "lanzar", reason: "aún lejos" };
  if (i.gapM < RAM.minRunUpM) return { attack: "lanzar", reason: "demasiado cerca para coger carrera" };
  return { attack: "embestir", reason: "rápido y cerca" };
}

export const reducedMassKg = (m1: number, m2: number): number => (m1 * m2) / (m1 + m2);

export interface RamHit {
  /** Approach speed along the line of centres, m/s. */
  readonly closingMs: number;
  /** ½·μ·|v_rel|², J. */
  readonly energyJ: number;
  /** ½·μ·v_n²·(1 − e²): what the bounce does not return, J. */
  readonly absorbedJ: number;
  /** Velocity change of the craft, m/s (world, along the normal). */
  readonly craftDeltaV: Vec3;
  readonly asteroidDeltaVMs: number;
}

/**
 * Impact of an asteroid of `asteroidKg` on a craft of `craftKg`. `relVelocity` is the asteroid's
 * velocity minus the craft's; `normal` the unit vector from the asteroid's centre to the craft.
 */
export function ramImpact(asteroidKg: number, craftKg: number, relVelocity: Vec3, normal: Vec3, restitution: number = RAM.restitution): RamHit {
  const mu = reducedMassKg(asteroidKg, craftKg);
  const vn = Math.max(0, relVelocity.dot(normal));
  const impulse = (1 + restitution) * mu * vn;
  return {
    closingMs: vn,
    energyJ: 0.5 * mu * relVelocity.dot(relVelocity),
    absorbedJ: 0.5 * mu * vn * vn * (1 - restitution * restitution),
    craftDeltaV: normal.scale(impulse / craftKg),
    asteroidDeltaVMs: impulse / asteroidKg,
  };
}

/** Seconds to cover `distanceM` starting at `v0Ms` (0 = from rest), accelerating at `accelMs2` up to `topSpeedMs` and then cruising. */
export function chargeTimeS(distanceM: number, accelMs2: number, topSpeedMs: number, v0Ms = 0): number {
  if (distanceM <= 0) return 0;
  const v0 = Math.min(Math.max(0, v0Ms), topSpeedMs);
  const t1 = (topSpeedMs - v0) / accelMs2;
  const d1 = v0 * t1 + 0.5 * accelMs2 * t1 * t1;
  if (distanceM <= d1) return (-v0 + Math.sqrt(v0 * v0 + 2 * accelMs2 * distanceM)) / accelMs2;
  return t1 + (distanceM - d1) / topSpeedMs;
}

/**
 * What it takes to dodge: get the craft out of the asteroid's path, a sideways shift of its radius
 * plus the craft's, within `timeS`; from rest that needs 2·s/t².
 */
export function dodgeNeeded(asteroidRadiusM: number, craftRadiusM: number, timeS: number): { lateralM: number; accelMs2: number } {
  const lateralM = asteroidRadiusM + craftRadiusM;
  return { lateralM, accelMs2: timeS > 0 ? (2 * lateralM) / (timeS * timeS) : Infinity };
}

/** Best side to dodge to: the craft's own offset from the charge line, or any perpendicular if it sits on it. */
export function dodgeDirection(chargeDir: Vec3, craftOffset: Vec3): Vec3 {
  const side = craftOffset.sub(chargeDir.scale(craftOffset.dot(chargeDir)));
  if (side.length() > 1e-6 * Math.max(1, craftOffset.length())) return side.normalize();
  const any = Math.abs(chargeDir.y) < 0.9 ? Vec3.Y : Vec3.X;
  return any.sub(chargeDir.scale(any.dot(chargeDir))).normalize();
}

/**
 * A missed charge: at `speedMs` relative to the craft, braking with its ordinary chase push
 * `accelMs2`, it stops v²/2a past it and is back where it missed after 2v/a.
 */
export function overshoot(speedMs: number, accelMs2: number): { stopM: number; turnaroundS: number } {
  return { stopM: (speedMs * speedMs) / (2 * accelMs2), turnaroundS: (2 * speedMs) / accelMs2 };
}
