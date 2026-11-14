import type { Sourced } from "@core/units";
import { nutrientsOf, type Nutrients } from "../domain/nutrition";
import type { Recipe } from "./recipes";

/** USDA FoodData Central, SR Legacy. Each note gives the exact food description searched there. */
const FDC = (query: string) => `https://fdc.nal.usda.gov/food-search?query=${encodeURIComponent(query)}&type=SR%20Legacy`;
const food = (description: string, kcal: number, proteinG: number, fatG: number, carbsG: number, fiberG: number, note?: string): Sourced<Nutrients> => ({
  value: { kcal, proteinG, fatG, carbsG, fiberG },
  source: FDC(description),
  note: note ? `${description}. ${note}` : description,
});

/** Nutrients per 100 g of every food a dish on board can use: harvests, ingredients and dry stores. */
export const FOODS: Readonly<Record<string, Sourced<Nutrients>>> = {
  // From the garden and the farm deck.
  lechuga: food("Lettuce, cos or romaine, raw", 17, 1.23, 0.3, 3.29, 2.1),
  tomate: food("Tomatoes, red, ripe, raw, year round average", 18, 0.88, 0.2, 3.89, 1.2),
  rabano: food("Radishes, raw", 16, 0.68, 0.1, 3.4, 1.6),
  chile: food("Peppers, hot chili, green, raw", 40, 2.0, 0.2, 9.46, 1.5),
  papa: food("Potatoes, boiled, cooked in skin, flesh, without salt", 87, 1.87, 0.1, 20.13, 1.8),
  harina: food("Wheat flour, whole-grain", 340, 13.21, 2.5, 71.97, 10.7),
  tofu: food("Tofu, raw, regular, prepared with calcium sulfate", 76, 8.08, 4.78, 1.88, 0.3, "The ship's tofu is set with nigari; close enough."),
  cacahuete: {
    value: { kcal: 567, proteinG: 25.8, fatG: 49.24, carbsG: 16.13, fiberG: 8.5 },
    source: "https://fdc.nal.usda.gov/food-details/172430/nutrients",
    note: "Peanuts, all types, raw (FDC 172430).",
  },
  "cacahuete-tostado": food("Peanuts, all types, dry-roasted, without salt", 585, 23.68, 49.66, 21.51, 8.0),
  "crema-cacahuete": food("Peanut butter, smooth style, without salt", 588, 25.09, 50.39, 19.56, 6.0),
  fresa: food("Strawberries, raw", 32, 0.67, 0.3, 7.68, 2.0),
  higo: food("Figs, raw", 74, 0.75, 0.3, 19.18, 2.9),
  // From the coop and the bioreactor.
  huevo: food("Egg, whole, raw, fresh", 143, 12.56, 9.51, 0.72, 0),
  carne: food("Beef, ground, 85% lean meat / 15% fat, patty, cooked, broiled", 250, 25.93, 15.41, 0, 0, "Stand-in for cultured meat, which has no USDA entry."),
  // Dry stores the ship left with.
  lenteja: food("Lentils, raw", 352, 24.63, 1.06, 63.35, 10.7),
  avena: food("Cereals, oats, regular and quick, not fortified, dry", 379, 13.15, 6.52, 67.7, 10.1),
  frijol: food("Beans, black, mature seeds, cooked, boiled, without salt", 132, 8.86, 0.54, 23.71, 8.7),
  "tortilla-maiz": food("Tortillas, ready-to-bake or -fry, corn", 218, 5.7, 2.85, 44.64, 6.3),
  amaranto: food("Amaranth grain, uncooked", 371, 13.56, 7.02, 65.25, 6.7),
  zanahoria: food("Carrots, raw", 41, 0.93, 0.24, 9.58, 2.8),
  cebolla: food("Onions, raw", 40, 1.1, 0.1, 9.34, 1.7),
  aceite: food("Oil, olive, salad or cooking", 884, 0, 100, 0, 0),
};

/** Nutrients in one portion of a dish. */
export const portionNutrients = (r: Recipe): Nutrients => nutrientsOf(r.perPortionG, (f) => FOODS[f]?.value);
