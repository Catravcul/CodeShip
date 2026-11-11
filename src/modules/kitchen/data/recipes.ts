import type { Sourced } from "@core/units";

/** A dish cooked on board: Cold Sanctuary's restaurant recipes, adapted to what grows on the ship. */
export interface Recipe {
  readonly id: string;
  readonly name: string;
  /** Portions of on-board crops it uses (keys are plant species ids). */
  readonly crops: Readonly<Record<string, number>>;
  readonly steps: Sourced<readonly string[]>;
  readonly portions: number;
}

const CS_RECIPES = "https://github.com/videnacry/cold-sanctuary/blob/master/Assets/Scripts/Kitchen/CookingRecipe.cs";

export const RECIPES: readonly Recipe[] = [
  {
    id: "ensalada",
    name: "Ensalada de lechuga",
    crops: { "lechuga-outredgeous": 1 },
    portions: 2,
    steps: {
      source: CS_RECIPES,
      note: "Cold Sanctuary 'Ensalada' with the on-board red romaine instead of tomato.",
      value: ["toma la lechuga, limón, sal, pimienta y aceite", "lava las hojas", "corta las hojas", "mezcla todo en el bol", "aliña con sal, pimienta, limón y aceite", "emplata"],
    },
  },
  {
    id: "milpa",
    name: "Milpa con chile",
    crops: { "chile-espanola": 1 },
    portions: 2,
    steps: {
      source: CS_RECIPES,
      note: "Cold Sanctuary 'Milpa mexicana'; the chile comes from the on-board plant.",
      value: ["toma frijol, maíz nixtamalizado, amaranto y chile", "prepara la masa de maíz", "cuece los frijoles", "tuesta el amaranto", "haz la salsa de chile", "arma el plato de milpa"],
    },
  },
  {
    id: "mercimek",
    name: "Mercimek (sopa turca de lenteja)",
    crops: {},
    portions: 2,
    steps: {
      source: CS_RECIPES,
      note: "Only dry stores: always available.",
      value: ["toma lenteja roja, zanahoria, cebolla, comino y limón", "sofríe cebolla y zanahoria", "añade la lenteja y agua", "cuece hasta deshacer", "tritura la sopa", "sazona con comino", "sirve con limón"],
    },
  },
];
