import type { Sourced } from "@core/units";
import type { Reality } from "@core/reality";
import { CREW_BALANCE } from "./crew-balance";
import type { OpenLoopConfig } from "../domain/open-loop";

/**
 * The Apollo LM's environmental control system (ECS) as the lander's own life support
 * (docs/design/modulo-lunar-juventas.md, «Soporte vital»). Real stocks with their source; what is derived
 * or estimated says so. Checked 2026-11-16.
 */
export const LM_ECS_SRC = {
  ecs: "https://ntrs.nasa.gov/api/citations/19720013195/downloads/19720013195.pdf",
  lm: "https://en.wikipedia.org/wiki/Apollo_Lunar_Module",
  lioh: "https://dashboard.si.edu/object/cartridge-lithium-hydroxide-canister-lunar-module:nasm_A20020434000",
} as const;

interface EcsFact extends Sourced<number> {
  readonly reality: Reality;
}
const f = (value: number, source: string, note: string, reality: Reality = "real"): EcsFact => ({ value, source, note, reality });

const LB = 0.45359237;
/** O₂ of the cabin at 33 kPa (100 % oxygen) in its 6,7 m³, at 22 °C: what refilling it after an EVA takes. Derived. */
const REPRESS_KG = (33000 * 6.7 * 0.031998) / (8.314462618 * 295.15);
/** Water's heat of sublimation, J/kg (≈2,83 MJ/kg): the sublimator boils ice off to space to carry heat. */
const SUBLIMATION_J_PER_KG = 2.83e6;

export const LM_ECS = {
  descentO2Kg: f(48 * LB, LM_ECS_SRC.ecs, "Tanque de O₂ de descenso de unas 48 lb a 3000 psi (informe de experiencia del ECS del LM)"),
  ascentO2Kg: f(2 * 2.4 * LB, LM_ECS_SRC.ecs, "Dos tanques de ascenso a 900 psi; el texto escaneado da «2,_ lb» cada uno: se toman 2,4 lb", "licencia"),
  descentWaterKg: f(332 * LB, LM_ECS_SRC.ecs, "Tanque de agua de descenso de 332 lb (151 kg en la Wikipedia)"),
  ascentWaterKg: f(2 * 42 * LB, LM_ECS_SRC.ecs, "Dos tanques de ascenso de 42 lb (2 × 19,3 kg)"),
  cartridgeKg: f(1.2, LM_ECS_SRC.lioh, "Cartucho de LiOH del LM: 1,2 kg y 28,6 × 18,7 cm (Smithsonian)"),
  co2PerCartridgeKg: f(0.9 * (44.01 / (2 * 23.95)), LM_ECS_SRC.lioh, "Estimación: 0,9 kg de LiOH en el cartucho × 0,92 kg de CO₂ por kg (2 LiOH + CO₂ → Li₂CO₃ + H₂O)", "licencia"),
  enduranceH: f(75, LM_ECS_SRC.lm, "Consumibles (baterías, agua y O₂) para 48 h; 75 h en el LM extendido de Apolo 15–17"),
  batteryWh: f((5 * 415 + 2 * 296) * 30, LM_ECS_SRC.lm, "Apolo 15–17: cinco baterías de descenso de 415 Ah y dos de ascenso de 296 Ah, a 28–32 V (30 V)"),
  habitableM3: f(4.5, LM_ECS_SRC.lm, "Volumen habitable (160 ft³)"),
  repressO2Kg: f(REPRESS_KG, LM_ECS_SRC.lm, "Derivado: 6,7 m³ de O₂ puro a 33 kPa y 22 °C (gas ideal)"),
} as const;

/** Average load that empties the Apollo 15–17 batteries in the 75 h they were sized for, W. Derived. */
export const LM_LOAD_W = LM_ECS.batteryWh.value / LM_ECS.enduranceH.value;

/**
 * Water the sublimator boils off per hour to carry away the electric load and two crew's heat, kg/h.
 * Derived: (load + 2 × 116 W) / 2,83 MJ/kg. Check: with drinking, the 189 kg last about the 75 h.
 */
export const LM_SUBLIMATOR_KG_PER_H = ((LM_LOAD_W + (2 * CREW_BALANCE.metabolicKj.value * 1000) / 86400) * 3600) / SUBLIMATION_J_PER_KG;

/** LiOH cartridges aboard: enough for two people over the 75 h, plus the one in the canister. Derived. */
export const LM_CARTRIDGES = Math.ceil((2 * CREW_BALANCE.co2Kg.value * (LM_ECS.enduranceH.value / 24)) / LM_ECS.co2PerCartridgeKg.value) + 1;

/** The LM as the host of its open-loop life support, with Doménica alone aboard. */
export const LM_LIFE_SUPPORT: OpenLoopConfig = {
  crew: 1,
  freeAirM3: LM_ECS.habitableM3.value,
  o2Kg: LM_ECS.descentO2Kg.value + LM_ECS.ascentO2Kg.value,
  cartridges: LM_CARTRIDGES,
  co2PerCartridgeKg: LM_ECS.co2PerCartridgeKg.value,
  waterKg: LM_ECS.descentWaterKg.value + LM_ECS.ascentWaterKg.value,
  sublimatorKgPerH: LM_SUBLIMATOR_KG_PER_H,
  batteryWh: LM_ECS.batteryWh.value,
  loadW: LM_LOAD_W,
  repressO2Kg: LM_ECS.repressO2Kg.value,
};
