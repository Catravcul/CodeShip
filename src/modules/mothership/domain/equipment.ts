/**
 * The mothership's swappable equipment besides its thrusters: auxiliary power (solar wings or small
 * fission units next to the main reactor) and the radiation shield around the habitat. See
 * docs/design/componentes.md.
 */

export type MothershipSlot = "energia-auxiliar" | "blindaje";

export const MOTHERSHIP_SLOTS: readonly MothershipSlot[] = ["energia-auxiliar", "blindaje"];

/** Shielding materials with a published dose curve (water is interpolated, see `relativeDose`). */
export type ShieldMaterial = "aluminio" | "polietileno" | "cfrp" | "agua" | "escoria";

export interface MothershipEquipment {
  readonly id: string;
  readonly name: string;
  readonly slot: MothershipSlot;
  readonly massKg: number;
  /** Electric power it adds, kW (at 1 AU if solar). */
  readonly powerKw: number;
  readonly solar?: boolean;
  /** Radiation shield: material and areal density around the habitat. */
  readonly shield?: { readonly material: ShieldMaterial; readonly arealDensityGcm2: number };
  readonly materials: string;
  readonly flight: string;
  readonly basis: string;
  readonly sources: readonly string[];
}

/** Power it gives at `au` from the Sun, kW. */
export const auxPowerKw = (e: MothershipEquipment, au: number): number => (e.solar ? e.powerKw / (au * au) : e.powerKw);

/**
 * GCR dose behind a shield relative to none, solar minimum, ICRP quality factors: Naito & Kodaira 2022
 * (Scientific Reports 12:13617), table 2, at 0, 5, 10, 15 and 20 g/cm².
 */
export const RELATIVE_DOSE: Readonly<Record<"aluminio" | "polietileno" | "cfrp", readonly number[]>> = {
  aluminio: [1, 0.81, 0.7, 0.62, 0.55],
  polietileno: [1, 0.75, 0.61, 0.51, 0.45],
  cfrp: [1, 0.77, 0.64, 0.55, 0.48],
};
const STEP_GCM2 = 5;

/** Hydrogen mass fraction: what makes a light shield good against cosmic rays (water 2/18, polyethylene 2/14). */
const H_FRACTION = { agua: 2.016 / 18.015, polietileno: 2.016 / 14.027 };

function curve(table: readonly number[], x: number): number {
  const i = Math.min(table.length - 2, Math.floor(Math.max(0, x) / STEP_GCM2));
  const t = Math.max(0, x) / STEP_GCM2 - i;
  // Past 20 g/cm² the last segment is extended (estimate), never below zero.
  return Math.max(0.05, table[i]! + (table[i + 1]! - table[i]!) * t);
}

/**
 * Dose behind `gcm2` of a material relative to no shield. Water is not in the table: it is placed
 * between aluminium (no hydrogen) and polyethylene by its hydrogen content (estimate). Slag and rock
 * are taken as aluminium (estimate: similar charge-to-mass ratio, no hydrogen).
 */
export function relativeDose(material: ShieldMaterial, gcm2: number): number {
  if (gcm2 <= 0) return 1;
  if (material === "agua") {
    const k = H_FRACTION.agua / H_FRACTION.polietileno;
    return curve(RELATIVE_DOSE.aluminio, gcm2) + (curve(RELATIVE_DOSE.polietileno, gcm2) - curve(RELATIVE_DOSE.aluminio, gcm2)) * k;
  }
  return curve(RELATIVE_DOSE[material === "escoria" ? "aluminio" : material], gcm2);
}
