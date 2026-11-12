import type { Sourced } from "@core/units";
import { Health, type Patient } from "@modules/medical/domain/health";
import { AnimalMind, type AnimalRule, type Stimulus } from "@modules/pets/domain/behavior";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Laying hens need 14–16 h of light a day at peak production (Merck Veterinary Manual). */
export const LAYING_LIGHT_HOURS: Sourced<readonly [number, number]> = {
  value: [14, 16],
  source: "https://www.merckvetmanual.com/poultry/nutrition-and-management-poultry/management-of-laying-chickens",
};

/**
 * Game tuning (not measured): a laying hen produces about one egg a day; feed per hen is the usual
 * order of magnitude for laying hens. The coop sits in the spinning ring, where there is gravity.
 */
export const HEN_TUNING = {
  layIntervalDays: 26 / 24,
  feedPerHenG: 110,
  satietyPerDay: 1,
  /** Above this stress a hen stops laying. */
  noLayStress: 0.5,
  stressRelaxPerDay: 0.3,
  /** Free-range hens calm down faster: room to walk, scratch and dust-bathe. */
  freeRangeRelaxPerDay: 0.6,
  ruleBreakStress: 0.8,
} as const;

/** A laying hen. Time in days. */
export class Hen implements Patient {
  readonly kind = "gallina";
  readonly health: Health;
  private _satiety = 1;
  private _stress = 0;
  private _progress = 0;
  private readonly mind = new AnimalMind();
  /** Hens are never the young ones in a family. */
  readonly young = false;

  constructor(
    readonly id: string,
    readonly name: string,
    /** A broody hen sits on her nest and can adopt chicks, or kittens and puppies, as her own. */
    public broody = false,
  ) {
    this.health = new Health(id);
  }

  get satiety(): number {
    return this._satiety;
  }
  get stress(): number {
    return Math.max(this._stress, this.health.burden);
  }
  /** Laying now: fed, calm, healthy and with enough light. */
  laying(lightHours: number): boolean {
    return this._satiety > 0.2 && this.stress < HEN_TUNING.noLayStress && lightHours >= LAYING_LIGHT_HOURS.value[0];
  }

  get rules(): readonly AnimalRule[] {
    return this.mind.rules;
  }

  /** Returns eggs laid during this tick. A broody hen stops laying while she broods. */
  tick(dtDays: number, lightHours: number, freeRange = false): number {
    const t = HEN_TUNING;
    this._satiety = clamp01(this._satiety - t.satietyPerDay * dtDays);
    this._stress = clamp01(this._stress - (freeRange ? t.freeRangeRelaxPerDay : t.stressRelaxPerDay) * dtDays);
    this.health.tick(dtDays);
    if (this.broody || !this.laying(lightHours)) return 0;
    this._progress += dtDays / t.layIntervalDays;
    const eggs = Math.floor(this._progress);
    this._progress -= eggs;
    return eggs;
  }

  feed(): void {
    this._satiety = 1;
  }
  startle(amount: number): void {
    this._stress = clamp01(this._stress + amount);
  }
  learn(rule: AnimalRule): void {
    this.mind.learn(rule);
  }
  ruleFor(stimulus: Stimulus): AnimalRule | undefined {
    return this.mind.ruleFor(stimulus, this.stress, HEN_TUNING.ruleBreakStress);
  }
}
