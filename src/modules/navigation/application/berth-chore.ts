import type { ChoiceExercise, CodeBlock, Concept, OrderExercise } from "@modules/mind-duel/domain/exercise";
import type { Chore } from "@modules/chores/domain/chore";
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
 * Docking by program (the «Automático (retos)» of the docking station): order the real approach of a visiting
 * vehicle (Crew Dragon Demo-1: Waypoint 1, the axis, Waypoint 2 and its go/no-go, closing at contact speed, soft
 * then hard capture), work out how long the closing takes, and pick the contact speed the hooks accept.
 * Solving it hands the approach to the flight computer.
 */
export function berthChore(f: BerthFacts): Chore {
  const id = `acople-${f.portName}`;
  const closeM = f.waypoint1M - f.waypoint2M;
  const sequence: OrderExercise = {
    kind: "order",
    id: `${id}-secuencia`,
    concept: 1,
    idea: "Como la Crew Dragon: por puntos de espera",
    blocks: lines([
      [`esperar en el punto 1 (${num(f.waypoint1M)} m)`, `nave.esperar(${f.waypoint1M});`],
      ["alinear con el eje del puerto", "nave.alinearConEje(puerto);"],
      [`acercarse a ${num(f.closingMs, 2)} m/s al punto 2 (${num(f.waypoint2M)} m)`, `nave.acercar(${f.closingMs}, ${f.waypoint2M});`],
      [`esperar el «adelante» (${duration(f.holdS)})`, `nave.esperarAdelante();`],
      [`seguir a ${num(f.closingMs, 2)} m/s hasta tocar`, `nave.acercar(${f.closingMs}, 0);`],
      ["cerrar los ganchos", "puerto.cerrarGanchos();"],
      // Distractor: rushing in.
      ["ir directa a 1 m/s", "nave.acercar(1, 0);"],
    ]),
    solution: ["a", "b", "c", "d", "e", "f"],
  };
  const time = choice(
    `${id}-tiempo`,
    4,
    "predecir",
    "Despacio se llega",
    `¿Cuánto tarda en ir del punto 1 al punto 2 a ${num(f.closingMs, 2)} m/s?`,
    lines([
      [`variable tramo = ${num(f.waypoint1M)} − ${num(f.waypoint2M)}   // m`, `const tramo = ${f.waypoint1M} - ${f.waypoint2M};`],
      [`variable t = tramo / ${num(f.closingMs, 2)}`, `const t = tramo / ${f.closingMs};`],
    ]),
    duration(closeM / f.closingMs),
    [duration(f.waypoint1M / f.closingMs), duration(closeM * f.closingMs), duration(closeM / 1)],
  );
  const contact = choice(
    `${id}-contacto`,
    5,
    "completar",
    "Los ganchos solo cogen si llegas suave",
    `Los ganchos IDSS cogen entre ${num(f.closingMinMs, 2)} y ${num(f.closingMaxMs, 2)} m/s y a menos de ${num(f.lateralMaxM, 2)} m del eje. ¿Qué condición falta?`,
    lines([
      ["si (cierre ≥ mín y ___ y desvío ≤ máx)", "if (cierre >= min && ___ && desvio <= max)"],
      ["    puerto.cerrarGanchos()", "  puerto.cerrarGanchos();"],
      ["si no: retroceder y repetir", "else nave.retroceder();"],
    ]),
    "cierre ≤ máx",
    ["cierre ≥ 1", "desvío ≥ máx", "cierre = 0"],
  );
  return {
    id,
    kind: "programar-viaje",
    targetId: f.portName,
    title: `Programar el acople en ${f.stationName}`,
    scenario: `De ${num(f.waypoint1M)} m al puerto ${f.portName} a ${num(f.closingMs, 2)} m/s, con espera en ${num(f.waypoint2M)} m: como la Crew Dragon en la ISS`,
    exercises: [sequence, time, contact],
  };
}
