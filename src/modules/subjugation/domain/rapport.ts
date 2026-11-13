import type { Concept } from "@modules/mind-duel/domain/exercise";
import type { DuelProfile } from "@modules/mind-duel/domain/difficulty";

/**
 * Subjugating an asteroid ("entrar en su mente") happens in three stages, each one closer
 * (docs/design/subyugacion.md):
 * - sonda: the uncrewed probe is parked on it and the duel runs through the probe;
 * - nave: the crewed lander, with Doménica aboard, is parked on it;
 * - traje: Doménica goes out in her suit and lies on it, full body contact.
 * More contact gives more mental power but is riskier, so each stage only opens after the one
 * before it succeeded on that asteroid.
 */
export type Stage = "sonda" | "nave" | "traje";
export const STAGES: readonly Stage[] = ["sonda", "nave", "traje"];
export const stageIndex = (s: Stage): number => STAGES.indexOf(s);

/** Game tuning of the subjugation (labelled game values, not measurements). */
export const SUBJUGATION_TUNING = {
  /** Trust each successful stage adds (0..1). They sum to 1: a subjugated asteroid trusts fully. */
  trustGain: { sonda: 0.25, nave: 0.3, traje: 0.45 } as Readonly<Record<Stage, number>>,
  /** Trust a failed duel takes away: it remembers being pushed. */
  trustLoss: 0.1,
  /** Extra concept blocks of the study index reached at each stage: deeper mind, harder ideas. */
  conceptStep: 2,
  /** Ideas needed at each stage relative to the asteroid's base profile. */
  goalOffset: { sonda: -1, nave: 0, traje: 1 } as Readonly<Record<Stage, number>>,
  /** Lowest number of ideas a duel ever asks for. */
  minGoal: 2,
  /** Patience lost at the first contact (it does not know you) and won back with trust: +1 per this much trust. */
  firstContactPatience: -1,
  trustPerPatience: 0.25,
  /** Lowest patience a duel ever has. */
  minPatience: 2,
  /** How much of its anger trust takes away: danger = 1 − dangerRelief × trust. */
  dangerRelief: 0.75,
  /** Share of the hold the lander stage hands over; the suit stage fills the rest. */
  naveCargoShare: 0.4,
} as const;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * The duel of a stage, built from the asteroid's own profile (`duelProfileFor`): deeper stages reach
 * harder concepts, more ideas and distractors, but the patience (the margin for mistakes) grows with
 * the trust earned in the stages before.
 */
export function stageDuelProfile(base: DuelProfile, stage: Stage, trust: number): DuelProfile {
  const t = SUBJUGATION_TUNING;
  const depth = stageIndex(stage);
  return {
    difficulty: clamp01(base.difficulty + 0.15 * depth),
    persuasionGoal: Math.max(t.minGoal, base.persuasionGoal + t.goalOffset[stage]),
    patience: Math.max(t.minPatience, base.patience + t.firstContactPatience + Math.round(clamp01(trust) / t.trustPerPatience)),
    maxBlocks: base.maxBlocks + depth,
    distractors: base.distractors || depth === 2,
    maxConcept: Math.min(10, base.maxConcept + t.conceptStep * depth) as Concept,
  };
}

/** What a stage gives when it ends well. */
export interface StageReward {
  readonly stage: Stage;
  /** The probe's scan: its composition is now known first-hand. */
  readonly scan: boolean;
  /** Share of the hold it fills (the rest of the hold for the last stage). */
  readonly cargoShare: number;
  /** The asteroid obeys: it can be a nano_net core and counts for Nevaeh's missions. */
  readonly subjugated: boolean;
}

export const STAGE_REWARD: Readonly<Record<Stage, StageReward>> = {
  sonda: { stage: "sonda", scan: true, cargoShare: 0, subjugated: false },
  nave: { stage: "nave", scan: false, cargoShare: SUBJUGATION_TUNING.naveCargoShare, subjugated: false },
  traje: { stage: "traje", scan: false, cargoShare: 1, subjugated: true },
};

/**
 * One asteroid's relationship with Doménica: how many stages it has accepted and how much it
 * trusts her. The first encounter is the most dangerous because it does not know her.
 */
export class Rapport {
  private _done = 0;
  private _trust = 0;
  private _failures = 0;

  constructor(readonly asteroidId: string) {}

  /** 0 (does not know her) .. 1 (fully trusts her). */
  get trust(): number {
    return this._trust;
  }
  /** Stages completed, 0..3. */
  get stagesDone(): number {
    return this._done;
  }
  get failures(): number {
    return this._failures;
  }
  /** The stage on offer now, or undefined once subjugated. */
  get next(): Stage | undefined {
    return STAGES[this._done];
  }
  get scanned(): boolean {
    return this._done >= 1;
  }
  /** All three stages done: it obeys. */
  get subjugated(): boolean {
    return this._done >= STAGES.length;
  }
  /** Multiplies the harm its anger does: lower as it trusts her more. */
  get danger(): number {
    return 1 - SUBJUGATION_TUNING.dangerRelief * this._trust;
  }

  /** Only the next stage is offered: stage N+1 opens after stage N succeeded here. */
  canAttempt(stage: Stage): boolean {
    return stage === this.next;
  }

  /** The duel of `stage` against this asteroid, from its base profile. */
  profile(base: DuelProfile, stage: Stage): DuelProfile {
    return stageDuelProfile(base, stage, this._trust);
  }

  succeed(stage: Stage): StageReward {
    if (!this.canAttempt(stage)) throw new Error(`Stage ${stage} is not on offer (next: ${this.next ?? "none"})`);
    this._done++;
    this._trust = clamp01(this._trust + SUBJUGATION_TUNING.trustGain[stage]);
    return STAGE_REWARD[stage];
  }

  fail(): void {
    this._failures++;
    this._trust = clamp01(this._trust - SUBJUGATION_TUNING.trustLoss);
  }
}

/** Every asteroid's rapport, created on first contact. */
export class RapportBook {
  private readonly byId = new Map<string, Rapport>();

  of(asteroidId: string): Rapport {
    let r = this.byId.get(asteroidId);
    if (!r) this.byId.set(asteroidId, (r = new Rapport(asteroidId)));
    return r;
  }

  /** Read without creating. */
  peek(asteroidId: string): Rapport | undefined {
    return this.byId.get(asteroidId);
  }

  isSubjugated(asteroidId: string): boolean {
    return this.byId.get(asteroidId)?.subjugated ?? false;
  }
}

/** Spanish labels of the stages, for in-game text. */
export const STAGE_NAME: Readonly<Record<Stage, string>> = {
  sonda: "posar la sonda",
  nave: "posar el módulo de aterrizaje",
  traje: "tumbarse sobre él con el traje",
};
