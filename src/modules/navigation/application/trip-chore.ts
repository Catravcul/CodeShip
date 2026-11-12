import type { ChoiceExercise, CodeBlock, Concept, OrderExercise } from "@modules/mind-duel/domain/exercise";
import type { Chore } from "@modules/chores/domain/chore";
import type { ContinuousBurnPlan, TransferPlan } from "../domain/transfer";

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

/** The real numbers of a mothership hop (low thrust, no coast) and of the probe's last leg. */
export interface CarrierTripFacts {
  readonly targetId: string;
  readonly targetName: string;
  readonly carrierName: string;
  readonly plan: ContinuousBurnPlan;
  readonly thrusterCount: number;
  readonly thrustN: number;
  readonly massKg: number;
  /** Δv left in the mothership, m/s. */
  readonly deltaVAvailableMS: number;
  /** Days of thrust and kilograms of propellant the hop burns. */
  readonly burnDays: number;
  readonly propellantKg: number;
  /** Where it parks above the surface, and how close the probe then goes, metres. */
  readonly parkingM: number;
  readonly approachM: number;
  readonly detours: number;
}

const sig = (v: number, d = 2) => num(v, v < 0.1 ? 4 : v < 1 ? 3 : d);
const tonnes = (kg: number) => `${num(kg / 1000)} t`;

/**
 * Programming a trip of the mothership with the probe docked: the electric thrusters push all the
 * way (accelerate half, turn round, brake half), it parks above the target and the probe undocks
 * for the last leg. Same five kinds of challenge as the probe hop, with the mothership's numbers.
 */
export function carrierTripChore(f: CarrierTripFacts): Chore {
  const p = f.plan;
  const id = `viaje-nodriza-${f.targetId}`;
  const a = p.accelMS2;
  const name = f.targetName;
  const half = p.totalS / 2;

  const sequence: OrderExercise = {
    kind: "order",
    id: `${id}-maniobra`,
    concept: 1,
    idea: "Somos grandes y lentos: empujamos todo el camino",
    blocks: lines([
      [`orientar la nodriza hacia ${name}`, `nodriza.orientar("${f.targetId}");`],
      [`encender los ${f.thrusterCount} propulsores Hall ${duration(half)}`, `propulsores.encender(${Math.round(half)});`],
      [`dar la vuelta a mitad de camino (${km(p.distanceM / 2)})`, "nodriza.voltear();"],
      [`frenar ${duration(half)} hasta aparcar a ${num(f.parkingM)} m`, `propulsores.encender(${Math.round(half)});`],
      ["desacoplar la sonda", "sonda.desacoplar();"],
      [`volar la sonda hasta ${f.approachM} m de la superficie`, `sonda.volarHasta(${f.approachM});`],
      // Distractor: a low-thrust ship can't coast and then stop in time.
      ["apagar los propulsores a mitad de camino y esperar", "propulsores.apagar();"],
    ]),
    solution: ["a", "b", "c", "d", "e", "f"],
  };

  const deltaV = choice(
    `${id}-dv`,
    4,
    "completar",
    "¿Cuánto empuje me cuesta?",
    `Empujamos la mitad del camino y frenamos la otra mitad. ¿Qué número falta para el Δv?`,
    lines([
      [`variable distancia = ${num(p.distanceM)} m`, `const distancia = ${Math.round(p.distanceM)};`],
      [`variable a = ${num(f.thrustN, 1)} N / ${tonnes(f.massKg)}   // ${sig(a * 1e6, 1)} µm/s²`, `const a = ${f.thrustN.toFixed(1)} / ${Math.round(f.massKg)};`],
      ["variable dv = ___ × raíz(distancia × a)", "const dv = ___ * Math.sqrt(distancia * a);"],
      [`// = ${sig(p.deltaVMS)} m/s de los ${num(f.deltaVAvailableMS)} m/s que quedan`, `// ${p.deltaVMS.toFixed(3)} m/s`],
    ]),
    "2",
    ["1", "4", "0,5"],
  );

  const time = choice(
    `${id}-tiempo`,
    4,
    "predecir",
    "¿Cuánto dura el viaje?",
    `Con ${sig(a * 1e6, 1)} µm/s² de aceleración, ¿cuánto tarda la nodriza?`,
    lines([
      [`variable distancia = ${num(p.distanceM)} m`, `const distancia = ${Math.round(p.distanceM)};`],
      [`variable a = ${sig(a * 1e6, 1)} × 10⁻⁶ m/s²`, `const a = ${a.toExponential(3)};`],
      ["variable t = 2 × raíz(distancia / a)", "const t = 2 * Math.sqrt(distancia / a);"],
    ]),
    duration(p.totalS),
    [duration(p.totalS / 2), duration(p.totalS * 2), duration(p.distanceM / Math.max(1e-9, p.peakMS))],
  );

  const repair = choice(
    `${id}-vuelta`,
    5,
    "reparar",
    "No me da tiempo a frenar",
    `La nodriza llega a ${name} todavía rápida y se pasa. ¿Cómo queda bien la línea 1?`,
    lines([
      ["si recorrido >= distancia / 4 entonces", "if (recorrido >= distancia / 4) {"],
      ["voltear()", "voltear();", 1],
      ["frenar()", "frenar();", 1],
      ["fin", "}"],
    ]),
    "si recorrido >= distancia / 2 entonces",
    ["si recorrido >= distancia entonces", "si recorrido >= distancia / 8 entonces"],
  );

  const spec = choice(
    `${id}-ia`,
    10,
    "especificar",
    "Dime exactamente qué quieres",
    "¿Qué orden le das a la IA de la nodriza?",
    [],
    `Lleva la nodriza a ${num(f.parkingM)} m de ${name} rodeando las rocas y para del todo; luego desacopla la sonda, acércala a ${f.approachM} m apuntando al asteroide y devuélveme los mandos`,
    [`Lleva la nodriza a ${name}`, `Acerca la nodriza a ${f.approachM} m de ${name} y aterriza con ella`, `Desacopla la sonda y que vaya sola hasta ${name}`],
  );

  return {
    id,
    kind: "programar-viaje",
    targetId: f.targetId,
    title: `Programar el viaje de la nodriza a ${name}`,
    scenario: `${km(p.distanceM)} con ${f.thrusterCount} propulsores Hall: Δv ${sig(p.deltaVMS)} m/s, ${num(f.propellantKg)} kg de xenón, ${duration(p.totalS)}${f.detours ? `, rodeando ${f.detours} ${f.detours === 1 ? "roca" : "rocas"}` : ""}`,
    exercises: [sequence, deltaV, time, repair, spec],
  };
}
