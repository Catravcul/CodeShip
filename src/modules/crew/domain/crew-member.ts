import { Health, type Patient } from "@modules/medical/domain/health";
import { isRecord, num } from "@core/snapshot";
import { CREW_ENERGY } from "@modules/life-support/domain/sustainability";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Game tuning (not measured): how fast hunger, fitness and calm fade during a long leg. Time in days. */
export const CREW_TUNING = {
  /**
   * Satiety drains a day's energy a day (1 = her daily requirement), so a meal of half of it lasts half a day:
   * hungry about twice a day (Berón, 2026-11-16: «las comidas serán 2 al día»; docs/design/vida-a-bordo.md,
   * «Ritmo de los días»). With the board day of src/core/board-time.ts that is a meal every ~12 real minutes.
   */
  satietyPerDay: 1,
  /** Below this she is hungry (the HUD says so and a notice asks her to cook). */
  hungryBelow: 0.5,
  /**
   * Share of the day's energy in one meal: a half (Berón, 2026-11-16: two meals a day). Real two-meal days
   * exist (time-restricted eating, many traditional schedules); NHANES 2007–2008 (What We Eat in America,
   * 5 420 adults) has dinner ≈ 36 % and lunch ≈ 24 % of the energy, snacks ≈ 24 % and breakfast ≈ 16 %
   * (https://mdedge.com/content/three-meal-day-pattern-still-strong-among-us-adults): folding breakfast and
   * snacks into the two, each is about a half.
   */
  mealShareOfDay: 1 / 2,
  fitnessDecayPerDay: 0.15,
  mealSatiety: 0.45,
  yogaFitness: 0.25,
  yogaCalm: 0.3,
  /** A whole workout on the exercise corner's machines: more fitness than yoga, less calm. */
  workoutFitness: 0.35,
  workoutCalm: 0.1,
  /** A sleep in a crew cabin (the station's quarters): calm, nothing else. */
  restCalm: 0.25,
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

  /** Her needs, for a saved game (docs/design/partidas.md); injuries are not kept (they heal). */
  snapshot(): { satiety: number; fitness: number; stress: number; loneliness: number; microgravityDays: number } {
    return { satiety: this._satiety, fitness: this._fitness, stress: this._stress, loneliness: this._loneliness, microgravityDays: this._microgravityDays };
  }

  restore(s: unknown): void {
    if (!isRecord(s)) return;
    this._satiety = Math.min(1.2, Math.max(0, num(s.satiety, this._satiety)));
    this._fitness = clamp01(num(s.fitness, this._fitness));
    this._stress = clamp01(num(s.stress, this._stress));
    this._loneliness = clamp01(num(s.loneliness, this._loneliness));
    this._microgravityDays = Math.max(0, num(s.microgravityDays, this._microgravityDays));
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
  /** Time to eat (CREW_TUNING.hungryBelow). */
  get hungry(): boolean {
    return this._satiety < CREW_TUNING.hungryBelow;
  }
  /** Energy of one meal for her, kcal: half of her day. */
  get mealKcal(): number {
    return this.dailyKcal * CREW_TUNING.mealShareOfDay;
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

  /** One step of a workout done; `of` = steps in the workout. */
  train(of: number): void {
    this._fitness = clamp01(this._fitness + CREW_TUNING.workoutFitness / of);
    this._stress = clamp01(this._stress - CREW_TUNING.workoutCalm / of);
  }

  /** Time spent with others (caring for animals, a class, the assembly): loneliness and stress go down. */
  keepCompany(amount: number): void {
    this._loneliness = clamp01(this._loneliness - amount);
    this._stress = clamp01(this._stress - amount / 2);
  }

  /** A night in a quiet cabin. */
  rest(): void {
    this._stress = clamp01(this._stress - CREW_TUNING.restCalm);
  }

  startle(amount: number): void {
    this._stress = clamp01(this._stress + amount);
  }
}

/** Portions of a dish that make one meal of `mealKcal`: the nearest whole number, at least one, at most the dish's. */
export function mealPortions(portionKcal: number, portions: number, mealKcal: number): number {
  if (portionKcal <= 0) return Math.max(1, Math.min(1, portions));
  return Math.max(1, Math.min(portions, Math.round(mealKcal / portionKcal)));
}
