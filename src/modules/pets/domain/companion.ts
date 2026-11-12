import { Health, type Patient } from "@modules/medical/domain/health";
import { AnimalMind, type AnimalRule, type Stimulus } from "./behavior";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Game tuning (not measured): how fast needs empty and how stress follows them. Shared by cats and dogs. */
export const CAT_TUNING = {
  playDecayPerDay: 0.8,
  affectionDecayPerDay: 0.5,
  stressFollowPerDay: 1.5,
  needLowAt: 0.6,
  missingResourcesStress: 0.35,
  /** Above this stress an animal follows instinct and ignores its programmed rules. */
  ruleBreakStress: 0.8,
} as const;

export interface CompanionContext {
  /** One litter box, bowl, bed and scratching post per cat plus one (AAFP Pillar 2). */
  readonly resourcesOk: boolean;
}

/** A pet on board (cat or dog). Time in days. Needs are 0 (empty) .. 1 (fully met). */
export abstract class Companion implements Patient {
  abstract readonly kind: "gato" | "perro";
  readonly health: Health;
  private _satiety = 1;
  private _play = 1;
  private _affection = 1;
  private _stress = 0;
  private readonly mind = new AnimalMind();

  constructor(
    readonly id: string,
    readonly name: string,
    readonly massKg: number,
  ) {
    this.health = new Health(id);
  }

  /** Daily maintenance energy, kcal. */
  abstract get dailyKcal(): number;
  /** A kitten or a puppy: what a broody hen or a calm adult may adopt. */
  abstract get young(): boolean;

  get satiety(): number {
    return this._satiety;
  }
  get play(): number {
    return this._play;
  }
  get affection(): number {
    return this._affection;
  }
  /** Pain counts as stress: an injured animal is never calm. */
  get stress(): number {
    return Math.max(this._stress, this.health.burden);
  }
  get wellbeing(): number {
    return 1 - this.stress;
  }
  get rules(): readonly AnimalRule[] {
    return this.mind.rules;
  }

  tick(dtDays: number, ctx: CompanionContext): void {
    const t = CAT_TUNING;
    this._satiety = clamp01(this._satiety - dtDays);
    this._play = clamp01(this._play - t.playDecayPerDay * dtDays);
    this._affection = clamp01(this._affection - t.affectionDecayPerDay * dtDays);
    // A need only worries the animal once it drops below `needLowAt`.
    const lack = (need: number) => Math.max(0, t.needLowAt - need) / t.needLowAt;
    const unmet = 0.45 * lack(this._satiety) + 0.3 * lack(this._play) + 0.25 * lack(this._affection);
    const target = clamp01(unmet + (ctx.resourcesOk ? 0 : t.missingResourcesStress));
    const step = Math.min(1, t.stressFollowPerDay * dtDays);
    this._stress = clamp01(this._stress + (target - this._stress) * step);
    this.health.tick(dtDays);
  }

  feed(kcal: number): void {
    this._satiety = Math.min(1.2, this._satiety + kcal / this.dailyKcal);
  }
  playWith(): void {
    this._play = 1;
  }
  pet(): void {
    this._affection = 1;
  }
  startle(amount: number): void {
    this._stress = clamp01(this._stress + amount);
  }

  /** A rule written into the animal's mind by talking to it. Replaces any rule for the same stimulus. */
  learn(rule: AnimalRule): void {
    this.mind.learn(rule);
  }
  ruleFor(stimulus: Stimulus): AnimalRule | undefined {
    return this.mind.ruleFor(stimulus, this.stress, CAT_TUNING.ruleBreakStress);
  }
}
