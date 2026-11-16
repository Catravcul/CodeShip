import type { Recipe } from "./recipes";

/**
 * Real-ship food (docs/pendientes.md, «Cocina real»): with the switch REAL_ONLY there is no farm and
 * no coop aboard, so the galley does what the ISS galley does: rehydrate freeze-dried packages with
 * the hot-water dispenser, heat retort (thermostabilised) pouches in the food warmer, and wrap it in
 * tortillas, which do not crumb in microgravity. Portions use the USDA foods of nutrition.ts.
 */
const SPACE_FOOD = "https://en.wikipedia.org/wiki/Space_food";
const NASA_FOOD = "https://www.nasa.gov/humans-in-space/food-in-space/";

export const ISS_FOOD: readonly Recipe[] = [
  {
    id: "iss-avena",
    name: "Avena rehidratada con crema de cacahuete",
    ingredients: { "envase-rehidratable": 1 },
    portions: 1,
    perPortionG: { avena: 80, "crema-cacahuete": 16 },
    meal: "desayuno",
    steps: {
      source: SPACE_FOOD,
      note: `Rehidratar con el dispensador de agua caliente de la cocina, como en la ISS (${NASA_FOOD})`,
      value: [
        "saca el envase de avena del cajón de su día",
        "conecta la aguja del dispensador al tapón del envase",
        "inyecta agua {caliente|fría|ninguna}",
        "amasa el envase para que el agua llegue a todo",
        "espera a que se rehidrate",
        "corta la boca del envase con las tijeras",
        "come con la cuchara: la avena húmeda se queda pegada a ella",
      ],
    },
  },
  {
    id: "iss-frijoles",
    name: "Frijoles termoestabilizados en tortilla",
    ingredients: { "bolsa-termoestabilizada": 1, "tortilla-iss": 1 },
    portions: 1,
    perPortionG: { frijol: 200, "tortilla-maiz": 50, aceite: 5 },
    meal: "principal",
    steps: {
      source: SPACE_FOOD,
      note: "Bolsa de retorta calentada en el calentador de la cocina; tortilla en vez de pan porque no suelta migas",
      value: [
        "saca la bolsa de frijoles y una tortilla",
        "mete la bolsa en el {calentador|congelador|dispensador de agua}",
        "espera a que se caliente",
        "sujeta la bandeja a la pierna con su correa",
        "abre la bolsa con las tijeras",
        "unta los frijoles en la {tortilla|rebanada de pan|galleta}: no suelta migas",
        "enrolla y come",
      ],
    },
  },
  {
    id: "iss-sopa-lenteja",
    name: "Sopa de lenteja rehidratada con tortilla",
    ingredients: { "envase-rehidratable": 1, "tortilla-iss": 1 },
    portions: 1,
    perPortionG: { lenteja: 70, zanahoria: 40, cebolla: 30, aceite: 10, "tortilla-maiz": 50 },
    meal: "principal",
    steps: {
      source: SPACE_FOOD,
      note: "Las sopas rusas de la ISS se rehidratan y se comen en su envase",
      value: [
        "saca el envase de sopa de lenteja",
        "conecta la aguja del dispensador al tapón",
        "inyecta agua caliente",
        "amasa y espera a que se rehidrate",
        "corta una esquina y bebe el caldo primero",
        "come el resto con la cuchara y la tortilla",
      ],
    },
  },
];

/**
 * What the real ship's larder holds on day 1 (game values: about two weeks of meals for one, like a
 * cargo resupply would bring). The ISS menu has more than 300 dishes (Space food); we keep three.
 */
export const ISS_LAUNCH_STOCK: Readonly<Record<string, number>> = {
  "envase-rehidratable": 30,
  "bolsa-termoestabilizada": 20,
  "tortilla-iss": 30,
};
