import type { AsteroidData } from "@modules/celestial/domain/asteroid";
import { extractToCargo, resourceRichness } from "@modules/celestial/domain/resources";

/** A load of an asteroid's own rock, split by its real composition (SBDB / OSIRIS-REx data). */
export type Package = readonly { readonly material: string; readonly kg: number }[];

/**
 * What a subjugated asteroid hands over at each level (labelled game values). Everything scales with
 * the asteroid: its mass (cube root, so a 2,4 km member gives about five times Bennu) and how rich its
 * known composition is (`resourceRichness`, 0..1). That is the business: a subjugated asteroid is
 * worth a lot more than a full hold.
 */
export const YIELD_TUNING = {
  /** Reference body for the scale: Bennu, 7.329×10¹⁰ kg. */
  referenceMassKg: 7.329e10,
  /** Floor of the richness factor, so a poor asteroid still pays: factor = floor + richness. */
  richnessFloor: 0.5,
  /** Level 2: one package to the travel ship per this many game days. */
  shipIntervalDays: 1,
  /** Level 2: package of a Bennu-sized body with factor 1, kg (the lander's hold is 500 kg). */
  shipPackageKg: 250,
  /** Level 3: one package to the station per this many game days. */
  stationIntervalDays: 1,
  /** Level 3: package of a Bennu-sized body with factor 1, kg. */
  stationPackageKg: 1000,
  /** Level 4: rock the station's crews and the asteroid itself free per game hour, Bennu-sized, factor 1, kg. */
  extractKgPerHour: 500,
} as const;

/** Mass factor: 1 for Bennu, ∛(M / M_Bennu) for the rest. */
export function massScale(massKg: number): number {
  return Math.cbrt(Math.max(massKg, 0) / YIELD_TUNING.referenceMassKg);
}

/** How much more (or less) than the reference this asteroid yields. */
export function yieldScale(data: AsteroidData): number {
  return massScale(data.massKg.value) * (YIELD_TUNING.richnessFloor + resourceRichness(data.composition));
}

/** Level 2: the package it sends to the travel ship each interval. */
export function shipPackage(data: AsteroidData): Package {
  return extractToCargo(data.composition, YIELD_TUNING.shipPackageKg * yieldScale(data));
}

/** Level 3: the package it sends to the station each interval. */
export function stationPackage(data: AsteroidData): Package {
  return extractToCargo(data.composition, YIELD_TUNING.stationPackageKg * yieldScale(data));
}

/** Level 4: kg per game hour the station gets once it is parked there. */
export function extractionRateKgPerHour(data: AsteroidData): number {
  return YIELD_TUNING.extractKgPerHour * yieldScale(data);
}

export const packageKg = (p: Package): number => p.reduce((s, c) => s + c.kg, 0);

/**
 * Level 4: the whole body, parked at the station, handed over bit by bit until nothing is left. Its
 * real mass is what there is to take (Bennu: 7.3×10¹⁰ kg, ages at the game rate).
 */
export class FullExtraction {
  private _takenKg = 0;
  private carryKg = 0;

  constructor(
    readonly data: AsteroidData,
    /** Hand over in lots of at least this much, kg (fewer, tidier deliveries). */
    readonly lotKg = 1000,
  ) {}

  get totalKg(): number {
    return this.data.massKg.value;
  }
  get takenKg(): number {
    return this._takenKg;
  }
  get remainingKg(): number {
    return Math.max(0, this.totalKg - this._takenKg);
  }
  get done(): boolean {
    return this.remainingKg <= 1e-6;
  }
  get rateKgPerHour(): number {
    return extractionRateKgPerHour(this.data);
  }

  /** Let `hours` of game time pass; returns a lot when enough rock is free (else undefined). */
  step(hours: number): Package | undefined {
    if (this.done || hours <= 0) return undefined;
    this.carryKg += this.rateKgPerHour * hours;
    if (this.carryKg < this.lotKg && this.carryKg < this.remainingKg) return undefined;
    const kg = Math.min(this.carryKg, this.remainingKg);
    this.carryKg = 0;
    this._takenKg += kg;
    return extractToCargo(this.data.composition, kg);
  }
}
