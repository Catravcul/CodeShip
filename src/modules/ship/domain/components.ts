import type { Vec3 } from "@core/math/vec3";

export type Propellant = "MMH/NTO" | "Hydrazine";

/** Static data of a real thruster model, as published by its maker or a cited reference. */
export interface ThrusterModel {
  readonly id: string;
  readonly name: string;
  readonly thrustN: number;
  readonly ispS: number;
  readonly dryMassKg: number;
  readonly propellant: Propellant;
  readonly sources: readonly string[];
}

/** A thruster bolted to the ship: where it sits and which way it pushes (body frame, metres). */
export interface MountedThruster {
  readonly model: ThrusterModel;
  readonly position: Vec3;
  /** Unit vector of the force it applies to the ship (opposite to the exhaust). */
  readonly direction: Vec3;
}

export interface TankSpec {
  readonly propellant: Propellant;
  readonly capacityKg: number;
  readonly dryMassKg: number;
}

/** The craft's name and outer box. Its mass is the sum of its parts (`ShipDesign.equipment`). */
export interface HullSpec {
  readonly name: string;
  /** Bounding box in metres (x = width, y = height, z = length). Used for inertia. */
  readonly size: Vec3;
}
