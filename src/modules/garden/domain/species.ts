import type { Sourced } from "@core/units";

export type CatToxicity = "toxic" | "non-toxic" | "unknown";

/** A crop that can grow on board. Growth figures come from real spaceflight experiments. */
/** What the plant gives, which also sets how it is drawn. */
export type PlantForm = "hoja" | "fruto" | "raiz" | "grano" | "hierba";

export interface PlantSpecies {
  readonly id: string;
  readonly form: PlantForm;
  /** Leaf colour for the 3D model. */
  readonly color: number;
  /** Grown for the cats to chew, not for the larder: never harvested. */
  readonly forCats?: boolean;
  readonly name: string;
  readonly cultivar: string;
  /** Days after planting at which a harvest is possible, in order. */
  readonly harvestDays: Sourced<readonly number[]>;
  /** Flowers must be agitated (shaken) before fruit can set. */
  readonly needsShaking: Sourced<boolean>;
  readonly toxicToCats: Sourced<CatToxicity>;
}
