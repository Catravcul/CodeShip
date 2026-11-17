import { normalizeStep, type StepAct, type StepAction } from "@modules/chores/domain/step-visual";
import { foodTintOf } from "./kitchen-visuals";

/**
 * Visuals of an ISS-type meal (docs/pendientes.md, «Cocina real»; reglas.md §4.2): no pans, no hob and no fridge
 * in a real galley. Everything happens with the food package at the galley itself: out of the day's locker, water
 * injected through the needle of the potable water dispenser, kneaded, left to rehydrate or in the food warmer, cut
 * open with scissors and eaten from it with the spoon, strapped to the leg with its tray.
 * Sources: NASA, «Food in Space» (https://www.nasa.gov/humans-in-space/food-in-space/); «Space food»
 * (https://en.wikipedia.org/wiki/Space_food).
 */
const RULES: readonly (readonly [RegExp, StepAction, Partial<StepAct>?])[] = [
  [/\bsaca\b|\btoma\b/, "tomar"],
  [/aguja|inyecta/, "verter", { tint: "agua" }],
  [/calentador|calient/, "calentar", { heat: true }],
  [/amasa/, "amasar"],
  [/espera|rehidrat/, "reposar"],
  [/tijeras|\bcorta\b|\babre\b/, "cortar"],
  [/bandeja|correa|sujeta/, "tomar", { vessel: "bandeja" }],
  [/unta|enrolla|\bcome\b|\bbebe\b/, "emplatar"],
];

/** One visual per step, all at the galley (`objetivo`), on the food package (`bolsa`). */
export function spaceGalleyVisuals(steps: readonly string[], ingredients: readonly string[] = []): StepAct[] {
  let food = ingredients.map((id) => foodTintOf(id.replace(/-/g, " "))).find((f) => f) ?? "generico";
  return steps.map((raw) => {
    const s = normalizeStep(raw);
    food = foodTintOf(s) ?? food;
    const rule = RULES.find(([r]) => r.test(s));
    const action = rule?.[1] ?? "gesto";
    return { action, place: "objetivo", tint: food, vessel: "bolsa", ...(rule?.[2] ?? {}) };
  });
}
