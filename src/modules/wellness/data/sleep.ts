import type { StepAct } from "@modules/chores/domain/step-visual";

/**
 * Going to sleep in a crew quarter (docs/design/compartimentos.md, «Dormir»), as on the ISS: the quarter's own
 * fan has to be blowing (with no air flow the breathed-out CO₂ gathers round the head in 0 g), the alarm on its
 * laptop, into the bag strapped to the wall, zip up to the chest, light off. Each step is one challenge
 * acted out in the quarter (`SLEEP_ACTS`).
 */
export const SLEEP_SOURCES = {
  quarters: "NASA, ISS Crew Quarters (Broyan, Borrego y Bahr, 2008): ventilación propia del camarote para que el CO₂ no se acumule, luz regulable y portátil: https://ntrs.nasa.gov/citations/20080013462",
  sleep: "NASA, dormir en el espacio: saco sujeto a la pared, cremallera, luz apagada; despertar hacia las 06:00 GMT: https://www.nasa.gov/image-article/sleeping-space/",
} as const;

/** The steps, in order; `{right|wrong|wrong}` asks for a value (the wake-up time, GMT, as on the ISS). */
export const SLEEP_STEPS: readonly string[] = [
  "comprueba que el ventilador del camarote sopla",
  "pon el despertador a las {06:00|03:00|13:00} GMT",
  "métete en el saco de dormir sujeto a la pared",
  "sube la cremallera del saco hasta el pecho",
  "apaga la luz del camarote",
  "cierra los ojos y duerme",
];

/** Plausible wrong steps (one is the real danger: switching the fan off to sleep in silence). */
export const SLEEP_WRONG: readonly string[] = ["apaga el ventilador para no oír ruido", "deja el saco suelto flotando por el camarote", "enciende la luz al máximo"];

/** What each solved step shows in the crew quarter (step-show.ts plays these verbs; `vessel: "saco"`: by the bag, facing out). */
export const SLEEP_ACTS: readonly (readonly StepAct[])[] = [
  [{ action: "revisar", place: "objetivo", vessel: "saco" }],
  [{ action: "programar", place: "objetivo", vessel: "saco" }],
  [{ action: "saco", place: "objetivo" }],
  [{ action: "saco", place: "objetivo", vessel: "cremallera" }],
  [{ action: "luz", place: "objetivo", vessel: "saco" }],
  [{ action: "dormir", place: "objetivo", vessel: "saco" }],
];
