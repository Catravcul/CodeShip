import { Vec3 } from "@core/math/vec3";
import type { AsteroidData } from "@modules/celestial/domain/asteroid";

/**
 * Real bodies outside the starting region, used to show (and test) the tiers the region itself does
 * not have. Values copied from the cited pages on 2026-11-13; shapes are spheres (only the mean size
 * matters for the tier). They are not placed in any region.
 */

const sphere = (d: number) => new Vec3(d, d, d);

/** 433 Eros (NEAR Shoemaker): a big S-type, dry → tier 2. */
export const EROS: AsteroidData = {
  id: "433-eros",
  name: "433 Eros",
  spectralType: { value: "S", source: "https://en.wikipedia.org/wiki/433_Eros", note: "S-type" },
  dimensionsM: { value: sphere(16840), source: "https://en.wikipedia.org/wiki/433_Eros", note: "34,4 × 11,2 × 11,2 km; 16,84 km mean diameter" },
  meanRadiusM: { value: 8420, source: "https://en.wikipedia.org/wiki/433_Eros", note: "16,84 ± 0,06 km mean diameter" },
  massKg: { value: 6.687e15, source: "https://en.wikipedia.org/wiki/433_Eros", note: "6,687 × 10^15 kg" },
  densityKgM3: { value: 2670, source: "https://en.wikipedia.org/wiki/433_Eros", note: "2,67 g/cm³" },
  rotationPeriodH: { value: 5.27, source: "https://en.wikipedia.org/wiki/433_Eros", note: "5,270 h" },
  composition: [],
};

/** (6178) 1986 DA: a small metallic near-Earth asteroid → tier 4. */
export const DA_1986: AsteroidData = {
  id: "6178-1986-da",
  name: "(6178) 1986 DA",
  spectralType: { value: "M", source: "https://en.wikipedia.org/wiki/(6178)_1986_DA", note: "Tholen M; radar points to nickel-iron" },
  dimensionsM: { value: sphere(3150), source: "https://en.wikipedia.org/wiki/(6178)_1986_DA", note: "3,15 km (CALL's adopted value)" },
  meanRadiusM: { value: 1575, source: "https://en.wikipedia.org/wiki/(6178)_1986_DA", note: "3,15 km / 2" },
  massKg: { value: 5300 * (4 / 3) * Math.PI * 1575 ** 3, source: "https://arxiv.org/abs/2109.13950", note: "assumed bulk density 5,3 g/cm³ for a metal-rich body (estimate); no measured mass" },
  densityKgM3: { value: 5300, source: "https://arxiv.org/abs/2109.13950", note: "estimate" },
  rotationPeriodH: { value: 3.5, source: "https://en.wikipedia.org/wiki/(6178)_1986_DA", note: "3,50 h" },
  composition: [
    { material: "Iron-nickel", massFraction: { value: [0.8, 0.9], source: "https://arxiv.org/abs/2109.13950", note: "Sanchez et al. 2021, PSJ 2:205: about 85 % metal" } },
    { material: "Silicates", massFraction: { value: [0.1, 0.2], source: "https://arxiv.org/abs/2109.13950", note: "the rest" } },
  ],
};

/** 16 Psyche (target of NASA's Psyche): metallic, but its gravity already wins → tier 5. */
export const PSYCHE: AsteroidData = {
  id: "16-psyche",
  name: "16 Psyche",
  spectralType: { value: "M", source: "https://en.wikipedia.org/wiki/16_Psyche", note: "Tholen M, SMASS X, Bus-DeMeo Xk" },
  dimensionsM: { value: sphere(222000), source: "https://en.wikipedia.org/wiki/16_Psyche", note: "222 ± 3 km mean diameter" },
  meanRadiusM: { value: 111000, source: "https://en.wikipedia.org/wiki/16_Psyche", note: "222 km / 2" },
  massKg: { value: 2.29e19, source: "https://en.wikipedia.org/wiki/16_Psyche", note: "(2,29 ± 0,14) × 10^19 kg" },
  densityKgM3: { value: 3977, source: "https://en.wikipedia.org/wiki/16_Psyche", note: "3,977 ± 0,253 g/cm³" },
  rotationPeriodH: { value: 4.195948, source: "https://en.wikipedia.org/wiki/16_Psyche", note: "4,195948 h" },
  composition: [],
};

/** 1 Ceres, the dwarf planet: tier 5. */
export const CERES: AsteroidData = {
  id: "1-ceres",
  name: "1 Ceres",
  spectralType: { value: "C", source: "https://en.wikipedia.org/wiki/Ceres_(dwarf_planet)", note: "C/G-type" },
  dimensionsM: { value: sphere(939460), source: "https://en.wikipedia.org/wiki/Ceres_(dwarf_planet)", note: "939,4 km mean diameter" },
  meanRadiusM: { value: 469730, source: "https://en.wikipedia.org/wiki/Ceres_(dwarf_planet)", note: "469,73 km" },
  massKg: { value: 9.3839e20, source: "https://en.wikipedia.org/wiki/Ceres_(dwarf_planet)", note: "9,3839 × 10^20 kg" },
  densityKgM3: { value: 2162, source: "https://en.wikipedia.org/wiki/Ceres_(dwarf_planet)", note: "2,162 g/cm³" },
  rotationPeriodH: { value: 9.074, source: "https://en.wikipedia.org/wiki/Ceres_(dwarf_planet)", note: "9,074 h" },
  composition: [],
};

export const REFERENCE_BODIES: readonly AsteroidData[] = [EROS, DA_1986, PSYCHE, CERES];
