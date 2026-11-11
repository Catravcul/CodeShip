import type { Sourced } from "@core/units";

export type CatToxicity = "toxic" | "non-toxic" | "unknown";

/** A crop that can grow on board. Growth figures come from real spaceflight experiments. */
export interface PlantSpecies {
  readonly id: string;
  readonly name: string;
  readonly cultivar: string;
  /** Days after planting at which a harvest is possible, in order. */
  readonly harvestDays: Sourced<readonly number[]>;
  /** Flowers must be agitated (shaken) before fruit can set. */
  readonly needsShaking: Sourced<boolean>;
  readonly toxicToCats: Sourced<CatToxicity>;
}
