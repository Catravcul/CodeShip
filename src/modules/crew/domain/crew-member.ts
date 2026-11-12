import { Health, type Patient } from "@modules/medical/domain/health";
import { CREW_ENERGY } from "@modules/life-support/domain/sustainability";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Game tuning (not measured): how fast hunger, fitness and calm fade during a long leg. Time in days. */
export const CREW_TUNING = {
  satietyPerDay: 1,
  fitnessDecayPerDay: 0.15,
  mealSatiety: 0.45,
  yogaFitness: 0.25,
  yogaCalm: 0.3,
  /** Years away from her family: loneliness slowly builds up… */
  isolationStressPerDay: 0.03,
  /** …and animal families on board calm her (see ANIMAL_COMPANY in the family module). */
  companyCalmPerDay: 0.25,
  /**
   * Extra fitness lost per day at 0 g (scaled down linearly toward 1 g). Kept small: in real
   * microgravity bones lose 1–1.5 % of their density a month (MICROGRAVITY_BONE_LOSS); the game
   * only nudges the crew to spend time in the ring and do yoga.
   */
  microgravityFitnessPerDay: 0.05,
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
  private _loneliness = 0;
  private _microgravityDays = 0;

  constructor(
    readonly name: string,
    readonly id = "tripulante",
    /** Age (years), mass (kg) and height (m), for the energy requirement. Tuning defaults. */
    readonly body = { age: 30, massKg: 58, heightM: 1.6 },
  ) {
    this.health = new Health(id);
  }

  /** Daily energy requirement, kcal (NASA exploration equation, low active, with exercise). */
  get dailyKcal(): number {
    return CREW_ENERGY.value(this.body.age, this.body.massKg, this.body.heightM);
  }

  get satiety(): number {
    return this._satiety;
  }
  get fitness(): number {
    return this._fitness;
  }
  /** Missing her family, years away: meals and yoga do not touch it, animal company does. */
  get loneliness(): number {
    return this._loneliness;
  }
  /** Days spent below 0.1 g (hub, spine and cockpit). */
  get microgravityDays(): number {
    return this._microgravityDays;
  }
  get stress(): number {
    return clamp01(Math.max(this._stress, this.health.burden) + 0.5 * this._loneliness);
  }
  /** 0..1 summary for the HUD, lowered by injuries. */
  get wellbeing(): number {
    return clamp01(0.4 * Math.min(1, this._satiety) + 0.3 * this._fitness + 0.3 * (1 - this._stress) - 0.5 * this.health.burden);
  }

  /**
   * `company` 0..1: how much the animal families keep her company. Left out (tests, other crews),
   * loneliness is not simulated. `gravityG`: what she feels where she is (1 on the ring floor, 0 in
   * the hub or the cockpit); left out, no microgravity effect.
   */
  tick(dtDays: number, company?: number, gravityG?: number): void {
    const t = CREW_TUNING;
    if (company !== undefined) this._loneliness = clamp01(this._loneliness + (t.isolationStressPerDay * (1 - company) - t.companyCalmPerDay * company) * dtDays);
    this._satiety = clamp01(this._satiety - t.satietyPerDay * dtDays);
    this._fitness = clamp01(this._fitness - t.fitnessDecayPerDay * dtDays);
    if (gravityG !== undefined) {
      this._fitness = clamp01(this._fitness - t.microgravityFitnessPerDay * (1 - clamp01(gravityG)) * dtDays);
      if (gravityG < 0.1) this._microgravityDays += dtDays;
    }
    if (this._satiety < 0.3) this._stress = clamp01(this._stress + 0.3 * dtDays);
    this.health.tick(dtDays);
  }

  eat(portions = 1): void {
    this._satiety = Math.min(1.2, this._satiety + CREW_TUNING.mealSatiety * portions);
    this._stress = clamp01(this._stress - 0.05);
  }

  /** Eat a plate with this much energy: a day's requirement fills satiety from 0 to 1 (it drains 1 a day). */
  eatKcal(kcal: number): void {
    this._satiety = Math.min(1.2, this._satiety + kcal / this.dailyKcal);
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
