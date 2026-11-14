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
  /**
   * What one portion holds, grams per food of kitchen/data/nutrition.ts (dry stores included).
   * Game values: a plate sized like a home serving; the nutrients per gram are USDA's.
   */
  readonly perPortionG: Readonly<Record<string, number>>;
  /** When it is eaten, to build a varied day. */
  readonly meal: "desayuno" | "principal" | "acompañante" | "postre" | "tentempié";
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
    perPortionG: { huevo: 100, aceite: 5 },
    meal: "desayuno",
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
    perPortionG: { lechuga: 50, tomate: 60, rabano: 30, aceite: 10 },
    meal: "acompañante",
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
    perPortionG: { papa: 200, huevo: 75, aceite: 15 },
    meal: "principal",
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
    perPortionG: { harina: 60, aceite: 3 },
    meal: "acompañante",
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
    perPortionG: { tofu: 150, chile: 30, aceite: 10 },
    meal: "principal",
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
    perPortionG: { carne: 125, papa: 250, aceite: 10 },
    meal: "principal",
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
    perPortionG: { frijol: 150, "tortilla-maiz": 100, amaranto: 20, chile: 20 },
    meal: "principal",
    steps: {
      source: CS_RECIPES,
      note: "Cold Sanctuary 'Milpa mexicana'; the chile comes from the on-board plant.",
      value: ["toma frijol, maíz nixtamalizado, amaranto y chile", "prepara la masa de maíz", "cuece los frijoles", "tuesta el amaranto", "haz la salsa de chile", "arma el plato de milpa"],
    },
  },
  {
    id: "cacahuetes-tostados",
    name: "Cacahuetes tostados",
    ingredients: { "cacahuete-georgia-red": 2 },
    portions: 2,
    perPortionG: { "cacahuete-tostado": 50 },
    meal: "tentempié",
    steps: {
      source: "https://en.wikipedia.org/wiki/Peanut_butter",
      note: "Peanuts are oven-roasted at 320 °F (160 °C) for about 40–60 min (peanut butter production).",
      value: ["saca los cacahuetes de la despensa", "pélalos", "extiéndelos en la bandeja", "tuéstalos a {160|60|300} °C", "remueve a media cocción", "déjalos enfriar", "sirve con una pizca de sal"],
    },
  },
  {
    id: "gachas-avena",
    name: "Gachas de avena con cacahuete",
    ingredients: { "cacahuete-georgia-red": 1 },
    portions: 1,
    perPortionG: { avena: 80, "cacahuete-tostado": 30 },
    meal: "desayuno",
    steps: {
      source: "https://en.wikipedia.org/wiki/Porridge",
      note: "Rolled oats from the dry stores simmered in water; topped with the ship's peanuts.",
      value: ["mide la avena de la despensa seca", "hiérvela en agua", "remueve hasta que espese", "pica los cacahuetes", "sirve las gachas en el bol", "cúbrelas con el cacahuete"],
    },
  },
  {
    id: "llapingachos",
    name: "Llapingachos con salsa de maní",
    ingredients: { "papa-norland": 2, huevo: 2, "cacahuete-georgia-red": 1 },
    portions: 2,
    perPortionG: { papa: 250, huevo: 50, cacahuete: 30, cebolla: 20, aceite: 15 },
    meal: "principal",
    steps: {
      source: "https://en.wikipedia.org/wiki/Llapingacho",
      note: "Ecuadorian potato patties seasoned with onion, cumin and achiote, cooked on a griddle and served with peanut sauce and a fried egg (no cheese on board).",
      value: ["cuece las papas", "aplástalas con cebolla, comino y achiote", "forma las tortitas", "dóralas en la plancha", "muele el maní con cebolla para la salsa", "fríe los huevos hasta {71|40|150} °C", "sirve con la salsa de maní"],
    },
  },
  {
    id: "bol-fruta",
    name: "Bol de fruta de la cubierta",
    ingredients: { "fresa-seascape": 1, higo: 1, "cacahuete-georgia-red": 1 },
    portions: 2,
    perPortionG: { fresa: 75, higo: 50, "cacahuete-tostado": 25 },
    meal: "tentempié",
    steps: {
      source: "https://en.wikipedia.org/wiki/Fruit_salad",
      value: ["recoge fresas e higos maduros", "lávalos con cuidado", "quita el rabito a las fresas", "corta los higos en cuartos", "mezcla la fruta en el bol", "esparce cacahuete picado", "sirve frío"],
    },
  },
  {
    id: "desayuno-nave",
    name: "Desayuno completo: avena, fresas y crema de cacahuete",
    ingredients: { "fresa-seascape": 1, "crema-cacahuete": 1 },
    portions: 1,
    perPortionG: { avena: 80, fresa: 150, "crema-cacahuete": 32 },
    meal: "desayuno",
    steps: {
      source: "https://en.wikipedia.org/wiki/Porridge",
      note: "Cereal, fruit and a protein-and-fat spread: a balanced breakfast. 32 g = 2 tablespoons of peanut butter (USDA serving).",
      value: ["hierve la avena en agua", "remueve hasta que espese", "lava y corta las fresas", "sirve las gachas", "añade dos cucharadas de crema de cacahuete", "cubre con las fresas"],
    },
  },
  {
    id: "higos-asados",
    name: "Higos asados con crema de cacahuete",
    ingredients: { higo: 2, "crema-cacahuete": 1 },
    portions: 2,
    perPortionG: { higo: 100, "crema-cacahuete": 16 },
    meal: "postre",
    steps: {
      source: "https://en.wikipedia.org/wiki/Common_fig",
      note: "Fresh figs, halved and roasted; served with the ship's peanut butter.",
      value: ["lava los higos", "córtalos por la mitad", "ponlos en la bandeja con el corte hacia arriba", "ásalos en el horno hasta que se ablanden", "sirve con una cucharada de crema de cacahuete"],
    },
  },
  {
    id: "fresas-chapati",
    name: "Chapati con fresas y crema de cacahuete",
    ingredients: { harina: 1, "fresa-seascape": 1, "crema-cacahuete": 1 },
    portions: 2,
    perPortionG: { harina: 60, aceite: 3, fresa: 75, "crema-cacahuete": 16 },
    meal: "postre",
    steps: {
      source: "https://es.wikipedia.org/wiki/Chapati",
      value: ["amasa harina, agua y sal", "estira los discos", "cuécelos en la plancha caliente", "unta la crema de cacahuete", "corta las fresas en láminas", "enrolla el chapati con las fresas"],
    },
  },
  {
    id: "mercimek",
    name: "Mercimek (sopa turca de lenteja)",
    ingredients: {},
    portions: 2,
    perPortionG: { lenteja: 100, zanahoria: 60, cebolla: 50, aceite: 15 },
    meal: "principal",
    steps: {
      source: CS_RECIPES,
      note: "Only dry stores: always available.",
      value: ["toma lenteja roja, zanahoria, cebolla, comino y limón", "sofríe cebolla y zanahoria", "añade la lenteja y agua", "cuece hasta deshacer", "tritura la sopa", "sazona con comino", "sirve con limón"],
    },
  },
];
