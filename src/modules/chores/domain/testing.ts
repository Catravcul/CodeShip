import type { Answer, Exercise } from "@modules/mind-duel/domain/exercise";
import type { ChoreRun } from "./chore";

const right = (ex: Exercise): Answer => (ex.kind === "order" ? { kind: "order", order: ex.solution } : { kind: "choice", index: ex.correct });

/**
 * For tests that make a chore fail: a wrong answer not yet given to the current step (a repeated one
 * counts nothing), or the right one when every wrong answer was tried, so the run moves on and can fail later.
 */
export function failingAnswer(run: ChoreRun): Answer {
  const ex = run.current;
  if (!ex) throw new Error("Chore is over");
  const candidates: Answer[] =
    ex.kind === "choice"
      ? ex.options.map((_, i) => ({ kind: "choice", index: i }) as Answer).filter((a) => a.kind === "choice" && a.index !== ex.correct)
      : ex.solution.map((_, k) => ({ kind: "order", order: [...ex.solution.slice(k + 1), ...ex.solution.slice(0, k + 1)] }) as Answer).filter((a) => a.kind === "order" && a.order.join() !== ex.solution.join());
  return candidates.find((a) => !run.tried(a)) ?? right(ex);
}
