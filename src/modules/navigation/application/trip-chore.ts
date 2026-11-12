import type { ChoiceExercise, CodeBlock, Concept, OrderExercise } from "@modules/mind-duel/domain/exercise";
import type { Chore } from "@modules/chores/domain/chore";
import type { TransferPlan } from "../domain/transfer";

/** The real numbers of one hop, as the challenges show them. */
export interface TripFacts {
  readonly targetId: string;
  readonly targetName: string;
  readonly plan: TransferPlan;
  /** Hand-over height above the surface, metres. */
  readonly approachM: number;
  /** Main engine thrust, N, and ship mass now, kg (a = F / m). */
  readonly thrustN: number;
  readonly massKg: number;
  /** Δv left in the main engine, m/s. */
  readonly deltaVAvailableMS: number;
  /** Detours around rocks on the route. */
  readonly detours: number;
}

const hash = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};
const block = (id: string, pseudo: string, js: string, indent?: number): CodeBlock => (indent ? { id, pseudo, js, indent } : { id, pseudo, js });
const lines = (pairs: readonly (readonly [string, string, number?])[]): CodeBlock[] => pairs.map(([p, j, ind], i) => block(String.fromCharCode(97 + i), p, j, ind));

function choice(id: string, concept: Concept, skill: ChoiceExercise["skill"], idea: string, question: string, code: readonly CodeBlock[], right: string, wrong: readonly string[]): ChoiceExercise {
  const options = [...new Set(wrong.filter((w) => w !== right))];
  const at = hash(id) % (options.length + 1);
  options.splice(at, 0, right);
  return { kind: "choice", id, concept, skill, idea, question, code, options, correct: at };
}

/** Spanish decimal comma. */
export const num = (v: number, d = 0) => v.toFixed(d).replace(".", ",");
/** "4 min 05 s" / "38 s". */
export function duration(s: number): string {
  const t = Math.round(s);
  if (t < 60) return `${t} s`;
  const m = Math.floor(t / 60);
  const r = t % 60;
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min` : `${m} min ${String(r).padStart(2, "0")} s`;
}
const km = (m: number) => (m >= 1000 ? `${num(m / 1000, 1)} km` : `${num(m)} m`);

/**
 * Programming a trip: a short chain of challenges built from the real numbers of the hop (distance,
 * the engine's thrust and the ship's mass, the planned cruise). Solving it loads the plan into the
 * autopilot; failing it leaves the ship under manual control.
 */
export function tripChore(f: TripFacts): Chore {
  const p = f.plan;
  const id = `viaje-${f.targetId}`;
  const v = p.cruiseMS;
  const a = p.accelMS2;
  const burn = Math.round(p.burnS);
  const name = f.targetName;

  const sequence: OrderExercise = {
    kind: "order",
    id: `${id}-maniobra`,
    concept: 1,
    idea: "Primero apunto, luego empujo",
    blocks: lines([
      [`orientar la proa hacia ${name}`, `nave.orientar("${f.targetId}");`],
      [`encender el motor ${burn} s hasta ${num(v)} m/s`, `motor.encender(${burn});`],
      [`apagar y navegar ${km(p.coastDistanceM)} sin empuje`, `nave.navegar(${Math.round(p.coastDistanceM)});`],
      ["dar la vuelta: la tobera mira al destino", "nave.voltear();"],
      [`frenar ${burn} s hasta quedar a ${f.approachM} m`, `motor.encender(${burn});`],
      // Distractor: braking with the nose forward would only speed the ship up.
      [`frenar con la proa hacia ${name}`, `motor.encender(${burn}); // proa delante`],
    ]),
    solution: ["a", "b", "c", "d", "e"],
  };

  const deltaV = choice(
    `${id}-dv`,
    4,
    "completar",
    "¿Cuánto empuje me cuesta?",
    `Hay que acelerar hasta ${num(v)} m/s y frenar del todo al llegar. ¿Qué Δv falta en el plan?`,
    lines([
      [`variable crucero = ${num(v)} m/s`, `const crucero = ${v};`],
      ["variable dv = ___   // acelerar + frenar", "const dv = ___; // acelerar + frenar"],
      [`si dv > ${num(f.deltaVAvailableMS)} m/s entonces abortar()`, `if (dv > ${Math.round(f.deltaVAvailableMS)}) abortar();`],
    ]),
    `${num(2 * v)} m/s`,
    [`${num(v)} m/s`, `${num(4 * v)} m/s`, `${num(v / 2, v % 2 ? 1 : 0)} m/s`],
  );

  const total = p.totalS;
  const timeOfFlight = choice(
    `${id}-tiempo`,
    4,
    "predecir",
    "¿Cuándo llego?",
    `Motor de ${num(f.thrustN)} N y nave de ${num(f.massKg)} kg. ¿Cuánto dura el viaje?`,
    lines([
      [`variable distancia = ${num(p.distanceM)} m`, `const distancia = ${Math.round(p.distanceM)};`],
      [`variable a = ${num(f.thrustN)} / ${num(f.massKg)}   // ${num(a, 2)} m/s²`, `const a = ${f.thrustN} / ${Math.round(f.massKg)}; // ${a.toFixed(2)}`],
      [`variable crucero = ${num(v)} m/s`, `const crucero = ${v};`],
      ["variable t = distancia / crucero + crucero / a", "const t = distancia / crucero + crucero / a;"],
    ]),
    duration(total),
    [duration(p.distanceM / v), duration(p.distanceM / v + (2 * v) / a + 60), duration(total * 2)],
  );

  const brakeDist = (v * v) / (2 * a);
  const repair = choice(
    `${id}-frenado`,
    5,
    "reparar",
    "Me paso de largo",
    `El piloto automático frena tarde y se pasa de ${name}. ¿Cómo queda bien la línea 2?`,
    lines([
      [`variable a = ${num(a, 2)} m/s²`, `const a = ${a.toFixed(2)};`],
      ["variable distFrenado = v / (2 × a)", "const distFrenado = v / (2 * a);"],
      [`si distancia - ${f.approachM} <= distFrenado entonces`, `if (distancia - ${f.approachM} <= distFrenado) {`],
      ["frenar()", "frenar();", 1],
      ["fin", "}"],
    ]),
    `distFrenado = v² / (2 × a)  → ${num(brakeDist)} m a ${num(v)} m/s`,
    [`distFrenado = v × 2 × a  → ${num(v * 2 * a, 1)} m a ${num(v)} m/s`, `distFrenado = v / a  → ${num(v / a, 1)} m a ${num(v)} m/s`],
  );

  const spec = choice(
    `${id}-ia`,
    10,
    "especificar",
    "Dime exactamente qué quieres",
    "¿Qué orden le das a la IA de la nave para este viaje?",
    [],
    `Llévame a ${f.approachM} m de la superficie de ${name} sin chocar con rocas, para del todo apuntando al asteroide y devuélveme los mandos`,
    [`Llévame a ${name}`, `Acelera a tope hacia ${name} y apaga el motor al llegar`, `Llévame a ${name} a ${num(v)} m/s y aterriza tú`],
  );

  return {
    id,
    kind: "programar-viaje",
    targetId: f.targetId,
    title: `Programar el viaje a ${name}`,
    scenario: `${km(p.distanceM)} hasta el punto de llegada${f.detours ? `, rodeando ${f.detours} ${f.detours === 1 ? "roca" : "rocas"}` : ""}: crucero ${num(v)} m/s, Δv ${num(p.deltaVMS)} m/s`,
    exercises: [sequence, deltaV, timeOfFlight, repair, spec],
  };
}
