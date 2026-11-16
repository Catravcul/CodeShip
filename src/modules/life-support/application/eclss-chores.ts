import type { Chore } from "@modules/chores/domain/chore";
import { toCall } from "@modules/chores/application/catalog";
import type { ChoiceExercise, CodeBlock, OrderExercise } from "@modules/mind-duel/domain/exercise";
import type { FailureMode } from "../domain/eclss";
import type { LifeSupport } from "../domain/life-support";

const PREFIX = "sv-";

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

/** A failure (or a maintenance) of the life support as a task of code challenges: the procedure, then a real value. */
export function eclssChore(f: FailureMode): Chore {
  const short = f.machine === "incendios" ? "incendios" : f.machine.toUpperCase().replace("SABATIER", "Sabatier").replace("GALERIA", "galería");
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

/** The failure a life-support chore repairs, from its id. */
export const failureOfChore = (choreId: string): string | undefined => (choreId.startsWith(PREFIX) ? choreId.slice(PREFIX.length) : undefined);

/** Open life-support tasks: one per active failure, oldest first. */
export const eclssChores = (ls: LifeSupport): Chore[] => ls.active().map(eclssChore);
