import type { PlantSpecies } from "./species";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Game tuning, not measured data: how fast the substrate dries, how a dry pot hurts the plant and
 * how much encouragement speeds growth. Talking to plants is game fiction (see docs/design/vida-a-bordo.md).
 */
export const PLANT_TUNING = {
  waterPerDay: 0.5,
  dryBelow: 0.15,
  dryDamagePerDay: 0.25,
  recoveryPerDay: 0.1,
  moodDecayPerDay: 0.1,
  /** Growth multiplier ranges from (1 - moodEffect) at mood 0 to (1 + moodEffect) at mood 1. */
  moodEffect: 0.15,
  newForDays: 3,
} as const;

export interface PlantEnvironment {
  /** Grow lights on. Veggie used red, blue and green LEDs. */
  readonly lit: boolean;
}

export interface Harvest {
  readonly plantId: string;
  /** Food portions for the crew; 0 when fruit never set. */
  readonly portions: number;
}

/** A plant in a pot on board. Time is in days. */
export class Plant {
  private _age = 0;
  private _development = 0;
  private _water = 1;
  private _health = 1;
  private _mood = 0.5;
  private _shaken = false;
  private _harvests = 0;

  constructor(
    readonly id: string,
    readonly species: PlantSpecies,
  ) {}

  get ageDays(): number {
    return this._age;
  }
  /** Growth days actually achieved (slower than age when the plant is stressed). */
  get developmentDays(): number {
    return this._development;
  }
  get water(): number {
    return this._water;
  }
  get health(): number {
    return this._health;
  }
  get mood(): number {
    return this._mood;
  }
  get alive(): boolean {
    return this._health > 0;
  }
  get isNew(): boolean {
    return this._age < PLANT_TUNING.newForDays;
  }
  get finished(): boolean {
    return this._harvests >= this.species.harvestDays.value.length;
  }
  get readyToHarvest(): boolean {
    const next = this.species.harvestDays.value[this._harvests];
    return this.alive && next !== undefined && this._development >= next;
  }

  tick(dtDays: number, env: PlantEnvironment): void {
    if (!this.alive || dtDays <= 0) return;
    const t = PLANT_TUNING;
    this._age += dtDays;
    this._water = clamp01(this._water - t.waterPerDay * dtDays);
    if (this._water < t.dryBelow) this._health = clamp01(this._health - t.dryDamagePerDay * dtDays);
    else this._health = clamp01(this._health + t.recoveryPerDay * dtDays);
    // Mood relaxes toward neutral (0.5), where growth matches the real experiment.
    const toNeutral = 0.5 - this._mood;
    this._mood += Math.sign(toNeutral) * Math.min(Math.abs(toNeutral), t.moodDecayPerDay * dtDays);
    if (!this.alive || !env.lit) return;
    const moodFactor = 1 - t.moodEffect + 2 * t.moodEffect * this._mood;
    this._development += dtDays * this._health * moodFactor;
  }

  waterIt(): void {
    this._water = 1;
  }

  /** Agitate the plant so its flowers self-pollinate. */
  shake(): void {
    this._shaken = true;
  }

  /** Talking to the plant's mind. Positive raises its mood, negative lowers it. */
  encourage(amount: number): void {
    this._mood = clamp01(this._mood + amount);
  }

  bite(severity: number): void {
    this._health = clamp01(this._health - severity);
  }

  harvest(): Harvest {
    if (!this.readyToHarvest) throw new Error(`${this.id} is not ready to harvest`);
    this._harvests++;
    const fruitSet = !this.species.needsShaking.value || this._shaken;
    const portions = fruitSet ? (this._health >= 0.5 ? 2 : 1) : 0;
    return { plantId: this.id, portions };
  }
}
