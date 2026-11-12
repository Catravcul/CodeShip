import type { Sourced } from "@core/units";
import { RER } from "./cat";
import { Companion } from "./companion";

export type DogLifeStage = "cachorro" | "adulto-castrado" | "adulto-entero";

/** Maintenance energy factor × RER for dogs (puppy under 4 months: 3.0). Estimates; individuals vary. */
export const DOG_MER_FACTOR: Sourced<Record<DogLifeStage, number>> = {
  value: { cachorro: 3.0, "adulto-castrado": 1.6, "adulto-entero": 1.8 },
  source: "https://petnutritionalliance.org/wp-content/uploads/2023/03/MER.RER_.PNA_.pdf",
};

/** Chihuahua breed standard: "a well balanced little dog not to exceed 6 pounds" (2.7 kg). */
export const CHIHUAHUA_MAX_KG: Sourced<number> = {
  value: 6 * 0.4536,
  source: "https://www.chihuahuaclubofamerica.org/thechihuahua/breedstandard",
};

/**
 * Unlike cats, dogs use glucose from dietary carbohydrates and digest cooked starches at over 90 %,
 * and many dog foods mix plant and animal proteins: on board they eat cultured meat, eggs or both.
 * A large egg (50 g) gives about 72 kcal (USDA FoodData Central).
 */
export const DOG_DIET: Sourced<{ meatKcalPerG: number; eggKcal: number }> = {
  value: { meatKcalPerG: 1.2, eggKcal: 72 },
  source: "https://www.merckvetmanual.com/management-and-nutrition/nutrition-small-animals/nutritional-requirements-of-small-animals",
  note: "Egg energy from https://fdc.nal.usda.gov/ (egg, whole, raw, large).",
};

/** A dog on board (the first ones are chihuahuas). Time in days. */
export class Dog extends Companion {
  readonly kind = "perro";

  constructor(
    id: string,
    name: string,
    massKg: number,
    readonly lifeStage: DogLifeStage = "adulto-castrado",
    readonly breed = "chihuahua",
  ) {
    super(id, name, massKg);
  }

  get young(): boolean {
    return this.lifeStage === "cachorro";
  }
  get dailyKcal(): number {
    return DOG_MER_FACTOR.value[this.lifeStage] * RER.value(this.massKg);
  }
}
