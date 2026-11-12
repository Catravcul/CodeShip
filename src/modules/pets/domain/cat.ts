import type { Sourced } from "@core/units";
import { Companion, type CompanionContext } from "./companion";

export type LifeStage = "kitten" | "neutered-adult" | "intact-adult";

/** Resting energy requirement, kcal/day: RER = 70 · kg^0.75 (same equation for cats and dogs). */
export const RER: Sourced<(kg: number) => number> = {
  value: (kg) => 70 * kg ** 0.75,
  source: "https://petnutritionalliance.org/wp-content/uploads/2023/03/MER.RER_.PNA_.pdf",
};

/** Maintenance energy factor × RER. Estimates; individuals vary up to 50 %. Kitten uses the middle of 2–3. */
export const MER_FACTOR: Sourced<Record<LifeStage, number>> = {
  value: { kitten: 2.5, "neutered-adult": 1.2, "intact-adult": 1.4 },
  source: "https://petnutritionalliance.org/wp-content/uploads/2023/03/MER.RER_.PNA_.pdf",
};

/**
 * Cats are obligate carnivores: they need nutrients found in animal tissue (taurine, arachidonic acid,
 * preformed vitamin A), so on board they eat cultured meat or stored cat food, never the crops.
 */
export const OBLIGATE_CARNIVORE: Sourced<true> = {
  value: true,
  source: "https://www.merckvetmanual.com/management-and-nutrition/nutrition-small-animals/nutritional-requirements-of-small-animals",
};

/** Energy density used to turn kcal into grams. Raw chicken breast ≈ 120 kcal/100 g (USDA); dry cat food ≈ 3.8 kcal/g (typical label). */
export const FOOD_KCAL_PER_G: Sourced<{ meat: number; kibble: number }> = {
  value: { meat: 1.2, kibble: 3.8 },
  source: "https://fdc.nal.usda.gov/",
  note: "Cultured meat is grown from chicken cells; kibble value is a typical label figure.",
};

export { CAT_TUNING } from "./companion";

export type CatContext = CompanionContext;

/** A cat on board. Time in days. Needs are 0 (empty) .. 1 (fully met). */
export class Cat extends Companion {
  readonly kind = "gato";

  constructor(
    id: string,
    name: string,
    massKg: number,
    readonly lifeStage: LifeStage = "neutered-adult",
  ) {
    super(id, name, massKg);
  }

  get young(): boolean {
    return this.lifeStage === "kitten";
  }
  /** Daily maintenance energy, kcal. */
  get dailyKcal(): number {
    return MER_FACTOR.value[this.lifeStage] * RER.value(this.massKg);
  }
}
