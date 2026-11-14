import { Vec3 } from "@core/math/vec3";

/**
 * Gravity drive (game fiction, docs/design/subyugacion.md §«Se mueven solos»): every asteroid has some
 * control over gravity, enough to move itself. That is why subjugating one is such good business: it
 * can be talked into flying to the station on its own, fast; and an angry one can chase the ship
 * that enraged it until it calms down.
 *
 * Every number here is a labelled game value (no real asteroid does this).
 */
export const GRAVITY_DRIVE = {
  /** Reference body: Bennu's mass, kg (Wikipedia, 7.329×10¹⁰ kg). Yields and accelerations scale from it. */
  referenceMassKg: 7.329e10,
  /** Acceleration of a Bennu-sized body at full effort, m/s² (game value). */
  referenceAccelMs2: 0.06,
  /**
   * How acceleration falls with mass: a ∝ (M_ref / M)^exponent. Small on purpose so the big ones are
   * slower but still move (a 2,4 km member reaches ~0,45 of Bennu's).
   */
  massExponent: 1 / 6,
  /** Chase: fraction of full effort at anger 0 and at anger 1 (it chases harder the angrier it is). */
  chaseEffort: [0.5, 1] as const,
  /** Chase top speed of a Bennu-sized body at anger 1, m/s: the lander's engine can outrun it. */
  chaseTopSpeedMs: 4,
  /** A willing asteroid flying to the station puts everything into it: ×this the chase acceleration. */
  transitBoost: 20,
  /** Top speed of a willing asteroid, m/s (high speed for a mountain, still a few minutes across the region). */
  transitTopSpeedMs: 60,
  /** Cruise home after calming down, as a fraction of the chase profile at anger 0. */
  homeEffort: 0.5,
  /**
   * A ram (docs/design/poderes-ira.md, «Embestida») is a sprint: ×this the chase acceleration, half the
   * push of a willing trip (game value).
   */
  chargeBoost: 10,
  /** A sprint drops the braking reserve of the chase: ×this its top speed (game value; Bennu at full anger, 8 m/s). */
  chargeTopFactor: 2,
} as const;

/** How hard a body can push itself: acceleration and top speed. */
export interface DriveProfile {
  readonly accelMs2: number;
  readonly topSpeedMs: number;
}

/** Mass factor of the drive: 1 for Bennu, smaller for heavier bodies. */
export function driveMassFactor(massKg: number): number {
  return Math.pow(GRAVITY_DRIVE.referenceMassKg / Math.max(massKg, 1), GRAVITY_DRIVE.massExponent);
}

/** Full-effort acceleration of a body of this mass, m/s². */
export function driveAccelMs2(massKg: number): number {
  return GRAVITY_DRIVE.referenceAccelMs2 * driveMassFactor(massKg);
}

/** Pursuit of the craft that enraged it: harder and faster the angrier it is (anger 0..1). */
export function chaseProfile(massKg: number, anger: number): DriveProfile {
  const [lo, hi] = GRAVITY_DRIVE.chaseEffort;
  const effort = lo + (hi - lo) * Math.min(1, Math.max(0, anger));
  const k = driveMassFactor(massKg);
  return { accelMs2: driveAccelMs2(massKg) * effort, topSpeedMs: GRAVITY_DRIVE.chaseTopSpeedMs * k * effort };
}

/** A ram: the chase profile at this anger, sprinting (no braking reserve). */
export function chargeProfile(massKg: number, anger: number): DriveProfile {
  const c = chaseProfile(massKg, anger);
  return { accelMs2: c.accelMs2 * GRAVITY_DRIVE.chargeBoost, topSpeedMs: c.topSpeedMs * GRAVITY_DRIVE.chargeTopFactor };
}

/** Calm cruise back to where it lives. */
export function homeProfile(massKg: number): DriveProfile {
  const c = chaseProfile(massKg, 0);
  return { accelMs2: c.accelMs2 * GRAVITY_DRIVE.homeEffort * 2, topSpeedMs: c.topSpeedMs * GRAVITY_DRIVE.homeEffort * 2 };
}

/** A subjugated asteroid flying itself to the station (subjugation level 4). */
export function transitProfile(massKg: number): DriveProfile {
  return { accelMs2: driveAccelMs2(massKg) * GRAVITY_DRIVE.transitBoost, topSpeedMs: GRAVITY_DRIVE.transitTopSpeedMs * driveMassFactor(massKg) };
}

/** Where a self-propelled body is and how fast it goes. */
export interface DriveState {
  readonly position: Vec3;
  readonly velocity: Vec3;
}

/**
 * One step of the drive's guidance towards a goal (which may move): it wants to close at the speed
 * it can still brake from — v = min(top, √(2·a·d)) — matched to the goal's velocity but never above its top speed, and changes its
 * velocity towards that by at most a·dt. It stops `standoffM` short of the goal.
 */
export function stepDrive(s: DriveState, goal: { position: Vec3; velocity?: Vec3 }, p: DriveProfile, dtS: number, standoffM = 0): DriveState {
  const gv = goal.velocity ?? Vec3.ZERO;
  const rel = goal.position.sub(s.position);
  const d = rel.length();
  const gap = d - standoffM;
  const dir = d > 1e-9 ? rel.scale(1 / d) : Vec3.ZERO;
  // Closing speed it can still brake from (one step of margin so it does not overshoot).
  // Discrete braking curve: the speed from which steps of a·dt stop it within the gap.
  const h = (p.accelMs2 * dtS) / 2;
  const closing = gap > 0 ? Math.min(p.topSpeedMs, Math.sqrt(h * h + 2 * p.accelMs2 * gap) - h, gap / Math.max(dtS, 1e-6)) : 0;
  // Never faster than its top speed, whatever the goal does: a fast enough craft outruns it.
  const raw = gv.add(dir.scale(closing));
  const want = raw.length() > p.topSpeedMs ? raw.normalize().scale(p.topSpeedMs) : raw;
  const dv = want.sub(s.velocity);
  const max = p.accelMs2 * dtS;
  const applied = dv.length() > max ? dv.normalize().scale(max) : dv;
  const velocity = s.velocity.add(applied);
  return { position: s.position.add(velocity.scale(dtS)), velocity };
}

/**
 * One step of a charge: a straight sprint along `direction` (a unit vector locked when it set off).
 * It wants `direction · top` and changes its velocity towards it by at most a·dt, so whatever sideways
 * drift it had is cancelled first. No braking: it means to hit, and it overshoots if it misses.
 */
export function stepCharge(s: DriveState, direction: Vec3, p: DriveProfile, dtS: number): DriveState {
  const dv = direction.scale(p.topSpeedMs).sub(s.velocity);
  const max = p.accelMs2 * dtS;
  const velocity = s.velocity.add(dv.length() > max ? dv.normalize().scale(max) : dv);
  return { position: s.position.add(velocity.scale(dtS)), velocity };
}

/**
 * Game seconds a trip of `distanceM` takes from rest to rest: accelerate, cruise at top speed if it
 * gets there, brake. Used for the ETA shown on the map and the radio.
 */
export function driveTripS(distanceM: number, p: DriveProfile): number {
  if (distanceM <= 0) return 0;
  const accelDist = (p.topSpeedMs * p.topSpeedMs) / p.accelMs2; // speeding up plus braking
  if (distanceM <= accelDist) return 2 * Math.sqrt(distanceM / p.accelMs2);
  return (2 * p.topSpeedMs) / p.accelMs2 + (distanceM - accelDist) / p.topSpeedMs;
}
