import type { ChoiceExercise, CodeBlock, Concept } from "@modules/mind-duel/domain/exercise";
import type { Chore } from "@modules/chores/domain/chore";
import type { StepAct } from "@modules/chores/domain/step-visual";
import { duration, num } from "./trip-chore";

/** The real numbers of a last approach to a station's port (docs/design/puente.md §Acople). */
export interface BerthFacts {
  readonly stationName: string;
  readonly portName: string;
  /** Waypoint 1 and Waypoint 2 on the port axis, m (Crew Dragon Demo-1: 150 and 20). */
  readonly waypoint1M: number;
  readonly waypoint2M: number;
  /** Closing speed of the approach, m/s, and the IDSS window it must touch within. */
  readonly closingMs: number;
  readonly closingMinMs: number;
  readonly closingMaxMs: number;
  readonly lateralMaxM: number;
  /** Go/no-go hold at Waypoint 2, s. */
  readonly holdS: number;
}

const hash = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};
const lines = (pairs: readonly (readonly [string, string])[]): CodeBlock[] => pairs.map(([pseudo, js], i) => ({ id: String.fromCharCode(97 + i), pseudo, js }));
function choice(id: string, concept: Concept, skill: ChoiceExercise["skill"], idea: string, question: string, code: readonly CodeBlock[], right: string, wrong: readonly string[]): ChoiceExercise {
  const options = [...new Set(wrong.filter((w) => w !== right))];
  const at = hash(id) % (options.length + 1);
  options.splice(at, 0, right);
  return { kind: "choice", id, concept, skill, idea, question, code, options, correct: at };
}

/**
 * Docking by program (the «Automático (retos)» of the docking station): the real approach of a visiting vehicle
 * (Crew Dragon Demo-1) decision by decision from Waypoint 1: align with the axis first (not rush in at 1 m/s), how
 * long the closing to Waypoint 2 takes, what it waits for there (the station's «go»), and the contact speed the
 * hooks accept.
 * Solving it hands the approach to the flight computer.
 */
export function berthChore(f: BerthFacts): Chore {
  const id = `acople-${f.portName}`;
  const closeM = f.waypoint1M - f.waypoint2M;
  // Each decision is a choice (four options fit a phone's sheet; an order of six blocks did not, 390×664).
  // Compact: a short idea, one line of code, a one-line question and three options, so the options fit under the
  // console's scene on a phone (390×664) with the «Correcto» banner of the step before.
  const first = choice(
    `${id}-primero`,
    1,
    "completar",
    "Por puntos de espera",
    "En el punto 1, ¿qué va primero?",
    lines([[`___; nave.acercar(${num(f.closingMs, 2)}, ${num(f.waypoint2M)})`, `___; nave.acercar(${f.closingMs}, ${f.waypoint2M});`]]),
    "alinear con el eje",
    ["ir directa a 1 m/s", "cerrar los ganchos"],
  );
  const time = choice(
    `${id}-tiempo`,
    4,
    "predecir",
    "Despacio se llega",
    `¿Del punto 1 al 2 a ${num(f.closingMs, 2)} m/s?`,
    lines([[`t = (${num(f.waypoint1M)} − ${num(f.waypoint2M)}) / ${num(f.closingMs, 2)}`, `const t = (${f.waypoint1M} - ${f.waypoint2M}) / ${f.closingMs};`]]),
    duration(closeM / f.closingMs),
    [duration(f.waypoint1M / f.closingMs), duration(closeM / 1)],
  );
  const hold = choice(
    `${id}-espera`,
    2,
    "completar",
    "Parar y esperar",
    `En el punto 2 (${num(f.waypoint2M)} m), ¿qué espera?`,
    lines([[`___; nave.acercar(${num(f.closingMs, 2)}, 0)`, `___; nave.acercar(${f.closingMs}, 0);`]]),
    `el «adelante» (${duration(f.holdS)})`,
    ["nada: sigue a 1 m/s", "los ganchos"],
  );
  const contact = choice(
    `${id}-contacto`,
    5,
    "completar",
    `Ganchos: ${num(f.closingMinMs, 2)}–${num(f.closingMaxMs, 2)} m/s`,
    "¿Qué condición falta?",
    lines([["si (cierre ≥ mín y ___) cerrarGanchos()", "if (cierre >= min && ___) cerrarGanchos();"]]),
    "cierre ≤ máx",
    ["cierre ≥ 1", "cierre = 0"],
  );
  return {
    id,
    kind: "programar-viaje",
    targetId: f.portName,
    title: "Acople por retos",
    scenario: `De ${num(f.waypoint1M)} m al puerto ${f.portName} a ${num(f.closingMs, 2)} m/s, con espera en ${num(f.waypoint2M)} m: como la Crew Dragon en la ISS`,
    exercises: [first, time, hold, contact],
  };
}

/**
 * What each solved step of the docking challenge does at the docking seat (reglas.md §4.2): her hands on the
 * touchscreen for each command, her eyes on the docking camera for each check. In chain order: align (command),
 * the time to Waypoint 2 (check), the hold for the «go» (check), the hooks (command).
 */
export const BERTH_STEP_ACTS: readonly (readonly StepAct[])[] = [
  [{ action: "programar", place: "objetivo" }],
  [{ action: "revisar", place: "objetivo" }],
  [{ action: "revisar", place: "objetivo" }],
  [{ action: "programar", place: "objetivo" }],
];

/** The stages of the docking camera's approach each solved step plays, in chain order (see berthStage). */
export const BERTH_STEP_STAGES: readonly (readonly number[])[] = [[1], [2], [3, 4], [5]];

/** The approach the docking camera shows as each block is placed: the range to the port and what happens, per stage 0–5. */
export function berthStage(f: Pick<BerthFacts, "waypoint1M" | "waypoint2M" | "closingMs">, stage: number): { fromM: number; toM: number; caption: string } {
  const w1 = f.waypoint1M, w2 = f.waypoint2M;
  switch (stage) {
    case 0:
      return { fromM: w1, toM: w1, caption: `Punto 1: ${num(w1)} m, esperando` };
    case 1:
      return { fromM: w1, toM: w1, caption: "Alineada con el eje del puerto" };
    case 2:
      return { fromM: w1, toM: w2, caption: `A ${num(f.closingMs, 2)} m/s hacia el punto 2` };
    case 3:
      return { fromM: w2, toM: w2, caption: `Punto 2: ${num(w2)} m, esperando el «adelante»` };
    case 4:
      return { fromM: w2, toM: 0, caption: `A ${num(f.closingMs, 2)} m/s hasta el contacto` };
    default:
      return { fromM: 0, toM: 0, caption: "+Captura suave: ganchos cerrados" };
  }
}
