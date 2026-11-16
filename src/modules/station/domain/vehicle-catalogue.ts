import type { Sourced } from "@core/units";
import type { CraftSpec } from "./blueprint";
import type { Craft, Hangar } from "./hangar";

/**
 * The vehicle catalogue (docs/design/naves-reales.md): real ships, landers, probes and stations as
 * recipes of components. Each component is a part with its own blueprint at the station; the vehicle
 * is assembled from the parts waiting in the hangar.
 *
 * - `volado`: real and flown (or flying now).
 * - `en-desarrollo`: real programme with money and a launch date.
 * - `pausado`: hardware built, programme stopped (Gateway, March 2026).
 * - `concepto`: studies and roadmaps, no programme that pays for the vehicle.
 * - `inventado`: made up for the game (even if its parts are real).
 */
export type VehicleStatus = "volado" | "en-desarrollo" | "pausado" | "concepto" | "inventado";
export type VehicleKind = "nave" | "aterrizador" | "sonda" | "estacion";

export const STATUS_NAME: Readonly<Record<VehicleStatus, string>> = {
  volado: "Ha volado",
  "en-desarrollo": "En desarrollo",
  pausado: "En pausa",
  concepto: "Concepto",
  inventado: "Inventado",
};
export const VEHICLE_KIND_NAME: Readonly<Record<VehicleKind, string>> = { nave: "Nave", aterrizador: "Módulo de aterrizaje", sonda: "Sonda", estacion: "Estación" };

/** One line of a vehicle's recipe: so many of a part (its id, the same the hangar and the blueprints use). */
export interface VehicleLine {
  readonly partId: string;
  readonly count: number;
  /** What it does in the vehicle, in Spanish. */
  readonly role: string;
}

export interface VehicleSpecs {
  /** The mass the recipe is compared with; the note says whether it is dry or at launch. */
  readonly massKg?: Sourced<number>;
  /** Length × width × height, m (any order: only used to see if it fits). */
  readonly sizeM?: readonly [number, number, number];
  readonly crew: string;
  readonly gravity: string;
  readonly propulsion: string;
}

export interface VehicleEntry {
  readonly id: string;
  readonly name: string;
  readonly kind: VehicleKind;
  readonly status: VehicleStatus;
  /** Why it has that status, with dates. */
  readonly statusNote: string;
  readonly programme: string;
  /** Launch date (flown) or target date (in development). */
  readonly launch: string;
  readonly specs: VehicleSpecs;
  /** Empty when no breakdown has been published: then it cannot be built. */
  readonly lines: readonly VehicleLine[];
  readonly sources: readonly string[];
  /** What the game would gain and lose with it. */
  readonly gameplay: { readonly gains: string; readonly losses: string };
  /** What it looks like outside and inside, and how it keeps its crew alive (the base for a rebuild). */
  readonly look?: VehicleLook;
  /** The game's craft whose role it could take. */
  readonly replaces?: "nodriza" | "modulo" | "sonda" | "estacion";
  /** One of the mothership options in docs/design/naves-reales.md. */
  readonly mothershipOption?: "A" | "B" | "C";
}

export interface VehicleLook {
  /** Overall shape, dimensions and the big outside parts: arrays, radiators, ports, engines, trusses. */
  readonly exterior: string;
  /** Module by module: volumes, quarters, galley, hygiene, exercise, work, stowage, hatches. */
  readonly interior: string;
  /** Life support as flown or planned: O₂, CO₂, water, waste, food, heat, power, radiation shelter. */
  readonly lifeSupport: string;
  /** Reference pictures (pages with photos or renders). */
  readonly images: readonly string[];
}

/** What the station knows: parts in the hangar and the blueprint for each part (with why it is locked). */
export interface CatalogueInventory {
  count(partId: string): number;
  blueprint(partId: string): { readonly id: string; readonly locked?: string } | undefined;
}

export interface LineStatus {
  readonly line: VehicleLine;
  readonly have: number;
  readonly missing: number;
  /** `sin-plano`: the station has no blueprint for it; `bloqueado`: it has one but lacks its machine. */
  readonly blueprint: "sin-plano" | "bloqueado" | "disponible";
  readonly blueprintId?: string;
  readonly locked?: string;
}

export function lineStatus(entry: VehicleEntry, inv: CatalogueInventory): LineStatus[] {
  return entry.lines.map((line) => {
    const have = inv.count(line.partId);
    const bp = inv.blueprint(line.partId);
    const base = { line, have, missing: Math.max(0, line.count - have) };
    if (!bp) return { ...base, blueprint: "sin-plano" as const };
    return bp.locked ? { ...base, blueprint: "bloqueado" as const, blueprintId: bp.id, locked: bp.locked } : { ...base, blueprint: "disponible" as const, blueprintId: bp.id };
  });
}

/** The lines that still lack parts in the hangar. */
export const missingParts = (entry: VehicleEntry, inv: CatalogueInventory): LineStatus[] => lineStatus(entry, inv).filter((l) => l.missing > 0);

/** Every part is in the hangar (and there is a recipe at all). */
export const canBuild = (entry: VehicleEntry, inv: CatalogueInventory): boolean => entry.lines.length > 0 && missingParts(entry, inv).length === 0;

/** Mass from the components, which parts have no known mass, and how much of the real mass the recipe covers. */
export function componentMass(entry: VehicleEntry, massOf: (partId: string) => number | undefined): { kg: number; unknown: string[]; coverage?: number } {
  let kg = 0;
  const unknown: string[] = [];
  for (const l of entry.lines) {
    const m = massOf(l.partId);
    if (m === undefined) unknown.push(l.partId);
    else kg += m * l.count;
  }
  const real = entry.specs.massKg?.value;
  return { kg, unknown, ...(real ? { coverage: kg / real } : {}) };
}

/** Where it is put together: in the hangar if its box fits in some orientation, otherwise in the dry dock. */
export function assemblySite(sizeM: readonly [number, number, number] | undefined, hangar: { x: number; y: number; z: number }): "hangar" | "dique" {
  if (!sizeM) return "dique";
  const a = [...sizeM].sort((p, q) => q - p);
  const b = [hangar.x, hangar.y, hangar.z].sort((p, q) => q - p);
  return a.every((v, i) => v <= b[i]!) ? "hangar" : "dique";
}

const CRAFT_KIND: Readonly<Record<VehicleKind, CraftSpec["kind"]>> = { nave: "nave", aterrizador: "aterrizador", sonda: "sonda", estacion: "estacion" };

/** Use the parts in the hangar to put the vehicle together; it stays in the hangar (or the dock). */
export function assemble(entry: VehicleEntry, hangar: Hangar, inv: CatalogueInventory, massOf: (partId: string) => number | undefined): Craft {
  const short = missingParts(entry, inv);
  if (!entry.lines.length) throw new Error(`${entry.id}: no recipe`);
  if (short.length) throw new Error(`${entry.id}: missing ${short.map((l) => `${l.missing} × ${l.line.partId}`).join(", ")}`);
  for (const l of entry.lines) for (let i = 0; i < l.count; i++) hangar.take(l.partId);
  return hangar.addCraft({ id: entry.id, name: entry.name, kind: CRAFT_KIND[entry.kind], massKg: Math.round(componentMass(entry, massOf).kg), note: `Montada con las piezas del catálogo (${STATUS_NAME[entry.status].toLowerCase()})` });
}

/**
 * A component the ship catalogue did not have: a real engine, hull or body taken from the vehicle's
 * own data. When a source gives no breakdown, the «cuerpo» is what is left of the real mass once the
 * catalogue's parts are taken away (its note says so).
 */
export interface CatalogueComponent {
  readonly id: string;
  readonly name: string;
  readonly kind: "motor" | "habitat" | "estructura" | "energia" | "electronica";
  readonly massKg: Sourced<number>;
  readonly status: VehicleStatus;
  readonly sources: readonly string[];
}
