/** Energy and macronutrients. Per 100 g in a food table, or per portion of a dish. */
export interface Nutrients {
  readonly kcal: number;
  readonly proteinG: number;
  readonly fatG: number;
  readonly carbsG: number;
  readonly fiberG: number;
}

export const ZERO_NUTRIENTS: Nutrients = { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, fiberG: 0 };

/** Nutrients of a mix given in grams per food, from a table per 100 g. Unknown foods throw. */
export function nutrientsOf(grams: Readonly<Record<string, number>>, per100g: (food: string) => Nutrients | undefined): Nutrients {
  return Object.entries(grams).reduce<Nutrients>((sum, [food, g]) => {
    const n = per100g(food);
    if (!n) throw new Error(`No nutrient data for ${food}`);
    const k = g / 100;
    return {
      kcal: sum.kcal + n.kcal * k,
      proteinG: sum.proteinG + n.proteinG * k,
      fatG: sum.fatG + n.fatG * k,
      carbsG: sum.carbsG + n.carbsG * k,
      fiberG: sum.fiberG + n.fiberG * k,
    };
  }, ZERO_NUTRIENTS);
}

/**
 * Picks distinct dishes, most energy first, until a day's energy is reached. Returns the menu, or
 * the best it can do when the dishes on offer fall short.
 */
export function dayMenu<T>(dishes: readonly T[], kcalOf: (d: T) => number, targetKcal: number, maxDishes = 5): { dishes: T[]; kcal: number } {
  const sorted = [...dishes].sort((a, b) => kcalOf(b) - kcalOf(a));
  const menu: T[] = [];
  let kcal = 0;
  for (const d of sorted) {
    if (kcal >= targetKcal || menu.length >= maxDishes) break;
    menu.push(d);
    kcal += kcalOf(d);
  }
  return { dishes: menu, kcal };
}
