import { KG_PER_IMPORTED_KIT } from "@modules/station/data/blueprints";

/** What the Sanctuary can send: the station's imported materials, and how much one unit weighs. */
export interface ImportGood {
  readonly id: string;
  /** Units added per step in the order card. */
  readonly step: number;
  /** kg per unit (kits weigh `KG_PER_IMPORTED_KIT`; the rest are ordered in kg). */
  readonly kgPerUnit: number;
}

export const IMPORT_GOODS: readonly ImportGood[] = [
  { id: "kit", step: 1, kgPerUnit: KG_PER_IMPORTED_KIT },
  { id: "xenon", step: 10, kgPerUnit: 1 },
  { id: "helio", step: 1, kgPerUnit: 1 },
  { id: "mmh", step: 10, kgPerUnit: 1 },
  { id: "lmp-103s", step: 10, kgPerUnit: 1 },
  { id: "hidracina", step: 10, kgPerUnit: 1 },
  { id: "nto", step: 10, kgPerUnit: 1 },
];

export const importGood = (id: string): ImportGood | undefined => IMPORT_GOODS.find((g) => g.id === id);
