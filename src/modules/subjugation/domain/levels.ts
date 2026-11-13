import type { Concept } from "@modules/mind-duel/domain/exercise";
import type { DuelProfile } from "@modules/mind-duel/domain/difficulty";

/**
 * Levels of subjugation (docs/design/subyugacion.md §«Niveles»): once an asteroid obeys (the three
 * stages), it can be talked into doing more, one level at a time, each a harder duel:
 *   1. contribute to the nano_net (it can be made a network core);
 *   2. send packages of its own rock to the travel ship;
 *   3. send packages to the station;
 *   4. fly itself to the station and let it be fully extracted.
 * Words of the designer: «la subyugación tiene niveles, un asteroide puede ser convencido para aportar a
 * la nano net, enviar recursos a la nave, enviar recursos a la estación y como nivel máximo ir hasta la
 * estación para que se le extraigan todos los materiales».
 */
export type Level = 1 | 2 | 3 | 4;
export const LEVELS: readonly Level[] = [1, 2, 3, 4];

/** What a level puts the asteroid to doing. */
export type LevelJob = "nano-net" | "a-la-nave" | "a-la-estacion" | "viaje-final";
export const LEVEL_JOB: Readonly<Record<Level, LevelJob>> = { 1: "nano-net", 2: "a-la-nave", 3: "a-la-estacion", 4: "viaje-final" };

/** Game tuning of the levels (labelled game values). */
export const LEVEL_TUNING = {
  /** Trust needed for each level to be on offer: the deeper the job, the surer of her it must be. */
  trustToOffer: { 1: 0.8, 2: 0.85, 3: 0.9, 4: 0.95 } as Readonly<Record<Level, number>>,
  /** Trust a won level duel adds. */
  trustGain: 0.05,
  /** Trust it wins back for each game day it serves calm (a failure costs 0,10: five days). */
  trustPerServiceDay: 0.02,
  /** Depth of a level's mind: the suit stage is depth 2, level N is 2 + N. */
  depthOffset: 2,
  /** Concept blocks of the study index per depth (as the stages). */
  conceptStep: 2,
  /** Extra difficulty per depth (as the stages). */
  difficultyStep: 0.15,
  /** Extra ideas over the base profile: 1 + level (the suit asks base + 1). */
  goalOffset: 1,
  /** Lowest patience a level duel ever has. */
  minPatience: 2,
  /** Trust that buys one more life (as the stages). */
  trustPerPatience: 0.25,
} as const;

/** Spanish labels for in-game text. */
export const LEVEL_NAME: Readonly<Record<Level, string>> = {
  1: "aportar a la nano_net",
  2: "enviar recursos a la nave",
  3: "enviar recursos a la estación",
  4: "ir a la estación para que lo extraigan entero",
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * The duel of a level from the asteroid's base profile: deeper than the suit stage, more ideas, more
 * blocks, always distractors, and one life fewer per level (trust gives lives back as in the stages).
 */
export function levelDuelProfile(base: DuelProfile, level: Level, trust: number): DuelProfile {
  const t = LEVEL_TUNING;
  const depth = t.depthOffset + level;
  return {
    difficulty: clamp01(base.difficulty + t.difficultyStep * depth),
    persuasionGoal: base.persuasionGoal + t.goalOffset + level,
    patience: Math.max(t.minPatience, base.patience + Math.round(clamp01(trust) / t.trustPerPatience) - level),
    maxBlocks: base.maxBlocks + depth,
    distractors: true,
    maxConcept: Math.min(10, base.maxConcept + t.conceptStep * depth) as Concept,
  };
}
