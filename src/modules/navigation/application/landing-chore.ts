import type { ChoiceExercise, CodeBlock, Concept, OrderExercise } from "@modules/mind-duel/domain/exercise";
import type { Chore } from "@modules/chores/domain/chore";
import { LANDING_LIMITS } from "@modules/flight/domain/landing-frame";
import { duration, num } from "./trip-chore";

/** The real numbers of one descent, as the landing challenges show them. */
export interface LandingFacts {
  /** «sonda» (uncrewed probe, screw anchors) or «modulo» (the lander, its legs). */
  readonly craft: "sonda" | "modulo";
  readonly targetId: string;
  readonly targetName: string;
  /** Clearance above the ground now, m. */
  readonly clearanceM: number;
  /** Speed of the ground under the craft (the asteroid's spin), m/s. */
  readonly groundSpeedMs: number;
  /** RCS translation acceleration (up/down axis), m/s². */
  readonly rcsAccelMs2: number;
  /** Planned descent cap, final-descent height and touchdown speed of the program. */
  readonly maxDescentMs: number;
  readonly flareM: number;
  readonly touchdownMs: number;
  /** Game seconds the descent takes. */
  readonly descentS: number;
}

const hash = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};
const lines = (pairs: readonly (readonly [string, string, number?])[]): CodeBlock[] =>
  pairs.map(([pseudo, js, indent], i) => (indent ? { id: String.fromCharCode(97 + i), pseudo, js, indent } : { id: String.fromCharCode(97 + i), pseudo, js }));

function choice(id: string, concept: Concept, skill: ChoiceExercise["skill"], idea: string, question: string, code: readonly CodeBlock[], right: string, wrong: readonly string[]): ChoiceExercise {
  const options = [...new Set(wrong.filter((w) => w !== right))];
  const at = hash(id) % (options.length + 1);
  options.splice(at, 0, right);
  return { kind: "choice", id, concept, skill, idea, question, code, options, correct: at };
}

/** «0,08» with enough decimals for the small speeds of a landing. */
const ms = (v: number) => num(v, v < 0.1 ? 3 : v < 1 ? 2 : 1);

/**
 * Programming a landing (docs/design/aterrizaje.md): a chain of five challenges built from the real
 * numbers of the descent (height, the asteroid's spin under the craft, the RCS acceleration and the
 * contact limits). Solved, the guidance computer flies it: pick the site, null the drift, follow the
 * braking curve, brake for the last metres, anchor. Each wrong answer makes the program less precise
 * (a harder touchdown, off the site, a bounce); too many and it does not load.
 */
export function landingChore(f: LandingFacts): Chore {
  const id = `aterrizaje-${f.craft}-${f.targetId}`;
  const who = f.craft === "sonda" ? "la sonda" : "el módulo";
  const anchors = f.craft === "sonda" ? "disparar las anclas de rosca de las patas" : "anclar las patas";
  const name = f.targetName;
  const lim = LANDING_LIMITS;
  const h = Math.round(f.clearanceM);
  const g = f.groundSpeedMs;

  const sequence: OrderExercise = {
    kind: "order",
    id: `${id}-programa`,
    concept: 1,
    idea: "Primero el sitio, luego bajar despacio",
    blocks: lines([
      [`fijar el sitio: el suelo bajo ${who}, a ${h} m`, `aterrizaje.sitio(debajo(), ${h});`],
      [`girar la panza al suelo (menos de ${num(lim.tiltDeg)}°)`, `actitud.nivelar(${num(lim.tiltDeg)});`],
      [`ir a la velocidad del suelo (${ms(g)} m/s): sin deriva lateral`, `rcs.igualarSuelo(${g.toFixed(3)});`],
      [`bajar como mucho a ${ms(f.maxDescentMs)} m/s frenando con el RCS`, `descenso.perfil(${f.maxDescentMs});`],
      [`a ${num(f.flareM)} m del suelo, bajar a ${ms(f.touchdownMs)} m/s`, `descenso.final(${f.flareM}, ${f.touchdownMs});`],
      [`al tocar, ${anchors} y apagar los propulsores`, "anclas.disparar(); rcs.apagar();"],
      // Distractor: coming down fast all the way bounces off (or breaks the legs).
      [`bajar a ${ms(f.maxDescentMs)} m/s hasta tocar el suelo`, `descenso.hastaTocar(${f.maxDescentMs});`],
    ]),
    solution: ["a", "b", "c", "d", "e", "f"],
  };

  const drift = choice(
    `${id}-deriva`,
    4,
    "completar",
    "El suelo se mueve",
    `${name} gira: bajo ${who} el suelo pasa a ${ms(g)} m/s. ¿Qué velocidad lateral hay que llevar para bajar en vertical sobre el sitio?`,
    lines([
      [`variable vSuelo = ${ms(g)} m/s   // giro de ${name}`, `const vSuelo = ${g.toFixed(3)};`],
      ["variable vLateral = ___", "const vLateral = ___;"],
      ["si |vLateral − vSuelo| > 0,01 entonces rcs.corregir()", "if (Math.abs(vLateral - vSuelo) > 0.01) rcs.corregir();"],
    ]),
    `vSuelo: ${ms(g)} m/s, la misma que el suelo`,
    ["0 m/s: quieta respecto a las estrellas", `−vSuelo: ${ms(g)} m/s en contra`, `2 × vSuelo: ${ms(2 * g)} m/s`],
  );

  const vmax = Math.sqrt(2 * f.rcsAccelMs2 * lim.brakeShare * Math.max(1, f.clearanceM - f.flareM));
  const profile = choice(
    `${id}-perfil`,
    4,
    "predecir",
    "¿A qué velocidad puedo bajar?",
    `El RCS frena a ${num(f.rcsAccelMs2, 3)} m/s² y usamos la mitad de margen. A ${h} m, ¿a cuánto puede bajar ${who} como mucho para parar a tiempo?`,
    lines([
      [`variable a = ${num(f.rcsAccelMs2, 3)} × 0,5   // m/s², con margen`, `const a = ${f.rcsAccelMs2.toFixed(4)} * 0.5;`],
      [`variable h = ${h} − ${num(f.flareM)}   // hasta el frenado final`, `const h = ${h} - ${f.flareM};`],
      ["variable vMax = raíz(2 × a × h)", "const vMax = Math.sqrt(2 * a * h);"],
    ]),
    `${ms(vmax)} m/s`,
    [`${ms(vmax * vmax)} m/s`, `${ms(vmax / 4)} m/s`, `${ms(2 * vmax)} m/s`],
  );

  const flare = choice(
    `${id}-frenado`,
    5,
    "reparar",
    "Toco el suelo y reboto",
    `${who === "la sonda" ? "La sonda" : "El módulo"} toca el suelo a 0,5 m/s y rebota: las patas aguantan menos de ${ms(lim.touchdownMs)} m/s. ¿Cómo queda bien la línea 2?`,
    lines([
      [`si altura < ${num(f.flareM)} m entonces`, `if (altura < ${f.flareM}) {`],
      ["velocidad = 0,5   // m/s hacia abajo", "velocidad = 0.5; // m/s", 1],
      ["fin", "}"],
    ]),
    `velocidad = ${ms(f.touchdownMs)}   // menos de ${ms(lim.touchdownMs)}: las patas aguantan`,
    [`velocidad = ${ms(lim.crashMs)}   // más rápido, menos combustible`, `velocidad = ${ms(lim.touchdownMs * 2)}   // el doble del límite`, "velocidad = 0   // así nunca toca"],
  );

  const spec = choice(
    `${id}-anclas`,
    10,
    "especificar",
    "Dime exactamente qué quieres",
    `¿Qué orden le das al ordenador de ${who} para el toque final?`,
    [],
    `Al tocar ${name} a menos de ${ms(lim.touchdownMs)} m/s con la panza a menos de ${num(lim.tiltDeg)}°, ${anchors} y apaga los propulsores; si rebota, para y avísame`,
    [
      `Aterriza en ${name}`,
      `Al tocar ${name}, empuja hacia el suelo para que se quede pegada`,
      `${f.craft === "sonda" ? "Dispara las anclas" : "Ancla las patas"} a 10 m del suelo para no rebotar`,
    ],
  );

  return {
    id,
    kind: "programar-aterrizaje",
    targetId: f.targetId,
    title: `Programar el aterrizaje en ${name}`,
    scenario: `${h} m hasta el suelo: bajar a ${ms(f.maxDescentMs)} m/s como mucho, tocar a ${ms(f.touchdownMs)} m/s · unos ${duration(f.descentS)} de descenso`,
    exercises: [sequence, drift, profile, flare, spec],
  };
}
