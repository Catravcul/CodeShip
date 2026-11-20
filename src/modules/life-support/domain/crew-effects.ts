import type { Sourced } from "@core/units";
import { CREW_BALANCE } from "../data/crew-balance";
import { ECLSS_SOURCES as S, GAME_VALUE } from "../data/eclss-sources";
import { O2_LIMITS } from "./life-support";

/** Thresholds for what the cabin does to the crew (docs/research/soporte-vital.md §1). */
export const HEALTH_THRESHOLDS = {
  headacheMmHg: { value: 2.8, source: S.co2Brief, note: "Dolores de cabeza referidos entre 2,8 y 4,5 mmHg" },
  fatigueMmHg: { value: 4.5, source: S.co2Brief, note: "Fatiga, malestar, menos sueño y náuseas por encima de 4,5 mmHg" },
  hypoxiaKPa: O2_LIMITS.lowKPa,
  dehydrationShare: { value: 0.025, source: S.waterBrief, note: "Perder el 2,5 % del peso en agua empeora decisiones y concentración" },
  heatC: { value: 27, source: S.atcs, note: GAME_VALUE + ": la fuente da los lazos de agua (4 y 17 °C), no el confort de la cabina" },
} as const satisfies Record<string, Sourced<number>>;

export interface Symptom {
  readonly id: "dolor-cabeza-co2" | "fatiga-co2" | "hipoxia" | "deshidratacion" | "calor";
  readonly name: string;
  readonly why: string;
  readonly source: string;
}

export interface CabinAir {
  readonly ppCO2MmHg: number;
  readonly ppO2KPa: number;
  readonly cabinC: number;
}

const fmt = (v: number, d = 1) => v.toFixed(d).replace(".", ",");

/** What she feels in this air with this water deficit (kg) and body mass (kg). */
export function symptomsFor(air: CabinAir, deficitKg: number, bodyKg: number): Symptom[] {
  const t = HEALTH_THRESHOLDS;
  const out: Symptom[] = [];
  if (air.ppCO2MmHg > t.fatigueMmHg.value) out.push({ id: "fatiga-co2", name: "Cansancio y náuseas", why: `CO₂ a ${fmt(air.ppCO2MmHg)} mmHg`, source: t.fatigueMmHg.source });
  else if (air.ppCO2MmHg >= t.headacheMmHg.value) out.push({ id: "dolor-cabeza-co2", name: "Dolor de cabeza", why: `CO₂ a ${fmt(air.ppCO2MmHg)} mmHg`, source: t.headacheMmHg.source });
  if (air.ppO2KPa < t.hypoxiaKPa.value) out.push({ id: "hipoxia", name: "Hipoxia", why: `O₂ a ${fmt(air.ppO2KPa)} kPa`, source: t.hypoxiaKPa.source });
  if (deficitKg / bodyKg >= t.dehydrationShare.value) out.push({ id: "deshidratacion", name: "Deshidratación", why: `Le faltan ${fmt(deficitKg)} L de agua`, source: t.dehydrationShare.source });
  if (air.cabinC > t.heatC.value) out.push({ id: "calor", name: "Calor", why: `Cabina a ${fmt(air.cabinC, 0)} °C`, source: t.heatC.source });
  return out;
}

/**
 * Doménica's exposure to her cabin: her water deficit grows when there is nothing to drink and goes
 * when there is. Her symptoms cost a try in the challenges (CO₂ and dehydration both hurt concentration).
 */
export class CrewExposure {
  private deficit = 0;

  constructor(readonly bodyKg: number) {}

  get deficitKg(): number {
    return this.deficit;
  }

  update(hours: number, cabin: CabinAir & { readonly waterKg: number }): void {
    const need = CREW_BALANCE.drinkFoodWaterKg.value * (hours / 24);
    this.deficit = cabin.waterKg > 0 ? 0 : this.deficit + need;
  }

  symptoms(air: CabinAir): Symptom[] {
    return symptomsFor(air, this.deficit, this.bodyKg);
  }

  /** Tries taken off a challenge while she feels ill (game value: one). */
  mistakePenalty(air: CabinAir): number {
    return this.symptoms(air).length > 0 ? 1 : 0;
  }
}
