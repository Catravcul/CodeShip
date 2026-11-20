/**
 * The launch safety distance (Cold Sanctuary's LaunchHeightRule.MinDistance; FAA 14 CFR 420 and DoD/NDIA):
 * a rocket that blows up on its pad is taken as 20 % of its propellant in TNT; the inhabited building distance
 * (K40, about 8 kPa) is 15,87 m·kg^-1/3 times the cube root of that TNT; and 50 % more for the debris.
 * Electron: ~10,2 t of propellant → 2 t of TNT → 201 m → 300 m. Crewed Falcon 9: 488 t → 98 t → 731 m → ~1,1 km.
 */
export const TNT_FRACTION = 0.2;
/** K40 in metres per kg^1/3 (40 ft/lb^1/3). */
export const K40 = 15.87;
export const DEBRIS_FACTOR = 1.5;

export const tntKg = (propellantKg: number, fraction = TNT_FRACTION): number => propellantKg * fraction;

/** Inhabited building distance of an explosion of `tnt` kg of TNT, m. */
export const inhabitedBuildingDistanceM = (tnt: number): number => K40 * Math.cbrt(Math.max(0, tnt));

/** The safety distance of a rocket with this much propellant: the inhabited building distance, +50 % for debris. */
export function safetyDistanceM(propellantKg: number): number {
  return inhabitedBuildingDistanceM(tntKg(propellantKg)) * DEBRIS_FACTOR;
}

export interface PlanPoint {
  readonly x: number;
  readonly z: number;
}

/** A footprint on the sea, as a rectangle on the plan (m). */
export interface Footprint {
  readonly id: string;
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
}

/** Shortest distance on the plan from a point to a footprint (0 inside), m. */
export function distanceTo(p: PlanPoint, f: Footprint): number {
  const dx = Math.max(f.x0 - p.x, 0, p.x - f.x1);
  const dz = Math.max(f.z0 - p.z, 0, p.z - f.z1);
  return Math.hypot(dx, dz);
}

/** Every inhabited footprint closer to the pad than the rule asks, with how far it is. */
export function tooClose(pad: PlanPoint, minM: number, inhabited: readonly Footprint[]): { id: string; distanceM: number }[] {
  return inhabited.map((f) => ({ id: f.id, distanceM: distanceTo(pad, f) })).filter((d) => d.distanceM < minM - 1e-6);
}
