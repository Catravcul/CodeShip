/** A line of code shown with two faces: Spanish pseudocode (default) and JavaScript. */
export interface CodeBlock {
  readonly id: string;
  readonly pseudo: string;
  readonly js: string;
  /** Nesting level for display, 0 = top level. */
  readonly indent?: number;
}

/** Concept blocks of the study index (docs/research/indice-de-estudio.md). */
export type Concept = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** Put blocks in the right order (Parsons problem). Blocks not in `solution` are distractors. */
export interface OrderExercise {
  readonly kind: "order";
  readonly id: string;
  readonly concept: Concept;
  readonly idea: string;
  readonly blocks: readonly CodeBlock[];
  readonly solution: readonly string[];
}

/** Read code and pick one option: fill a gap, predict a value, find the bug or choose the precise spec. */
export interface ChoiceExercise {
  readonly kind: "choice";
  readonly id: string;
  readonly concept: Concept;
  readonly skill: "completar" | "predecir" | "reparar" | "especificar";
  readonly idea: string;
  readonly question: string;
  readonly code: readonly CodeBlock[];
  readonly options: readonly string[];
  readonly correct: number;
}

export type Exercise = OrderExercise | ChoiceExercise;

export type Answer = { readonly kind: "order"; readonly order: readonly string[] } | { readonly kind: "choice"; readonly index: number };

export function isCorrect(ex: Exercise, answer: Answer): boolean {
  if (ex.kind === "order" && answer.kind === "order") {
    return answer.order.length === ex.solution.length && answer.order.every((id, i) => id === ex.solution[i]);
  }
  if (ex.kind === "choice" && answer.kind === "choice") return answer.index === ex.correct;
  return false;
}

/** Number of blocks the player handles, used to fit exercises to the difficulty. */
export function blockCount(ex: Exercise): number {
  return ex.kind === "order" ? ex.blocks.length : ex.code.length;
}

export function hasDistractors(ex: Exercise): boolean {
  return ex.kind === "order" && ex.blocks.length > ex.solution.length;
}
