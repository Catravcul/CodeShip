import type { Chore } from "@modules/chores/domain/chore";
import { toCall } from "@modules/chores/application/catalog";
import type { ChoiceExercise, CodeBlock, OrderExercise } from "@modules/mind-duel/domain/exercise";
import type { FailureMode } from "../domain/eclss";
import type { LifeSupport } from "../domain/life-support";

const PREFIX = "sv-";
/** Preventive maintenance: `sv-pm-<failure>`. */
const SERVICE = "sv-pm-";

const fmt = (v: number) => (Number.isInteger(v) ? v.toLocaleString("es-ES") : v.toLocaleString("es-ES", { maximumFractionDigits: 2 }));

const hash = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};

function order(id: string, idea: string, steps: readonly string[]): OrderExercise {
  const blocks: CodeBlock[] = steps.map((s, i) => ({ id: String.fromCharCode(97 + i), pseudo: s, js: toCall(s) }));
  return { kind: "order", id, concept: 1, idea, blocks, solution: blocks.map((b) => b.id) };
}

function valueChoice(id: string, f: FailureMode): ChoiceExercise {
  const c = f.check;
  const u = (v: number) => `${fmt(v)}${c.unit ? ` ${c.unit}` : ""}`;
  const options = c.wrong.filter((w) => w !== c.value).map(u);
  const at = hash(id) % (options.length + 1);
  options.splice(at, 0, u(c.value));
  const name = toCall(c.name).replace("();", "");
  return {
    kind: "choice",
    id,
    concept: 2,
    skill: "completar",
    idea: "Vuelve a dejarme como en la ISS",
    question: `¿Qué valor real lleva ${c.name}?`,
    code: [{ id: "a", pseudo: `${c.name} = ___`, js: `${name} = ___;` }],
    options,
    correct: at,
  };
}

const shortOf = (f: FailureMode) => (f.machine === "incendios" ? "incendios" : f.machine.toUpperCase().replace("SABATIER", "Sabatier").replace("GALERIA", "galería"));

/** A failure (or a maintenance) of the life support as a task of code challenges: the procedure, then a real value. */
export function eclssChore(f: FailureMode): Chore {
  const short = shortOf(f);
  return {
    id: `${PREFIX}${f.id}`,
    kind: "soporte-vital",
    targetId: f.machine,
    machine: f.machine,
    title: f.maintenance ? `Mantenimiento ${short}: ${f.name.toLowerCase()}` : `Reparar ${short}: ${f.name.toLowerCase()}`,
    scenario: f.symptom,
    exercises: [order(`${PREFIX}${f.id}-pasos`, `Cambia la pieza: ${f.spare.name.toLowerCase()}`, f.steps), valueChoice(`${PREFIX}${f.id}-valor`, f)],
  };
}

/**
 * The preventive maintenance of a worn mode, before it fails (docs/design/soporte-vital.md, «Averías con causa»):
 * its scenario is the cause, its procedure the service's (cleaning) or the part's change.
 */
export function serviceChore(f: FailureMode): Chore {
  const s = f.wear.service;
  return {
    id: `${SERVICE}${f.id}`,
    kind: "soporte-vital",
    targetId: f.machine,
    machine: f.machine,
    title: `Preventivo ${shortOf(f)}: ${s.name}`,
    scenario: `Se acerca: ${f.name.toLowerCase()}. Causa: ${f.wear.cause}`,
    exercises: [order(`${SERVICE}${f.id}-pasos`, s.usesSpare ? `Antes de que falle, cambia: ${f.spare.name.toLowerCase()}` : `Antes de que falle: ${s.name}`, s.steps ?? f.steps), valueChoice(`${SERVICE}${f.id}-valor`, f)],
  };
}

/** The failure a life-support repair chore fixes, from its id (not a preventive one). */
export const failureOfChore = (choreId: string): string | undefined => (choreId.startsWith(PREFIX) && !choreId.startsWith(SERVICE) ? choreId.slice(PREFIX.length) : undefined);

/** The worn mode a preventive maintenance chore serves, from its id. */
export const serviceOfChore = (choreId: string): string | undefined => (choreId.startsWith(SERVICE) ? choreId.slice(SERVICE.length) : undefined);

/** Open life-support tasks: one per active failure, oldest first, then the preventive maintenance due. */
export const eclssChores = (ls: LifeSupport): Chore[] => [...ls.active().map(eclssChore), ...ls.due().map(serviceChore)];
