import type { PlantSpecies } from "./species";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Game tuning, not measured data: how fast the substrate dries, how a dry pot hurts the plant and
 * how much tending heals it. Growth days themselves come from the species data.
 */
export const PLANT_TUNING = {
  waterPerDay: 0.5,
  dryBelow: 0.15,
  dryDamagePerDay: 0.25,
  recoveryPerDay: 0.1,
  tendHeal: 0.4,
  /** Chile flowers from this fraction of its first harvest day (tuning; PH-04 gives no flowering day). */
  floweringAt: 0.5,
  newForDays: 3,
  /** Growing area of one pot on the racks, m² (tuning: one hydroponic cell). */
  potAreaM2: 0.25,
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

/**
 * A plant in a pot on board, or a whole bed of one crop on the farm deck (`areaM2` larger, watered
 * by drip lines). Time is in days.
 */
export class Plant {
  private _age = 0;
  private _development = 0;
  private _water = 1;
  private _health = 1;
  private _shaken = false;
  private _harvests = 0;

  constructor(
    readonly id: string,
    readonly species: PlantSpecies,
    readonly areaM2: number = PLANT_TUNING.potAreaM2,
    /** Drip irrigation on the farm deck's soil: never dries out. */
    readonly autoWatered = false,
  ) {}

  /** A farm-deck bed (or a tree's planter) rather than a pot on the racks. */
  get isBed(): boolean {
    return this.areaM2 > PLANT_TUNING.potAreaM2;
  }
  /** A fruit tree in a planter on the farm deck. */
  get isTree(): boolean {
    return this.species.form === "arbol";
  }

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
  get shaken(): boolean {
    return this._shaken;
  }
  /** Flowering: the moment to shake a plant that needs it. */
  get flowering(): boolean {
    const first = this.species.harvestDays.value[0] ?? Infinity;
    return this.species.needsShaking.value && this._development >= first * PLANT_TUNING.floweringAt && this._harvests === 0;
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
    this._water = this.autoWatered ? 1 : clamp01(this._water - t.waterPerDay * dtDays);
    if (this._water < t.dryBelow) this._health = clamp01(this._health - t.dryDamagePerDay * dtDays);
    else this._health = clamp01(this._health + t.recoveryPerDay * dtDays);
    if (!this.alive || !env.lit) return;
    this._development += dtDays * this._health;
  }

  waterIt(): void {
    this._water = 1;
  }

  /** Agitate the plant so its flowers self-pollinate. */
  shake(): void {
    this._shaken = true;
  }

  /** Prune damaged leaves, secure the pot: heals part of the damage. */
  tend(): void {
    if (this.alive) this._health = clamp01(this._health + PLANT_TUNING.tendHeal);
  }

  /** Bitten by a cat, knocked over by a jolt… */
  damage(severity: number): void {
    this._health = clamp01(this._health - severity);
  }

  harvest(): Harvest {
    if (!this.readyToHarvest) throw new Error(`${this.id} is not ready to harvest`);
    this._harvests++;
    const fruitSet = !this.species.needsShaking.value || this._shaken;
    if (!fruitSet) return { plantId: this.id, portions: 0 };
    const y = this.species.edibleYield?.value;
    if (y) {
      // The measured yield, split over the harvests; a weak plant gives half.
      const grams = (y.gPerM2 * this.areaM2) / this.species.harvestDays.value.length;
      const portions = Math.max(1, Math.round((grams * (this._health >= 0.5 ? 1 : 0.5)) / y.portionG));
      return { plantId: this.id, portions };
    }
    const perPot = this._health >= 0.5 ? 2 : 1;
    const portions = perPot * Math.max(1, Math.round(this.areaM2 / PLANT_TUNING.potAreaM2));
    return { plantId: this.id, portions };
  }
}
