import { G0 } from "@core/units";

/**
 * The mothership's electric propulsion as swappable parts: each thruster mount (a pod at the aft
 * end) holds some units of one thruster type. What the ship can do (thrust, exhaust speed, xenon
 * use) is worked out from what is fitted, and the reactor sets how many units can fire at once.
 * See docs/design/nave-nodriza.md, «Propulsores intercambiables».
 */

export type ElectricPropellant = "xenon" | "kripton" | "argon";

export const PROPELLANT_NAME: Readonly<Record<ElectricPropellant, string>> = { xenon: "xenón", kripton: "kriptón", argon: "argón" };

export type ThrusterFamily = "hall" | "ionico" | "vasimr";

/** A real electric thruster at one operating point, as a part that can be built and fitted. */
export interface ElectricThruster {
  /** Part id: what the station's hangar keeps and the blueprint makes. */
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly family: ThrusterFamily;
  readonly thrustN: number;
  readonly ispS: number;
  /** Electric power one unit draws at this point, kW. */
  readonly powerKw: number;
  /** Mass of the thruster head, kg. */
  readonly thrusterMassKg: number;
  /** Mass of its power processing unit (or RF generators), kg. */
  readonly ppuMassKg: number;
  /** Outer diameter of the head: how many fit side by side on a mount, m. */
  readonly diameterM: number;
  /** Propellants it has run on in published tests; its numbers are for the first one. */
  readonly propellants: readonly ElectricPropellant[];
  /** Never flown or not even a flight design yet (VASIMR). */
  readonly experimental?: boolean;
  readonly sources: readonly string[];
  /** Which numbers are estimates and how they were reached. */
  readonly note?: string;
}

/** A place on the ship where thrusters are fitted: the open face of a pod (game values). */
export interface ThrusterMount {
  readonly id: string;
  readonly name: string;
  readonly faceWidthM: number;
  readonly faceHeightM: number;
}

/** What a mount holds: `count` units of one thruster type. */
export interface MountFit {
  readonly mountId: string;
  readonly thruster: ElectricThruster;
  readonly count: number;
}

/** Game rule: heads sit on a square grid a quarter of a diameter apart (room for plumes and wiring). */
export const MOUNT_PITCH_FACTOR = 1.25;

/** Grid of positions a mount has for a thruster type: columns × rows. */
export function mountGrid(m: ThrusterMount, t: ElectricThruster): { cols: number; rows: number } {
  const pitch = t.diameterM * MOUNT_PITCH_FACTOR;
  return { cols: Math.floor(m.faceWidthM / pitch), rows: Math.floor(m.faceHeightM / pitch) };
}

/** Most units of a type that fit on a mount. */
export function maxPerMount(m: ThrusterMount, t: ElectricThruster): number {
  const g = mountGrid(m, t);
  return g.cols * g.rows;
}

/** Mass of one fitted unit with its power processing, kg. */
export const unitMassKg = (t: ElectricThruster): number => t.thrusterMassKg + t.ppuMassKg;

/** Why a fit is not possible, or undefined if it is. */
export type FitProblem = { readonly kind: "propelente"; readonly needs: readonly ElectricPropellant[] } | { readonly kind: "no-cabe"; readonly max: number } | { readonly kind: "cantidad" };

export function fitProblem(m: ThrusterMount, t: ElectricThruster, count: number, propellant: ElectricPropellant): FitProblem | undefined {
  if (!Number.isInteger(count) || count < 0) return { kind: "cantidad" };
  if (count > 0 && !t.propellants.includes(propellant)) return { kind: "propelente", needs: t.propellants };
  const max = maxPerMount(m, t);
  if (count > max) return { kind: "no-cabe", max };
  return undefined;
}

/** One mount's share of the plan: units fitted and units the reactor can feed. */
export interface MountPlan {
  readonly mountId: string;
  readonly thruster: ElectricThruster;
  readonly fitted: number;
  readonly firing: number;
}

/** What the fitted thrusters can do together with the power on hand. */
export interface DrivePlan {
  readonly mounts: readonly MountPlan[];
  readonly fittedUnits: number;
  readonly firingUnits: number;
  readonly thrustN: number;
  /** Power the firing units draw, kW (never more than `availableKw`). */
  readonly powerKw: number;
  readonly availableKw: number;
  /** Propellant flow of the firing units, kg/s. */
  readonly massFlowKgS: number;
  /** Effective specific impulse of the mix: total thrust over g₀ · total flow, s (0 if nothing fires). */
  readonly ispS: number;
  /** Dry mass of every fitted unit with its power processing, kg. */
  readonly massKg: number;
}

/**
 * Which units can fire with `availableKw`: whole units, taken in turn from each mount so the pods stay
 * balanced, skipping a unit when its power no longer fits. Units that cannot use the propellant on
 * board never fire.
 */
export function drivePlan(fits: readonly MountFit[], availableKw: number, propellant: ElectricPropellant): DrivePlan {
  const firing = fits.map(() => 0);
  let power = 0;
  let progress = true;
  while (progress) {
    progress = false;
    fits.forEach((f, i) => {
      if (firing[i]! >= f.count || !f.thruster.propellants.includes(propellant)) return;
      if (power + f.thruster.powerKw > availableKw + 1e-9) return;
      firing[i]!++;
      power += f.thruster.powerKw;
      progress = true;
    });
  }
  const mounts = fits.map((f, i): MountPlan => ({ mountId: f.mountId, thruster: f.thruster, fitted: f.count, firing: firing[i]! }));
  const thrustN = mounts.reduce((s, m) => s + m.firing * m.thruster.thrustN, 0);
  const massFlowKgS = mounts.reduce((s, m) => s + (m.firing * m.thruster.thrustN) / (m.thruster.ispS * G0), 0);
  return {
    mounts,
    fittedUnits: mounts.reduce((s, m) => s + m.fitted, 0),
    firingUnits: mounts.reduce((s, m) => s + m.firing, 0),
    thrustN,
    powerKw: power,
    availableKw,
    massFlowKgS,
    ispS: massFlowKgS > 0 ? thrustN / (G0 * massFlowKgS) : 0,
    massKg: fits.reduce((s, f) => s + f.count * unitMassKg(f.thruster), 0),
  };
}
