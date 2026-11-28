import { toCall } from "@modules/chores/application/catalog";
import type { ChoiceExercise, CodeBlock, OrderExercise } from "@modules/mind-duel/domain/exercise";

/** The pieces of sanctuary 3's code challenges (as station-eva-chores.ts): blocks, an order and a choice. */
export const block = (id: string, pseudo: string, js = toCall(pseudo)): CodeBlock => ({ id, pseudo, js });

/** A number the Spanish way, with up to `d` decimals. */
export const num = (v: number, d = 1): string => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString("es-ES", { maximumFractionDigits: d });

/** A choice with the right answer at a place fixed by its id (so it never moves between runs). */
export function choice(id: string, c: Omit<ChoiceExercise, "kind" | "id" | "options" | "correct">, right: string, wrongs: readonly string[]): ChoiceExercise {
  const options = [...new Set(wrongs)].filter((w) => w !== right).slice(0, 3);
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const at = h % (options.length + 1);
  options.splice(at, 0, right);
  return { kind: "choice", id, ...c, options, correct: at };
}

/** Real steps to put in order, with a trap (a step that must not be there) if given. */
export function order(id: string, idea: string, steps: readonly string[], trap?: string): OrderExercise {
  const blocks = steps.map((s, i) => block(String.fromCharCode(97 + i), s));
  return { kind: "order", id, concept: 1, idea, blocks: trap ? [...blocks, block("x", trap)] : blocks, solution: blocks.map((b) => b.id) };
}
