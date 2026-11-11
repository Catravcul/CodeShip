import type { Concept } from "./exercise";

export interface DuelProfile {
  /** 0 (easy) .. 1 (hardest). */
  readonly difficulty: number;
  /** Correct ideas needed to persuade. */
  readonly persuasionGoal: number;
  /** Failed ideas the asteroid tolerates before turning aggressive. */
  readonly patience: number;
  readonly maxBlocks: number;
  readonly distractors: boolean;
  /** Highest concept block of the study index used in this duel. */
  readonly maxConcept: Concept;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Difficulty grows with mass (log scale, ~1e10 kg small rubble piles to ~1e20 kg protoplanets)
 * and with resource richness (0..1).
 */
export function duelProfileFor(input: { massKg: number; richness: number }): DuelProfile {
  const massTier = clamp01((Math.log10(input.massKg) - 10) / 10);
  const d = clamp01(0.6 * massTier + 0.4 * clamp01(input.richness));
  return {
    difficulty: d,
    persuasionGoal: 3 + Math.round(d * 5),
    patience: 5 - Math.round(d * 3),
    maxBlocks: 4 + Math.round(d * 6),
    distractors: d >= 0.35,
    maxConcept: (1 + Math.min(9, Math.floor(d * 10))) as Concept,
  };
}
