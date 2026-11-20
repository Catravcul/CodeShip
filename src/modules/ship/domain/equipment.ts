/**
 * The probe's equipment besides thrusters and tanks: the cabin (pressure vessel), the power source,
 * the battery, the micrometeoroid shield and the fixed systems (structure, docking, legs, avionics,
 * radio, life support, thermal). The dry mass is the sum of what is fitted; nothing is a placeholder.
 * See docs/design/componentes.md.
 */

/** Equipment that can be swapped in the ship bay. */
export type EquipmentSlot = "cabina" | "energia" | "bateria" | "escudo";
/** Systems that are fitted but not swappable (yet). */
export type FixedKind = "estructura" | "acople" | "tren" | "avionica" | "comunicaciones" | "soporte-vital" | "termico";
export type EquipmentKind = EquipmentSlot | FixedKind;

export const EQUIPMENT_SLOTS: readonly EquipmentSlot[] = ["cabina", "energia", "bateria", "escudo"];
export const isEquipmentSlot = (s: string): s is EquipmentSlot => (EQUIPMENT_SLOTS as readonly string[]).includes(s);

/** Pressure wall of a cabin: one material at one thickness. */
export interface PressureWall {
  readonly material: string;
  readonly thicknessMm: number;
  readonly densityKgM3: number;
}

/** Outer bumper of a Whipple shield: a thin sheet held `standoffCm` off the wall. */
export interface WhippleBumper {
  readonly material: string;
  readonly thicknessCm: number;
  readonly densityGcm3: number;
  readonly standoffCm: number;
}

/** A real component (or one sized from real data) with what it weighs, draws and is made of. */
export interface Equipment {
  readonly id: string;
  readonly name: string;
  readonly kind: EquipmentKind;
  readonly massKg: number;
  /** Mean electric power in flight: positive if it produces, negative if it draws, W. */
  readonly powerW: number;
  /** Production is given at 1 AU and falls with the square of the distance to the Sun. */
  readonly solar?: boolean;
  /** Energy it stores, Wh. */
  readonly storageWh?: number;
  /** A primary battery (silver-zinc like the lunar module's) cannot be recharged. */
  readonly rechargeable?: boolean;
  readonly wall?: PressureWall;
  readonly bumper?: WhippleBumper;
  /** What it is made of. */
  readonly materials: string;
  /** Size, if the source gives it. */
  readonly size?: string;
  /** Flight history or readiness level. */
  readonly flight: string;
  /** How each number was reached: copied from the source, derived from it, or an estimate. */
  readonly basis: string;
  readonly sources: readonly string[];
}

export const equipmentMassKg = (list: readonly Equipment[]): number => list.reduce((m, e) => m + e.massKg, 0);
export const equipmentOf = (list: readonly Equipment[], kind: EquipmentKind): Equipment | undefined => list.find((e) => e.kind === kind);

/** Mass per square metre of a pressure wall, kg/m². */
export const wallArealDensityKgM2 = (w: PressureWall): number => (w.thicknessMm / 1000) * w.densityKgM3;
