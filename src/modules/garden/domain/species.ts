import type { Sourced } from "@core/units";

export type CatToxicity = "toxic" | "non-toxic" | "unknown";

/** What the plant gives, which also sets how it is drawn. A tree grows in a planter on the farm deck. */
export type PlantForm = "hoja" | "fruto" | "raiz" | "grano" | "hierba" | "arbol";

/** Measured edible harvest of a crop: fresh grams per m² over the whole crop (all its harvests). */
export interface EdibleYield {
  readonly gPerM2: number;
  /** Grams in one larder portion of this crop (a USDA serving or similar). */
  readonly portionG: number;
}

/** A crop that can grow on board. Growth figures come from real spaceflight or controlled-environment experiments. */
export interface PlantSpecies {
  readonly id: string;
  readonly form: PlantForm;
  /** Leaf colour for the 3D model. */
  readonly color: number;
  /** Colour of the fruit, when it shows (strawberries, figs…). */
  readonly fruitColor?: number;
  /** Grown for the cats to chew, not for the larder: never harvested. */
  readonly forCats?: boolean;
  readonly name: string;
  readonly cultivar: string;
  /** Days after planting at which a harvest is possible, in order. */
  readonly harvestDays: Sourced<readonly number[]>;
  /** Flowers must be agitated (shaken) before fruit can set. */
  readonly needsShaking: Sourced<boolean>;
  readonly toxicToCats: Sourced<CatToxicity>;
  /**
   * Real yield, when known: harvests then give that food split over the harvest days. Without it
   * a harvest gives the game's fixed portions per pot-sized cell (see Plant.harvest).
   */
  readonly edibleYield?: Sourced<EdibleYield>;
  /** Ground area one plant takes, m² (trees in planters). */
  readonly areaPerPlantM2?: Sourced<number>;
}
