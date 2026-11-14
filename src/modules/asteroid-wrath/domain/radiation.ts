import { relativeDose, type ShieldMaterial } from "@modules/mothership/domain/equipment";

/**
 * Directed radiation from an asteroid that controls its atoms (tier 4 and up). Game licence: the
 * pulse and its strength are invented; what stops it is not. The dose behind a shield uses the
 * same curves as the mothership's cosmic-ray shield (Naito & Kodaira 2022), the only dose model
 * in the game with sources. See docs/design/poderes-ira.md.
 */
export const PULSE = {
  /** Dose of one pulse at the asteroid's surface at full anger, mSv (game value). */
  surfaceDoseMSv: 400,
  /** A pulse every this many throws (game value). */
  everyThrows: 3,
} as const;

/** Unshielded dose of one pulse at `distanceFromCentreM`: it spreads with the inverse square, mSv. */
export function pulseDoseMSv(radiusM: number, distanceFromCentreM: number, anger: number): number {
  const r = Math.max(distanceFromCentreM, radiusM);
  return PULSE.surfaceDoseMSv * anger * (radiusM / r) ** 2;
}

/** What stands between the crew and the source: a material and its areal density, g/cm². */
export interface RadiationShield {
  readonly material: ShieldMaterial;
  readonly arealDensityGcm2: number;
}

/** Dose that gets through a shield, mSv. */
export const shieldedDoseMSv = (doseMSv: number, shield: RadiationShield): number => doseMSv * relativeDose(shield.material, shield.arealDensityGcm2);

/**
 * Reference doses for the HUD, mSv. NASA's limit for one solar particle event is 250 mSv (NASA OCHMO
 * radiation technical brief, 2023); acute radiation sickness starts around 1 Sv.
 */
export const DOSE_MARKS = { stormLimitMSv: 250, sicknessMSv: 1000 } as const;
