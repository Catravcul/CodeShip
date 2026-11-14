import { equipmentOf, wallArealDensityKgM2, type Equipment, type WhippleBumper } from "./equipment";

/**
 * Micrometeoroid and debris protection of the cabin, worked out as NASA does it: the critical diameter
 * (the largest aluminium sphere the wall stops) of a bare wall or of a Whipple shield. Sources and the
 * game rule that turns it into hull damage: docs/design/componentes.md, «Escudo contra micrometeoritos».
 */

/** Design point of the equations (NASA JSC Hypervelocity Impact Technology group). */
export const MMOD_DESIGN = {
  /** km/s: the speed where the Whipple equation's hypervelocity branch starts. */
  velocityKmS: 7,
  /** Aluminium projectile, g/cm³. */
  projectileDensityGcm3: 2.8,
  /** Aluminium 6061 for the aluminium-equivalent wall, g/cm³. */
  aluminiumDensityGcm3: 2.7,
  /** Rear-wall yield stress, ksi: the 6061-T6 wall of the handbook's example. */
  rearWallYieldKsi: 40,
} as const;

/** Bare (monolithic) wall: at 7 km/s an aluminium sphere goes through a plate four times its diameter. */
export function monolithicCriticalDiameterCm(arealDensityGcm2: number): number {
  return arealDensityGcm2 / MMOD_DESIGN.aluminiumDensityGcm3 / 4;
}

/**
 * Whipple shield, hypervelocity branch (Christiansen's equation, NASA JSC-64399 §4.2.2):
 * d_c = 3.918 · t_w^(2/3) · ρ_p^(−1/3) · ρ_b^(−1/9) · V^(−2/3) · S^(1/3) · (σ/70)^(1/3), in cm, g/cm³, km/s, ksi.
 * `rearWallCm` is the aluminium-equivalent thickness of the wall behind the bumper.
 */
export function whippleCriticalDiameterCm(rearWallCm: number, bumper: WhippleBumper): number {
  const d = MMOD_DESIGN;
  return (
    3.918 *
    rearWallCm ** (2 / 3) *
    d.projectileDensityGcm3 ** (-1 / 3) *
    bumper.densityGcm3 ** (-1 / 9) *
    d.velocityKmS ** (-2 / 3) *
    bumper.standoffCm ** (1 / 3) *
    (d.rearWallYieldKsi / 70) ** (1 / 3)
  );
}

/** Critical diameter of the fitted cabin wall with the fitted shield (if any), cm. */
export function criticalDiameterCm(list: readonly Equipment[]): number {
  const wall = equipmentOf(list, "cabina")?.wall;
  const areal = wall ? wallArealDensityKgM2(wall) / 10 : 0; // kg/m² → g/cm²
  const bare = monolithicCriticalDiameterCm(areal);
  const bumper = equipmentOf(list, "escudo")?.bumper;
  if (!bumper || areal <= 0) return bare;
  return Math.max(bare, whippleCriticalDiameterCm(areal / MMOD_DESIGN.aluminiumDensityGcm3, bumper));
}

/**
 * Game rule (valor de juego): the debris an angry asteroid throws was tuned against a bare 3.08 mm
 * Al-Li 2195 wall (the starting cabin). The damage that gets through scales with the reference
 * critical diameter over the fitted one: a wall that stops particles twice as big takes half the damage.
 */
export const DEBRIS_TUNING = {
  referenceCriticalDiameterCm: monolithicCriticalDiameterCm(((4 / 1.3) * 2.84 * 0.95) / 10),
} as const;

/** Multiplier on debris damage for what is fitted (1 = the starting cabin without shield). */
export function debrisDamageFactor(list: readonly Equipment[]): number {
  const dc = criticalDiameterCm(list);
  return dc > 0 ? DEBRIS_TUNING.referenceCriticalDiameterCm / dc : 1;
}
