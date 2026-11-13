import type { Vec3 } from "@core/math/vec3";

/**
 * What a tank holds. A bipropellant pair (MMH/NTO) is one pool: a fuel tank and an oxidizer tank of
 * equal volume, emptied together at the engine's mixture ratio. Hydrazine and LMP-103S are monopropellants.
 */
export type Propellant = "MMH/NTO" | "Hydrazine" | "LMP-103S";

/**
 * How propellant reaches the thrusters. A bipropellant pair is pushed by a regulated helium bottle;
 * a monopropellant tank is blowdown (the gas in its ullage pushes a diaphragm and its pressure falls).
 * A tank bay is plumbed for one feed system, so a tank only swaps for one of the same system.
 */
export type FeedSystem = "bipropelente" | "monopropelente";
export const feedSystemOf = (p: Propellant): FeedSystem => (p === "MMH/NTO" ? "bipropelente" : "monopropelente");

/** What the bay's full sheet shows for a thruster: everything the sources give beyond the core numbers. */
export interface ThrusterSheet {
  /** Steady-state thrust range over the feed pressures it is qualified for. */
  readonly thrustRange: string;
  readonly ispRange: string;
  /** Oxidizer-to-fuel mass ratio (bipropellants). */
  readonly mixtureRatio?: number;
  readonly inletPressure?: string;
  /** Electric power when it fires or stands by (valves, catalyst-bed heaters), as published. */
  readonly power: string;
  /** Chamber and nozzle materials. */
  readonly chamber: string;
  /** Qualified starts, pulses, longest burn. */
  readonly life: string;
  readonly throttle: string;
  readonly flight: string;
  /** Readiness: in production, flown, qualified, in development. */
  readonly status: string;
  /** Whether its chamber needs a refractory or precious metal the rock does not give (niobium, rhenium, iridium, platinum). */
  readonly importedChamber: boolean;
}

/** Static data of a real thruster model, as published by its maker or a cited reference. */
export interface ThrusterModel {
  readonly id: string;
  readonly name: string;
  readonly thrustN: number;
  readonly ispS: number;
  readonly dryMassKg: number;
  readonly propellant: Propellant;
  readonly sources: readonly string[];
  readonly sheet?: ThrusterSheet;
}

/** A thruster bolted to the ship: where it sits and which way it pushes (body frame, metres). */
export interface MountedThruster {
  readonly model: ThrusterModel;
  readonly position: Vec3;
  /** Unit vector of the force it applies to the ship (opposite to the exhaust). */
  readonly direction: Vec3;
}

/** One real tank from a maker's catalogue. */
export interface RealTank {
  /** Maker's part number or model name. */
  readonly id: string;
  readonly maker: string;
  readonly volumeL: number;
  /** Maximum expected operating pressure, bar. */
  readonly meopBar: number;
  readonly massKg: number;
  readonly material: string;
  /** How the liquid is kept at the outlet: an elastomer diaphragm, a propellant management device (PMD), or none (gas). */
  readonly expulsion: "diafragma" | "PMD" | "gas";
  readonly flight: string;
  readonly source: string;
}

/** The helium that pushes a bipropellant pair: the bottle, the gas and the regulator, valves and lines. */
export interface PressurantLine {
  readonly bottle: RealTank;
  readonly heliumKg: number;
  /** Regulator, latch and check valves, filters and lines. */
  readonly hardwareKg: number;
  /** Bottle volume the propellant tanks need, litres (the bottle fitted is at least this). */
  readonly neededL: number;
  readonly basis: string;
}

/** The real hardware behind a tank slot: `count` identical tanks and, for a pair, its helium line. */
export interface TankBuild {
  readonly tank: RealTank;
  readonly count: number;
  /** Share of the tank volume that can be filled with liquid. */
  readonly fillFraction: number;
  readonly fillBasis: string;
  readonly pressurant?: PressurantLine;
}

export interface TankSpec {
  readonly propellant: Propellant;
  readonly capacityKg: number;
  /** Tanks plus, for a pair, the pressurant line. */
  readonly dryMassKg: number;
  /** Real tanks behind the numbers (absent only in hand-written test specs). */
  readonly build?: TankBuild;
}

/** The craft's name and outer box. Its mass is the sum of its parts (`ShipDesign.equipment`). */
export interface HullSpec {
  readonly name: string;
  /** Bounding box in metres (x = width, y = height, z = length). Used for inertia. */
  readonly size: Vec3;
}
