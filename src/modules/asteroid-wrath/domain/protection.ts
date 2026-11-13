import { DEBRIS_TUNING, monolithicCriticalDiameterCm, whippleCriticalDiameterCm } from "@modules/ship/domain/mmod";
import type { WhippleBumper } from "@modules/ship/domain/equipment";
import type { TargetKind } from "./power";
import type { RadiationShield } from "./radiation";

/**
 * How a target stands up to an attack. Impact energy is turned into lost hull integrity; the wall and
 * the micrometeoroid shield cut down what fast fragments and pebbles do (NASA critical-diameter
 * equations, docs/design/componentes.md); the radiation shield cuts the dose.
 */
export interface Protection {
  /** Impact energy that takes the hull from intact to wrecked, J (game value per kind). */
  readonly hullEnergyJ: number;
  /** Multiplier on fragment and pebble damage from the wall and shield (1 = the lander's bare starting cabin). */
  readonly debrisFactor: number;
  /** What stands between a crew and radiation; absent for an uncrewed craft. */
  readonly radiation?: RadiationShield;
  /** Uncrewed craft: dose its electronics take before they fail, mSv (≈ mGy for gamma). */
  readonly electronicsToleranceMSv?: number;
}

/**
 * Energy that wrecks each kind of target, J. Game values, chosen so a tier-2 block (about a tonne at
 * 6 m/s) takes a quarter of the lander and the big ships shrug off rocks but not a nuclear burst.
 */
export const HULL_ENERGY_J: Readonly<Record<TargetKind, number>> = {
  sonda: 3e3,
  aterrizador: 60e3,
  traje: 1.5e3,
  nodriza: 30e6,
  estacion: 50e6,
};

/** Commercial-grade electronics fail after a few krad; 50 Gy = 5 krad (estimate, rad-hard parts last far longer). */
export const PROBE_ELECTRONICS_TOLERANCE_MSV = 50_000;

/** A rock heavier than this hits like a blunt crash: a Whipple bumper does not stop it (game rule, same as ground contact). */
export const BLUNT_ROCK_KG = 1;

/** Debris factor of a bare wall of `arealDensityGcm2` (aluminium-equivalent), against the starting cabin. */
export const wallDebrisFactor = (arealDensityGcm2: number): number => {
  const dc = monolithicCriticalDiameterCm(arealDensityGcm2);
  return dc > 0 ? DEBRIS_TUNING.referenceCriticalDiameterCm / dc : 1;
};

/** Debris factor of a Whipple shield over a rear wall of `rearWallCm` of aluminium. */
export const whippleDebrisFactor = (rearWallCm: number, bumper: WhippleBumper): number =>
  DEBRIS_TUNING.referenceCriticalDiameterCm / Math.max(monolithicCriticalDiameterCm(rearWallCm * 2.7), whippleCriticalDiameterCm(rearWallCm, bumper));

/** Hull fraction an impact of `energyJ` takes off; `blunt` impacts get no help from the shield. */
export function impactFraction(energyJ: number, p: Protection, blunt: boolean): number {
  return (Math.max(0, energyJ) / p.hullEnergyJ) * (blunt ? 1 : p.debrisFactor);
}

/** Hull integrity of a target the game does not model elsewhere (mothership, station). 1 = intact. */
export class Hull {
  private _integrity = 1;
  get integrity(): number {
    return this._integrity;
  }
  damage(fraction: number): void {
    this._integrity = Math.max(0, this._integrity - Math.max(0, fraction));
  }
  repair(fraction: number): void {
    this._integrity = Math.min(1, this._integrity + Math.max(0, fraction));
  }
}
