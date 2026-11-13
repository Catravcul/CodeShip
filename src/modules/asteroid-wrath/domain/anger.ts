/**
 * Duel phases (see the subjugation flow): 1 the probe is parked on the asteroid, 2 the lander is
 * parked, 3 Doménica lies on it in her suit. The deeper the contact, the worse a failure hurts.
 */
export type DuelPhase = 1 | 2 | 3;

/** Anger a failed duel adds, by phase (game values). */
export const ANGER_BY_PHASE: Readonly<Record<DuelPhase, number>> = { 1: 0.45, 2: 0.75, 3: 1 };
/** Below this the asteroid is calm again and a new duel can start (game value). */
export const CALM_LEVEL = 0.05;

/**
 * How furious an asteroid is, 0..1. A failed duel raises it; it decays exponentially over game
 * time with the half-life of the asteroid's power tier, so every asteroid calms down in the end.
 */
export class Anger {
  private _level = 0;

  constructor(readonly halfLifeS: number) {
    if (!(halfLifeS > 0)) throw new RangeError("Anger needs a positive half-life");
  }

  get level(): number {
    return this._level;
  }

  get calm(): boolean {
    return this._level === 0;
  }

  /** A duel failed at `phase`: anger jumps (it never goes past 1). */
  provoke(phase: DuelPhase): void {
    this._level = Math.min(1, this._level + ANGER_BY_PHASE[phase]);
  }

  /** Set the level directly (tests and demos). */
  set(level: number): void {
    this._level = level < CALM_LEVEL ? 0 : Math.min(1, level);
  }

  /** Let game time pass. Returns true on the step it calms down. */
  tick(dtS: number): boolean {
    if (this._level === 0) return false;
    this._level *= Math.pow(0.5, dtS / this.halfLifeS);
    if (this._level < CALM_LEVEL) {
      this._level = 0;
      return true;
    }
    return false;
  }

  /** Game seconds until it is calm: half-life × log2(level / calm level). */
  get timeToCalmS(): number {
    return this._level === 0 ? 0 : this.halfLifeS * Math.log2(this._level / CALM_LEVEL);
  }
}
