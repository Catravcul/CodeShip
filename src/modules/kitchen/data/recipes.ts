import type { Sourced } from "@core/units";

/**
 * A dish cooked on board. Every step is one code challenge. A step may carry a value to fill in,
 * written `{right|wrong|wrong}`, e.g. "cocina hasta {71|50|100} °C".
 */
export interface Recipe {
  readonly id: string;
  readonly name: string;
  /** Larder items it uses (see kitchen/data/items.ts for units). */
  readonly ingredients: Readonly<Record<string, number>>;
  readonly steps: Sourced<readonly string[]>;
  readonly portions: number;
}

const CS_RECIPES = "https://github.com/videnacry/cold-sanctuary/blob/master/Assets/Scripts/Kitchen/CookingRecipe.cs";
/** USDA FSIS safe minimum internal temperatures: egg dishes and ground meat 160 °F (71 °C). */
const USDA = "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart";

export const RECIPES: readonly Recipe[] = [
  {
    id: "huevos-revueltos",
    name: "Huevos revueltos",
    ingredients: { huevo: 2 },
    portions: 1,
    steps: {
      source: CS_RECIPES,
      note: `Cold Sanctuary 'Huevos revueltos'. Safe temperature from USDA FSIS: ${USDA}`,
      value: ["ve a la nevera", "toma los huevos", "calienta la plancha", "revuelve los huevos", "cocina hasta {71|50|100} °C", "especia con sal y pimienta", "emplata"],
    },
  },
  {
    id: "ensalada",
    name: "Ensalada de la nave",
    ingredients: { "lechuga-outredgeous": 1, "tomate-red-robin": 1, "rabano-cherry-belle": 1 },
    portions: 2,
    steps: {
      source: CS_RECIPES,
      note: "Cold Sanctuary 'Ensalada' with the ship's lettuce, tomato and radish.",
      value: ["toma lechuga, tomate, rábano, limón, sal y aceite", "lava los vegetales", "corta los vegetales", "mezcla todo en el bol", "aliña con sal, limón y aceite", "emplata"],
    },
  },
  {
    id: "tortilla-papa",
    name: "Tortilla de papa",
    ingredients: { "papa-norland": 2, huevo: 3 },
    portions: 2,
    steps: {
      source: "https://es.wikipedia.org/wiki/Tortilla_de_patatas",
      note: `Traditional recipe. Safe temperature from USDA FSIS: ${USDA}`,
      value: ["pela las papas", "córtalas en láminas finas", "fríelas a fuego medio hasta que estén tiernas", "bate los huevos con sal", "mezcla las papas con el huevo", "cuaja un lado en la sartén", "dale la vuelta con un plato", "cuaja el otro lado hasta {71|40|150} °C"],
    },
  },
  {
    id: "chapati",
    name: "Chapati (pan plano de trigo)",
    ingredients: { harina: 1 },
    portions: 2,
    steps: {
      source: "https://es.wikipedia.org/wiki/Chapati",
      value: ["mezcla la harina integral con agua y sal", "amasa hasta que la masa esté lisa", "deja reposar la masa", "divídela en bolitas", "estira cada bolita en un disco", "cuécelo en la plancha caliente por los dos lados", "sirve caliente"],
    },
  },
  {
    id: "tofu-chile",
    name: "Tofu salteado con chile",
    ingredients: { tofu: 1, "chile-espanola": 1 },
    portions: 2,
    steps: {
      source: CS_RECIPES,
      note: "After Cold Sanctuary 'Congee con tofu': tofu sautéed with ginger, here with the ship's chile.",
      value: ["corta el tofu en dados", "sécalo con un paño", "saltea el tofu hasta dorarlo", "añade el chile picado", "sazona con sal y soja", "sirve"],
    },
  },
  {
    id: "carne-papas",
    name: "Carne cultivada con papas",
    ingredients: { "carne-cultivada": 250, "papa-norland": 1 },
    portions: 2,
    steps: {
      source: USDA,
      note: "Formed cultured meat is handled like ground meat: 160 °F (71 °C).",
      value: ["saca la carne de la cámara fría", "sécala y sálala", "cuece las papas", "calienta la plancha", "cocina la carne hasta {71|40|200} °C", "deja reposar la carne", "emplata con las papas"],
    },
  },
  {
    id: "milpa",
    name: "Milpa con chile",
    ingredients: { "chile-espanola": 1 },
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
    ingredients: {},
    portions: 2,
    steps: {
      source: CS_RECIPES,
      note: "Only dry stores: always available.",
      value: ["toma lenteja roja, zanahoria, cebolla, comino y limón", "sofríe cebolla y zanahoria", "añade la lenteja y agua", "cuece hasta deshacer", "tritura la sopa", "sazona con comino", "sirve con limón"],
    },
  },
];
