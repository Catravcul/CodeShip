import type { Answer, Exercise } from "./exercise";

/** Same answer → same key (a choice by its index, an order by its blocks). */
export const answerKey = (a: Answer): string => (a.kind === "choice" ? `c:${a.index}` : `o:${a.order.join(",")}`);

/**
 * Wrong answers already given to the challenge on screen. A wrong answer stays recorded until the
 * challenge changes: giving it again is not a new answer (it costs nothing and can never undo the
 * first one, nor end or advance the challenge).
 */
export class Attempts {
  private exerciseId: string | undefined;
  private readonly wrong = new Set<string>();
  private readonly wrongIndexes: number[] = [];
  private readonly wrongOrderList: (readonly string[])[] = [];

  /** The challenge now on screen; forgets the record when it is a different one. */
  on(ex: Exercise | undefined): void {
    if (ex?.id === this.exerciseId) return;
    this.exerciseId = ex?.id;
    this.wrong.clear();
    this.wrongIndexes.length = 0;
    this.wrongOrderList.length = 0;
  }

  repeated(a: Answer): boolean {
    return this.wrong.has(answerKey(a));
  }

  record(a: Answer, ok: boolean): void {
    if (ok || this.repeated(a)) return;
    this.wrong.add(answerKey(a));
    if (a.kind === "choice") this.wrongIndexes.push(a.index);
    else this.wrongOrderList.push([...a.order]);
  }

  /** Options of a choice already answered wrong, in the order they were tried. */
  wrongChoices(): readonly number[] {
    return [...this.wrongIndexes];
  }

  /** Orders (whole or, step by step, partial) already answered wrong, in the order they were tried. */
  wrongOrders(): readonly (readonly string[])[] {
    return this.wrongOrderList;
  }

  get count(): number {
    return this.wrong.size;
  }
}

export type SessionOutcome = "playing" | "won" | "lost";

/** How a challenge session stands: playing while a challenge is shown; then won at the goal, lost otherwise. */
export function sessionOutcome(s: { readonly current: Exercise | undefined; readonly progress: number; readonly goal: number; readonly lives: number }): SessionOutcome {
  if (s.current) return "playing";
  return s.progress >= s.goal ? "won" : "lost";
}
