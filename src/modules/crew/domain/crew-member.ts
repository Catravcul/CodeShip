import { Health, type Patient } from "@modules/medical/domain/health";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Game tuning (not measured): how fast hunger, fitness and calm fade during a long leg. Time in days. */
export const CREW_TUNING = {
  satietyPerDay: 1,
  fitnessDecayPerDay: 0.15,
  mealSatiety: 0.45,
  yogaFitness: 0.25,
  yogaCalm: 0.3,
} as const;

/**
 * The player's character on board. Kept deliberately small: the full body/mind model lives in
 * Cold Sanctuary and can be shared later (docs/design/vida-a-bordo.md).
 */
export class CrewMember implements Patient {
  readonly kind = "humano";
  readonly health: Health;
  private _satiety = 0.8;
  private _fitness = 0.5;
  private _stress = 0.2;

  constructor(
    readonly name: string,
    readonly id = "tripulante",
  ) {
    this.health = new Health(id);
  }

  get satiety(): number {
    return this._satiety;
  }
  get fitness(): number {
    return this._fitness;
  }
  get stress(): number {
    return Math.max(this._stress, this.health.burden);
  }
  /** 0..1 summary for the HUD, lowered by injuries. */
  get wellbeing(): number {
    return clamp01(0.4 * Math.min(1, this._satiety) + 0.3 * this._fitness + 0.3 * (1 - this._stress) - 0.5 * this.health.burden);
  }

  tick(dtDays: number): void {
    const t = CREW_TUNING;
    this._satiety = clamp01(this._satiety - t.satietyPerDay * dtDays);
    this._fitness = clamp01(this._fitness - t.fitnessDecayPerDay * dtDays);
    if (this._satiety < 0.3) this._stress = clamp01(this._stress + 0.3 * dtDays);
    this.health.tick(dtDays);
  }

  eat(portions = 1): void {
    this._satiety = Math.min(1.2, this._satiety + CREW_TUNING.mealSatiety * portions);
    this._stress = clamp01(this._stress - 0.05);
  }

  /** One posture of a yoga sequence completed; `of` = postures in the sequence. */
  practice(of: number): void {
    this._fitness = clamp01(this._fitness + CREW_TUNING.yogaFitness / of);
    this._stress = clamp01(this._stress - CREW_TUNING.yogaCalm / of);
  }

  startle(amount: number): void {
    this._stress = clamp01(this._stress + amount);
  }
}
