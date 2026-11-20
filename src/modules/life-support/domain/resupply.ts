import { CREW_BALANCE, dailyBalance } from "../data/crew-balance";
import type { EclssMachineSpec } from "./eclss";
import { ECLSS_MODEL, nominalDriverPerDay, nominalWaterRecovery } from "./life-support";

export interface Resupply {
  readonly days: number;
  readonly crew: number;
  readonly foodKg: number;
  readonly packagingKg: number;
  /** Water lost by the loop at its nominal recovery (98 % with the BPA). */
  readonly waterLossKg: number;
  /** What the same crew would need with no recycling at all. */
  readonly waterOpenLoopKg: number;
  /** Net water to make O₂ in the OGA, after the Sabatier gives some back. */
  readonly waterForO2Kg: number;
  readonly o2LeakKg: number;
  readonly n2LeakKg: number;
  /** Expected spares (ORUs and beds) in the time, from each mode's life and what this crew wears it by; at least one of each. */
  readonly spares: readonly { readonly id: string; readonly name: string; readonly count: number }[];
}

/**
 * What a crew needs brought from home for `days` (docs/design/soporte-vital.md, «Reabastecimiento»):
 * all the food (nothing grows on a real ship yet), the water the loop loses, the gas that leaks, and spares.
 */
export function resupply(crew: number, days: number, machines: readonly EclssMachineSpec[]): Resupply {
  const day = dailyBalance(crew);
  const m = ECLSS_MODEL;
  const recovery = nominalWaterRecovery({ bpa: true });
  const o2 = day.o2Kg;
  const sabatier = o2 * m.h2PerO2.value * m.sabatierWaterPerH2.value;
  const leakAir = m.airLeakKgPerCrewDay.value * crew;
  return {
    days,
    crew,
    foodKg: day.foodKg * days,
    packagingKg: CREW_BALANCE.foodPackagingKg.value * crew * days,
    waterLossKg: day.waterUseKg * (1 - recovery) * days,
    waterOpenLoopKg: day.waterUseKg * days,
    waterForO2Kg: Math.max(0, o2 * m.waterPerO2.value - sabatier) * days,
    o2LeakKg: leakAir * 0.21 * days,
    n2LeakKg: leakAir * 0.79 * days,
    spares: machines.flatMap((s) => s.failures.map((f) => ({ id: f.spare.id, name: f.spare.name, count: Math.max(1, Math.ceil((days * nominalDriverPerDay(f.wear, crew)) / f.wear.life)) }))),
  };
}
