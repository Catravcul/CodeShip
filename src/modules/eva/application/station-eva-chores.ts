import type { Chore } from "@modules/chores/domain/chore";
import { toCall } from "@modules/chores/application/catalog";
import type { ChoiceExercise, CodeBlock, OrderExercise } from "@modules/mind-duel/domain/exercise";
import { EVA_JOBS, QUEST_EVA, type EvaSite } from "../data/station-eva";
import { EMU } from "../data/suit";
import { RETURN_MARGIN_S } from "../domain/suit";

/**
 * The spacewalk's code challenges (docs/design/paseo-espacial.md, «Desde Quest»): putting on the EMU in Quest's
 * equipment lock with the ISLE prebreathe, and each job outside at its worksite. The steps are the real ones;
 * the questions use the real numbers and, outside, her suit's own consumables.
 */
const block = (id: string, pseudo: string, js = toCall(pseudo)): CodeBlock => ({ id, pseudo, js });
const num = (v: number, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString("es-ES", { maximumFractionDigits: d });

function choice(id: string, c: Omit<ChoiceExercise, "kind" | "id" | "options" | "correct">, right: string, wrongs: readonly string[]): ChoiceExercise {
  const options = [...new Set(wrongs)].filter((w) => w !== right).slice(0, 3);
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const at = h % (options.length + 1);
  options.splice(at, 0, right);
  return { kind: "choice", id, ...c, options, correct: at };
}

function order(id: string, idea: string, steps: readonly string[], trap: string | undefined, first = 0): OrderExercise {
  const blocks = steps.map((s, i) => block(String.fromCharCode(97 + first + i), s));
  return { kind: "order", id, concept: 1, idea, blocks: trap ? [...blocks, block("x", trap)] : blocks, solution: blocks.map((b) => b.id) };
}

/** The EMU on, in the real order (NASA 2014: LCVG, lower torso, hard upper torso, gloves and helmet, leak check). */
export const DONNING_STEPS: readonly string[] = [
  "ponerse la prenda de refrigeración (LCVG)",
  "meterse en el pantalón del traje",
  "entrar por debajo en el torso rígido y cerrar la cintura",
  "ponerse los guantes y el casco",
  "comprobar fugas en el módulo de control del pecho",
];

/** Putting on the suit and the ISLE prebreathe (Quest's equipment lock). */
export function donningChore(): Chore {
  const mask = QUEST_EVA.maskMin.value;
  const suit = QUEST_EVA.inSuitMin.value;
  return {
    id: "eva:traje",
    kind: "paseo-espacial",
    title: "Ponerse el EMU y prerrespirar (ISLE)",
    scenario: `En Quest: el EMU va a ${num(EMU.pressureKPa.value)} kPa de oxígeno puro; antes hay que sacar el nitrógeno de la sangre`,
    exercises: [
      order("eva-traje-pasos", "El traje se pone de dentro afuera y no se sale sin comprobar fugas", DONNING_STEPS, "abrir la escotilla sin comprobar fugas"),
      choice(
        "eva-traje-isle",
        { concept: 4, skill: "predecir", idea: "ISLE: una hora de mascarilla y unos 100 minutos en el traje (50 de ejercicio suave y 50 de reposo)", question: "¿Cuántos minutos dura la prerrespiración?", code: [block("a", `mascarilla = ${mask} min`, `const mascarilla = ${mask};`), block("b", `traje = ${suit} min`, `const traje = ${suit};`), block("c", "total = mascarilla + traje", "const total = mascarilla + traje;")] },
        `${mask + suit} min`,
        [`${suit} min`, `${mask} min`, `${mask * suit} min`],
      ),
    ],
  };
}

/** What the job's question reads from her suit now. */
export interface SuitNow {
  /** Primary oxygen left, h. */
  readonly o2H: number;
}

/** A job at a worksite: the steps (split in two if long) and how much work time her suit allows. */
export function jobChore(site: EvaSite, now: SuitNow): Chore {
  const job = EVA_JOBS[site];
  const margin = RETURN_MARGIN_S / 3600;
  const work = Math.max(0, now.o2H - margin);
  const half = job.steps.length > 5 ? Math.ceil(job.steps.length / 2) : job.steps.length;
  const q = choice(
    `eva-${site}-margen`,
    { concept: 4, skill: "predecir", idea: "El EMU guarda media hora de oxígeno para volver: se trabaja con lo que queda", question: "¿Cuántas horas puede trabajar antes de volver?", code: [block("a", `oxigeno = ${num(now.o2H)} h`, `const oxigeno = ${num(now.o2H).replace(",", ".")};`), block("b", `margen = ${num(margin)} h`, `const margen = ${margin};`), block("c", "trabajo = oxigeno - margen", "const trabajo = oxigeno - margen;")] },
    `${num(work)} h`,
    [`${num(now.o2H + margin)} h`, `${num(now.o2H)} h`, `${num(margin)} h`],
  );
  const rest = job.steps.slice(half);
  return {
    id: `eva:${site}`,
    kind: "paseo-espacial",
    title: job.title,
    scenario: job.how,
    targetId: site,
    exercises: [q, order(`eva-${site}-pasos`, job.how, job.steps.slice(0, half), job.trap), ...(rest.length ? [order(`eva-${site}-pasos-2`, job.how, rest, undefined, half)] : [])],
  };
}
