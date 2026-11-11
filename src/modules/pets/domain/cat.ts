import type { Sourced } from "@core/units";
import type { CatRule } from "./behavior";
import { Health, type Patient } from "@modules/medical/domain/health";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export type LifeStage = "kitten" | "neutered-adult" | "intact-adult";

/** Resting energy requirement, kcal/day: RER = 70 · kg^0.75 (same equation for cats and dogs). */
export const RER: Sourced<(kg: number) => number> = {
  value: (kg) => 70 * kg ** 0.75,
  source: "https://petnutritionalliance.org/wp-content/uploads/2023/03/MER.RER_.PNA_.pdf",
};

/** Maintenance energy factor × RER. Estimates; individuals vary up to 50 %. Kitten uses the middle of 2–3. */
export const MER_FACTOR: Sourced<Record<LifeStage, number>> = {
  value: { kitten: 2.5, "neutered-adult": 1.2, "intact-adult": 1.4 },
  source: "https://petnutritionalliance.org/wp-content/uploads/2023/03/MER.RER_.PNA_.pdf",
};

/**
 * Cats are obligate carnivores: they need nutrients found in animal tissue (taurine, arachidonic acid,
 * preformed vitamin A), so on board they eat cultured meat or stored cat food, never the crops.
 */
export const OBLIGATE_CARNIVORE: Sourced<true> = {
  value: true,
  source: "https://www.merckvetmanual.com/management-and-nutrition/nutrition-small-animals/nutritional-requirements-of-small-animals",
};

/** Energy density used to turn kcal into grams. Raw chicken breast ≈ 120 kcal/100 g (USDA); dry cat food ≈ 3.8 kcal/g (typical label). */
export const FOOD_KCAL_PER_G: Sourced<{ meat: number; kibble: number }> = {
  value: { meat: 1.2, kibble: 3.8 },
  source: "https://fdc.nal.usda.gov/",
  note: "Cultured meat is grown from chicken cells; kibble value is a typical label figure.",
};

/** Game tuning (not measured): how fast needs empty and how stress follows them. */
export const CAT_TUNING = {
  playDecayPerDay: 0.8,
  affectionDecayPerDay: 0.5,
  stressFollowPerDay: 1.5,
  needLowAt: 0.6,
  missingResourcesStress: 0.35,
  /** Above this stress a cat follows instinct and ignores its programmed rules. */
  ruleBreakStress: 0.8,
} as const;

export interface CatContext {
  /** One litter box, bowl, bed and scratching post per cat plus one (AAFP Pillar 2). */
  readonly resourcesOk: boolean;
}

/** A cat on board. Time in days. Needs are 0 (empty) .. 1 (fully met). */
export class Cat implements Patient {
  readonly kind = "gato";
  readonly health: Health;
  private _satiety = 1;
  private _play = 1;
  private _affection = 1;
  private _stress = 0;
  private readonly _rules = new Map<string, CatRule>();

  constructor(
    readonly id: string,
    readonly name: string,
    readonly massKg: number,
    readonly lifeStage: LifeStage = "neutered-adult",
  ) {
    this.health = new Health(id);
  }

  /** Daily maintenance energy, kcal. */
  get dailyKcal(): number {
    return MER_FACTOR.value[this.lifeStage] * RER.value(this.massKg);
  }
  get satiety(): number {
    return this._satiety;
  }
  get play(): number {
    return this._play;
  }
  get affection(): number {
    return this._affection;
  }
  /** Pain counts as stress: an injured cat is never calm. */
  get stress(): number {
    return Math.max(this._stress, this.health.burden);
  }
  get wellbeing(): number {
    return 1 - this.stress;
  }
  get rules(): readonly CatRule[] {
    return [...this._rules.values()];
  }

  tick(dtDays: number, ctx: CatContext): void {
    const t = CAT_TUNING;
    this._satiety = clamp01(this._satiety - dtDays);
    this._play = clamp01(this._play - t.playDecayPerDay * dtDays);
    this._affection = clamp01(this._affection - t.affectionDecayPerDay * dtDays);
    // A need only worries the cat once it drops below `needLowAt`.
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

  /** A rule written into the cat's mind by talking to it. Replaces any rule for the same stimulus. */
  learn(rule: CatRule): void {
    for (const [id, r] of this._rules) if (r.when === rule.when) this._rules.delete(id);
    this._rules.set(rule.id, rule);
  }
  ruleFor(stimulus: CatRule["when"]): CatRule | undefined {
    if (this.stress >= CAT_TUNING.ruleBreakStress) return undefined;
    return [...this._rules.values()].find((r) => r.when === stimulus);
  }
}
