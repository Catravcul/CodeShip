import { G0 } from "@core/units";
import { rpmForGravity } from "@modules/gravity/domain/spin-gravity";

/** Fresh water: 1 m³ ≈ 1 t (1000 kg/m³ at 4 °C; 997 at 25 °C, close enough for the game). */
export const waterMassT = (volumeM3: number): number => volumeM3;

export const boxVolumeM3 = (x: number, y: number, z: number): number => x * y * z;
export const sphereVolumeM3 = (diameterM: number): number => (Math.PI * diameterM ** 3) / 6;

/**
 * Water held against the outer wall of a spinning cylinder (Kalpana One's pool): a shell from the wall
 * (radius `radiusM`) inward `depthM`, `lengthM` long. The air core around the axis stays free.
 */
export function ringPoolVolumeM3(radiusM: number, depthM: number, lengthM: number): number {
  const inner = radiusM - depthM;
  return Math.PI * (radiusM * radiusM - inner * inner) * lengthM;
}

/** Areal density of a water wall, g/cm²: 1 cm of water = 1 g/cm². */
export const shieldGcm2 = (thicknessM: number): number => thicknessM * 100;

/** Spin rate that gives `g` (in g) at `radiusM`, rpm. */
export const spinRpmForG = (g: number, radiusM: number): number => rpmForGravity(g * G0, radiusM);

export interface OxygenReserve {
  readonly volumeM3: number;
  /** Dissolved oxygen now, mg/L (≈ 8 mg/L saturated at 25 °C). */
  readonly doMgL: number;
  /** Floor the fish need, mg/L (5 for good health, UF/IFAS). */
  readonly minDoMgL: number;
  readonly fishKg: number;
  /** Fish respiration, mg O₂ per kg per hour. */
  readonly mgO2PerKgH: number;
}

/**
 * Hours the dissolved oxygen above the floor lasts if aeration stops. In 0 g there is no convection and
 * no rising bubbles, so this is what a pump failure gives you before the fish suffocate.
 */
export function oxygenReserveHours(r: OxygenReserve): number {
  const usableMg = Math.max(0, r.doMgL - r.minDoMgL) * r.volumeM3 * 1000;
  const demandMgH = r.fishKg * r.mgO2PerKgH;
  if (demandMgH <= 0) return Infinity;
  return usableMg / demandMgH;
}
