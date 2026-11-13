/**
 * Port: a challenge step answered right shows what it does, right away (designer: «cada reto debe
 * mostrar el paso correcto ocurriendo»). The challenge sheet calls `stepDone(i)` after step i is solved;
 * the visual builds up step by step and is cleared when the sheet is closed or the plan has flown off.
 * Kept tiny so it can be unified with the chores' step visuals.
 */
export interface StepVisual {
  /** Step `index` (0-based, in chain order) was just answered right. */
  stepDone(index: number): void;
  /** The chain was solved: keep the plan on screen a little, then clear it. */
  finish(): void;
  /** Closed or failed: remove everything now. */
  clear(): void;
}
