import type { Sourced } from "@core/units";
import { scaleAmounts, type Amounts, type MaterialStock } from "./materials";
import type { EquipmentSpec, ModuleSpec } from "./outfit";

/**
 * Station machines. Each one works through its own queue, one job at a time. The propellant plant
 * (`planta`) makes propellants; the refuelling line (`repostaje`) moves them into a docked craft.
 * The welder (`soldadora`) and the composites cell (`compuestos`) exist once their equipment is
 * built; `montaje` is the outside assembly (the arm that berths a new module).
 */
export type MachineId = "refineria" | "fundicion" | "impresora" | "planta" | "repostaje" | "soldadora" | "compuestos" | "montaje";

export const MACHINE_NAME: Readonly<Record<MachineId, string>> = {
  refineria: "Refinería",
  fundicion: "Fundición",
  impresora: "Impresora 3D de metal",
  planta: "Planta de propelente",
  repostaje: "Línea de repostaje",
  soldadora: "Soldadora",
  compuestos: "Celda de compuestos",
  montaje: "Montaje exterior",
};

/** A ship or probe kept in the hangar. */
export interface CraftSpec {
  readonly id: string;
  readonly name: string;
  /** `remolcador` and `lanzador`: the station's own import sources (docs/design/importacion.md). */
  readonly kind: "nave" | "sonda" | "remolcador" | "lanzador";
  readonly massKg: number;
  readonly note?: string;
}

/**
 * What a blueprint makes: a part for the ship bay (or for the station itself), a whole craft for the
 * hangar, a new module for the station's structure, or a piece of equipment inside a module.
 */
export type Product =
  | { readonly kind: "part"; readonly partId: string }
  | { readonly kind: "craft"; readonly craft: CraftSpec }
  | { readonly kind: "module"; readonly module: ModuleSpec }
  | { readonly kind: "equipment"; readonly equipment: EquipmentSpec };

/** The three kinds of blueprint the Planos tab groups: station modules, equipment, components. */
export type BlueprintKind = "modulo" | "equipo" | "componente";
export const blueprintKind = (bp: Blueprint): BlueprintKind => (bp.product.kind === "module" ? "modulo" : bp.product.kind === "equipment" ? "equipo" : "componente");

/** How to make one thing at the station: what goes in, which machine, how and how long. */
export interface Blueprint {
  readonly id: string;
  readonly name: string;
  readonly product: Product;
  readonly machine: MachineId;
  /** Mass of the finished item, kg. */
  readonly massKg: number;
  /** Materials it consumes (kg, kits in units), scrap included. */
  readonly inputs: Amounts;
  /** Fabrication time, game hours. */
  readonly hours: number;
  /** The real-world process it follows, with its source. */
  readonly process: Sourced<string>;
  /** Steps in order (the last challenge orders them). */
  readonly steps: readonly string[];
  /** Equipment that must be installed in the station before this can be made (its id). */
  readonly requires?: string;
}

/** A refinery batch: raw rock in, refined materials out. */
export interface RefineProcess {
  readonly id: string;
  readonly name: string;
  readonly machine: MachineId;
  /** Per full batch. */
  readonly inputs: Amounts;
  readonly outputs: Amounts;
  /** Game hours for a full batch. */
  readonly hours: number;
  readonly process: Sourced<string>;
  /** Electric energy of a full batch, kWh, where a source gives it (absent when none does). */
  readonly energyKwh?: Sourced<number>;
  /** Steps in order; `{right|wrong|wrong}` marks a real value to fill in. */
  readonly steps: Sourced<readonly string[]>;
  /** Equipment that must be installed for this process (its id). */
  readonly requires?: string;
}

/** Game tuning of the station (not real data). */
export const STATION_TUNING = {
  /** Share of the feedstock that ends up in the part; the rest is swarf, supports and rejects. */
  fabricationYield: 0.8,
  /** Smallest share of a batch worth running in the refinery. */
  minBatch: 0.1,
  /** Game hours per real second: the same clock as life on board (a day every 40 s). */
  hoursPerSecond: 24 / 40,
} as const;

/** Share of a full batch the stock allows, 0..1 (limited by the scarcest input). */
export function batchScale(p: RefineProcess, stock: MaterialStock): number {
  let k = 1;
  for (const [id, n] of Object.entries(p.inputs)) k = Math.min(k, n > 0 ? stock.amount(id) / n : 1);
  return Math.max(0, k);
}

export const canRefine = (p: RefineProcess, stock: MaterialStock): boolean => batchScale(p, stock) >= STATION_TUNING.minBatch;

/** Inputs and outputs of a refinery run at a given share of the batch. */
export const refineRun = (p: RefineProcess, k: number) => ({ inputs: scaleAmounts(p.inputs, k), outputs: scaleAmounts(p.outputs, k), hours: p.hours * k });
