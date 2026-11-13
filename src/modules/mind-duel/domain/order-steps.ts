import type { Answer, OrderExercise } from "./exercise";
import type { Attempts } from "./attempts";

/**
 * Two ways to answer an order (Parsons) challenge, switchable by the player:
 * - «Ordenar todo y enviar»: place every block, then send. A wrong order marks each slot right or
 *   wrong (`slotMarks`); «Reintentar» keeps the right ones in place and sends the wrong ones back
 *   (`keepRight`). The order costs one failure, as always.
 * - «Paso a paso» (like the peanut-butter recipe): each pick is checked at once (`pickStep`). A wrong
 *   pick is flagged, costs one failure and the player picks another; the same wrong pick again is a
 *   repeat and costs nothing. The answer a wrong pick stands for is the right blocks already placed
 *   plus the picked one: an incomplete order, so any session counts it wrong with its own rules, and
 *   `Attempts` tells a repeat from a new pick. A clean run ends in the full order: one hit.
 */
export type SlotMark = "ok" | "bad";

/** Right (in its place in the solution) or wrong, per slot; empty slots are unmarked. */
export function slotMarks(ex: OrderExercise, slots: readonly (string | undefined)[]): (SlotMark | undefined)[] {
  return ex.solution.map((id, i) => (slots[i] === undefined ? undefined : slots[i] === id ? "ok" : "bad"));
}

/** After a wrong order: the right blocks stay in their slots, the wrong ones go back to the tray. */
export function keepRight(ex: OrderExercise, slots: readonly (string | undefined)[]): (string | undefined)[] {
  return ex.solution.map((id, i) => (slots[i] === id ? id : undefined));
}

export type StepVerdict = { readonly kind: "right"; readonly done: boolean } | { readonly kind: "wrong"; readonly answer: Answer } | { readonly kind: "repeated" };

/** Step by step: `placed` are the right blocks already in place; `id` is the block picked for the next slot. */
export function pickStep(ex: OrderExercise, placed: readonly string[], id: string, attempts: Attempts): StepVerdict {
  if (ex.solution[placed.length] === id) return { kind: "right", done: placed.length + 1 === ex.solution.length };
  const answer: Answer = { kind: "order", order: [...placed, id] };
  return attempts.repeated(answer) ? { kind: "repeated" } : { kind: "wrong", answer };
}

/** Blocks already picked wrong for the slot after `placed`, in the order they were tried (crossed out in the tray). */
export function wrongPicks(placed: readonly string[], attempts: Attempts): string[] {
  return attempts
    .wrongOrders()
    .filter((o) => o.length === placed.length + 1 && placed.every((id, i) => o[i] === id))
    .map((o) => o[placed.length]!);
}
