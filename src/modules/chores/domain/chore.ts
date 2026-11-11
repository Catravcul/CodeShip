import { isCorrect, type Answer, type Exercise } from "@modules/mind-duel/domain/exercise";

export type ChoreKind =
  | "regar"
  | "agitar"
  | "cosechar"
  | "curar-planta"
  | "alimentar-gato"
  | "calmar-gato"
  | "cocinar"
  | "yoga"
  | "reparar-nave";

/** A task on board, done by solving code challenges in order. */
export interface Chore {
  readonly id: string;
  readonly kind: ChoreKind;
  readonly title: string;
  /** Why it is needed now ("Luna mordió la lechuga", "la sacudida volcó la maceta"…). */
  readonly scenario: string;
  readonly targetId?: string;
  /** In order: for yoga each exercise is the next posture of the sequence. */
  readonly exercises: readonly Exercise[];
}

export type ChoreStatus = "doing" | "done" | "failed";

/**
 * Doing a chore: exercises in the given order (unlike an asteroid duel, never shuffled).
 * Each solved exercise is a step done; too many mistakes and the chore must be retried.
 */
export class ChoreRun {
  private _step = 0;
  private _mistakes = 0;
  private _status: ChoreStatus = "doing";

  constructor(
    readonly chore: Chore,
    readonly maxMistakes = 2,
  ) {
    if (chore.exercises.length === 0) throw new Error(`Chore ${chore.id} has no exercises`);
  }

  get status(): ChoreStatus {
    return this._status;
  }
  get step(): number {
    return this._step;
  }
  get steps(): number {
    return this.chore.exercises.length;
  }
  get mistakesLeft(): number {
    return this.maxMistakes - this._mistakes;
  }
  get current(): Exercise | undefined {
    return this._status === "doing" ? this.chore.exercises[this._step] : undefined;
  }

  /** Returns whether the answer was right. */
  submit(answer: Answer): boolean {
    const ex = this.current;
    if (!ex) throw new Error("Chore is over");
    const ok = isCorrect(ex, answer);
    if (ok) {
      this._step++;
      if (this._step >= this.steps) this._status = "done";
    } else {
      this._mistakes++;
      if (this._mistakes >= this.maxMistakes) this._status = "failed";
    }
    return ok;
  }
}
