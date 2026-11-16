import type { Sourced } from "@core/units";
import { ECLSS_SOURCES as S } from "./eclss-sources";

/**
 * What one crew member takes from and gives to the cabin each day (docs/research/soporte-vital.md §1).
 * NASA's MetMan model for an 82 kg astronaut with 90 min of exercise a day, plus the ISS planning values.
 * The O₂, CO₂ and food match `CREW_DAILY` in the vehicle catalogue (a test checks it).
 */
export const CREW_BALANCE = {
  o2Kg: { value: 0.89, source: S.metman, note: "O₂ metabólico (MetMan, tabla 1)" },
  co2Kg: { value: 1.08, source: S.metman, note: "CO₂ exhalado (MetMan, tabla 1)" },
  foodPackagedKg: { value: 2.39, source: S.metman, note: "Comida envasada de la ISS (BVAD, tabla 4-53), con 0,43 kg de envase" },
  foodPackagingKg: { value: 0.43, source: S.metman, note: "Envase que se tira cada día" },
  /** Drinking water and water for rehydrating food: NASA-STD-3001's minimum (600 mL of hot water a meal). */
  drinkFoodWaterKg: { value: 2.5, source: S.waterBrief, note: "Mínimo de NASA-STD-3001 para beber y rehidratar comida" },
  /** Hygiene water: what is left of the ISS's gallon a day (3,8 L) after drinking and food. */
  hygieneWaterKg: { value: 1.3, source: S.marshall, note: "Cuenta nuestra: 3,8 L (un galón) − 2,5 L" },
  urineKg: { value: 1.4, source: S.metman, note: "Agua de orina (sección II.A)" },
  /** Sweat and breath as vapour: the cabin's heat exchanger condenses it for the water processor. */
  condensateKg: { value: 2.53, source: S.metman, note: "Vapor de sudor y respiración (MetMan, tabla 1)" },
  metabolicKj: { value: 12778, source: S.metman, note: "6288 kJ sensibles y 6134 kJ latentes" },
  /** Body mass of the reference crew member, for dehydration. Doménica is 58 kg (sustainability.ts). */
  referenceBodyKg: { value: 82, source: S.metman },
} as const satisfies Record<string, Sourced<number>>;

/** A day's flows for `crew` people, kg (and kJ). */
export interface DailyBalance {
  readonly o2Kg: number;
  readonly co2Kg: number;
  readonly foodKg: number;
  readonly packagingKg: number;
  /** Drinking, food and hygiene water used. */
  readonly waterUseKg: number;
  readonly urineKg: number;
  readonly condensateKg: number;
  readonly heatKj: number;
}

export function dailyBalance(crew: number): DailyBalance {
  const b = CREW_BALANCE;
  return {
    o2Kg: b.o2Kg.value * crew,
    co2Kg: b.co2Kg.value * crew,
    foodKg: b.foodPackagedKg.value * crew,
    packagingKg: b.foodPackagingKg.value * crew,
    waterUseKg: (b.drinkFoodWaterKg.value + b.hygieneWaterKg.value) * crew,
    urineKg: b.urineKg.value * crew,
    condensateKg: b.condensateKg.value * crew,
    heatKj: b.metabolicKj.value * crew,
  };
}

/** Metabolic heat of `crew` people, W. */
export const crewHeatW = (crew: number): number => (CREW_BALANCE.metabolicKj.value * 1000 * crew) / 86400;
