import type { Sourced } from "@core/units";

/**
 * The station's own engines: a pair of chemical engines like the ones on the ISS's Zvezda module,
 * used for reboosts and, here, to move the station out of an angry asteroid's reach (survival mode,
 * docs/design/poderes-ira.md). One engine model, its count, the propellant on board and the station's
 * mass, each with where it comes from.
 */
export interface StationDriveSpec {
  readonly engine: string;
  readonly engines: number;
  /** Thrust of one engine, N. */
  readonly thrustN: Sourced<number>;
  readonly ispS: Sourced<number>;
  readonly propellant: string;
  readonly propellantKg: Sourced<number>;
  /** Dry mass of the whole station, kg. */
  readonly dryMassKg: Sourced<number>;
}

export const totalThrustN = (d: StationDriveSpec): number => d.engines * d.thrustN.value;
