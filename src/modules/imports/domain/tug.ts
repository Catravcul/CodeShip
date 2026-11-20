import { G0 } from "@core/units";

/** A solar-electric tug that grabs a boulder off a small body and hauls it to the station. */
export interface TugSpec {
  /** Electric power to the thrusters, W. */
  readonly powerW: number;
  readonly ispS: number;
  /** Share of the electric power that ends up in the beam (thrust power / electric power). */
  readonly efficiency: number;
  /** Tug without xenon, kg. */
  readonly dryKg: number;
  /** Xenon it can carry, kg. */
  readonly xenonCapacityKg: number;
  /** Largest boulder its capture arms close around, m. */
  readonly maxBoulderM: number;
  /** Hours on the surface to find, grab and lift the boulder (game value). */
  readonly captureHours: number;
}

/** Thrust of an electric thruster: F = 2ηP / (g0·Isp), N. */
export const thrustN = (t: Pick<TugSpec, "powerW" | "ispS" | "efficiency">): number => (2 * t.efficiency * t.powerW) / (G0 * t.ispS);

/** Mass of a spherical boulder of diameter d and bulk density ρ, kg. */
export const boulderKg = (diameterM: number, densityKgM3: number): number => densityKgM3 * (Math.PI / 6) * diameterM ** 3;

export interface Leg {
  readonly hours: number;
  readonly dvMs: number;
  readonly accelMs2: number;
}

/**
 * Accelerate half the way and brake the other half (constant thrust, no gravity: the small bodies
 * pull almost nothing): t = 2√(d/a), Δv = 2√(d·a).
 */
export function brachistochrone(distanceM: number, massKg: number, forceN: number): Leg {
  const a = forceN / massKg;
  return { hours: (2 * Math.sqrt(distanceM / a)) / 3600, dvMs: 2 * Math.sqrt(distanceM * a), accelMs2: a };
}

export interface TowPlan {
  readonly boulderKg: number;
  readonly out: Leg;
  readonly back: Leg;
  readonly captureHours: number;
  readonly totalHours: number;
  /** Xenon burnt on both legs, kg (rocket equation). */
  readonly xenonKg: number;
  readonly thrustN: number;
}

/** A round trip: empty to the body, capture, then back with the boulder. */
export function towPlan(spec: TugSpec, distanceM: number, diameterM: number, densityKgM3: number, xenonKg = spec.xenonCapacityKg): TowPlan {
  if (diameterM > spec.maxBoulderM) throw new Error(`The arms close around ${spec.maxBoulderM} m at most`);
  const f = thrustN(spec);
  const rock = boulderKg(diameterM, densityKgM3);
  const ve = G0 * spec.ispS;
  const start = spec.dryKg + xenonKg;
  const out = brachistochrone(distanceM, start, f);
  const afterOut = start * Math.exp(-out.dvMs / ve);
  const back = brachistochrone(distanceM, afterOut + rock, f);
  const end = (afterOut + rock) * Math.exp(-back.dvMs / ve) - rock;
  return { boulderKg: rock, out, back, captureHours: spec.captureHours, totalHours: out.hours + spec.captureHours + back.hours, xenonKg: start - end, thrustN: f };
}
