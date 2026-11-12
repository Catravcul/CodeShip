/**
 * Short transfers inside a region: burn – coast – flip – brake along a straight path, with the
 * ship's real main-engine acceleration. Distances in the region are compressed for play
 * (docs/research/sistema-solar.md), so these are minutes-long hops, not Hohmann transfers.
 */

/** Game values for trip planning (docs/design/navegacion.md). */
export const TRANSFER_TUNING = {
  /** Hand control back this high above the target's surface, metres. */
  approachM: 300,
  /** Fastest cruise the autopilot plans, m/s: quick hops but still room to stop and to see rocks go by. */
  maxCruiseMS: 25,
  /** At most this share of the main engine's Δv on one hop (accelerate + brake). */
  maxDeltaVShare: 0.5,
  /** The autopilot brakes with this share of the engine's acceleration, to keep a margin. */
  brakeShare: 0.8,
} as const;

export interface TransferInput {
  /** Path length from the ship to the hand-over point, metres. */
  readonly distanceM: number;
  /** Main engine acceleration at full throttle, m/s² (thrust / mass). */
  readonly accelMS2: number;
  /** Δv left in the main engine, m/s. */
  readonly deltaVAvailableMS: number;
}

export interface TransferPlan {
  readonly distanceM: number;
  readonly accelMS2: number;
  /** Planned cruise speed, whole m/s. */
  readonly cruiseMS: number;
  /** Seconds of each burn (accelerate and brake are the same). */
  readonly burnS: number;
  /** Distance covered during one burn: v² / (2a). */
  readonly burnDistanceM: number;
  readonly coastDistanceM: number;
  readonly coastS: number;
  /** Time of flight, d/v + v/a. */
  readonly totalS: number;
  /** Δv spent: accelerate to cruise and brake from it. */
  readonly deltaVMS: number;
  /** False when the engine has no propellant left for the hop. */
  readonly feasible: boolean;
}

/**
 * Plans the hop: cruise speed limited by the tuning, by the Δv budget and by the distance (it must
 * reach cruise and stop again), rounded down to whole m/s so the challenges use clean numbers.
 */
export function planTransfer(input: TransferInput, tuning = TRANSFER_TUNING): TransferPlan {
  const d = Math.max(0, input.distanceM);
  const a = input.accelMS2;
  const byBudget = (input.deltaVAvailableMS * tuning.maxDeltaVShare) / 2;
  const byDistance = Math.sqrt(a * d);
  const raw = Math.min(tuning.maxCruiseMS, byBudget, byDistance);
  const cruise = raw >= 1 ? Math.floor(raw) : Math.round(raw * 10) / 10;
  const feasible = a > 0 && cruise > 0;
  if (!feasible || d === 0) {
    return { distanceM: d, accelMS2: a, cruiseMS: feasible ? cruise : 0, burnS: 0, burnDistanceM: 0, coastDistanceM: d, coastS: 0, totalS: 0, deltaVMS: 0, feasible: feasible && d >= 0 };
  }
  const burnS = cruise / a;
  const burnDistanceM = (cruise * cruise) / (2 * a);
  const coastDistanceM = Math.max(0, d - 2 * burnDistanceM);
  const coastS = coastDistanceM / cruise;
  return { distanceM: d, accelMS2: a, cruiseMS: cruise, burnS, burnDistanceM, coastDistanceM, coastS, totalS: 2 * burnS + coastS, deltaVMS: 2 * cruise, feasible };
}

/**
 * Time to turn the ship by `angleRad` from rest to rest with angular acceleration `alpha` and a
 * top rate `maxRate` (accelerate, maybe hold, decelerate).
 */
export function turnTimeS(angleRad: number, alphaRadS2: number, maxRateRadS: number): number {
  const a = Math.abs(angleRad);
  if (alphaRadS2 <= 0) return Infinity;
  if (a < (maxRateRadS * maxRateRadS) / alphaRadS2) return 2 * Math.sqrt(a / alphaRadS2);
  return a / maxRateRadS + maxRateRadS / alphaRadS2;
}
