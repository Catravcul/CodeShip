import { Vec3 } from "@core/math/vec3";
import type { Sourced } from "@core/units";
import type { AsteroidData, CompositionEntry, SpectralType } from "../domain/asteroid";
import { BENNU } from "./bennu";

/**
 * Comets that fly through the region (docs/design/importacion.md). Sizes, densities, rotation
 * periods and orbits are JPL SBDB values (read 2026-11-13); the nucleus composition is built from
 * Rosetta's measurements of 67P and labelled where it is assumed for another comet.
 */
const sbdb = (designation: string) => `https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=${encodeURIComponent(designation)}&phys-par=1`;

/** Comet sources (all checked 2026-11-13). */
export const COMET_SRC = {
  /** Fulle et al. 2019, MNRAS 482:3326: refractory-to-ice mass ratio in comet nuclei, 1-σ lower limit 3. */
  refractoryToIce: "https://ui.adsabs.harvard.edu/abs/2019MNRAS.482.3326F",
  /** Choukroun et al. 2020, Space Sci. Rev. 216:44: dust-to-gas and refractory-to-ice mass ratios of 67P, wide range of plausible values. */
  choukroun: "https://elib.dlr.de/135524",
  /** Rotundi et al. 2015, Science 347:aaa3905 (GIADA): dust/gas mass ratio 4 ± 2 over the sunlit nucleus. */
  rotundi: "https://sci.esa.int/web/rosetta/-/55330-rotundi-et-al-2015",
  /** Läuter et al. 2020, MNRAS (DFMS/COPS): 14 gases lost by 67P in 2014–2016; H2O 4.0e9 kg, CO2 7.2e8, CO 1.9e8, NH3 1.5e7 kg. */
  gasProduction: "https://arxiv.org/abs/2006.01750",
  /** Bardyn et al. 2017, MNRAS (COSIMA): about 45 % of the dust mass is organic matter, 55 % minerals (mainly silicates). */
  organics: "https://www.mps.mpg.de/Rosetta-A-Comet-s-List-of-Ingredients",
  /** Vincent et al. 2016 (Rosetta OSIRIS): 34 outbursts, ≤ 5 min each, 60–260 kg/s of dust at ≥ 13 m/s. */
  outbursts: "https://ar5iv.labs.arxiv.org/html/1609.07743",
  /** ESA, Giotto at Halley 1986: gas ~80 % water by volume, 10 % CO, 2,5 % CO2; dust dominates; 3 t/s from seven jets. */
  halley: "https://sci.esa.int/web/giotto/-/31878-halley",
  /** Farnham et al. 2021, PSJ: 46P's apparent rotation period 8,98 h (Nov 2018) to 9,14 h near perihelion. */
  wirtanenRotation: "https://arxiv.org/abs/2012.01291",
} as const;

/** Mass shares of the gas 67P lost in 2014–2016 (Läuter et al. 2020, Table 1), kg. */
const GAS_KG = { h2o: 4.0e9, co2: 7.2e8, co: 1.9e8, nh3: 1.5e7, other: 1.3e8 + 1.6e8 + 5.5e7 + 3.7e7 + 3.1e7 + 1.5e7 + 1.1e7 + 1.3e7 + 9.6e6 + 3.2e6 } as const;
const GAS_TOTAL = Object.values(GAS_KG).reduce((s, v) => s + v, 0);
/** Refractory-to-ice mass ratio: 3 (Fulle et al. 2019 lower limit) up to 6 (Rotundi's 4 ± 2 at the top). */
export const REFRACTORY_TO_ICE: Sourced<[number, number]> = { value: [3, 6], source: COMET_SRC.refractoryToIce, note: "≥ 3 (Fulle 2019); GIADA's dust/gas 4 ± 2 (Rotundi 2015) gives the top of the range" };
/** Organic share of the refractory dust (COSIMA). */
export const ORGANIC_SHARE = 0.45;

/** Cargo names of a comet's materials (the station maps them to its store). */
export const COMET_MATERIAL = {
  waterIce: "Water ice",
  co2Ice: "Carbon dioxide ice",
  coIce: "Carbon monoxide ice",
  ammonia: "Ammonia (ice and ammonium salts)",
  otherVolatiles: "Other volatiles (H2S, O2, CH3OH…)",
  organics: "Refractory organics (CHON)",
  minerals: "Silicates and sulfides (dust)",
} as const;

/**
 * Mass fractions of a 67P-like nucleus: the ice share comes from the refractory-to-ice ratio R
 * (ice = 1 / (1 + R)), split like the gas 67P lost; the refractory rest is 45 % organics and 55 %
 * minerals. Ranges follow R from its low to its high value.
 */
export function cometComposition(ratio: Sourced<[number, number]> = REFRACTORY_TO_ICE, note = "67P (Rosetta)"): CompositionEntry[] {
  const [rLo, rHi] = ratio.value;
  const iceHi = 1 / (1 + rLo);
  const iceLo = 1 / (1 + rHi);
  const ice = (kg: number, material: string): CompositionEntry => ({
    material,
    massFraction: { value: [(iceLo * kg) / GAS_TOTAL, (iceHi * kg) / GAS_TOTAL], source: COMET_SRC.gasProduction, note: `${note}: ice share 1/(1+R), R = ${rLo}–${rHi}; split like the gas lost in 2014–2016` },
  });
  const dust = (share: number, material: string, source: string): CompositionEntry => ({
    material,
    massFraction: { value: [(1 - iceHi) * share, (1 - iceLo) * share], source, note: `${note}: refractory share R/(1+R); ${Math.round(share * 100)} % of the dust (COSIMA)` },
  });
  return [
    ice(GAS_KG.h2o, COMET_MATERIAL.waterIce),
    ice(GAS_KG.co2, COMET_MATERIAL.co2Ice),
    ice(GAS_KG.co, COMET_MATERIAL.coIce),
    ice(GAS_KG.nh3, COMET_MATERIAL.ammonia),
    ice(GAS_KG.other, COMET_MATERIAL.otherVolatiles),
    dust(ORGANIC_SHARE, COMET_MATERIAL.organics, COMET_SRC.organics),
    dust(1 - ORGANIC_SHARE, COMET_MATERIAL.minerals, COMET_SRC.organics),
  ];
}

export type CometData = AsteroidData & { readonly albedo: Sourced<number>; readonly orbit: Sourced<{ aAU: number; e: number; iDeg: number; qAU: number; QAU: number }> };

interface CometSpec {
  id: string;
  name: string;
  designation: string;
  diameterKm: Sourced<number>;
  densityKgM3: Sourced<number>;
  rotationH: Sourced<number>;
  albedo: Sourced<number>;
  orbit: { aAU: number; e: number; iDeg: number; qAU: number; QAU: number };
  composition: CompositionEntry[];
  /** Axis ratios of the drawn shape (game value unless noted). */
  ratios: [number, number, number];
  ratioNote: string;
}

function comet(s: CometSpec): CometData {
  const src = sbdb(s.designation);
  const r = (s.diameterKm.value * 1000) / 2;
  const d = s.diameterKm.value * 1000;
  return {
    id: s.id,
    name: s.name,
    kind: "cometa",
    // Comet nuclei have no Tholen class; they are as dark as the C/B complex, which drives the colour.
    spectralType: { value: "C" as SpectralType, source: src, note: "comet nucleus: no asteroid class; dark like the C complex" },
    dimensionsM: { value: new Vec3(d * s.ratios[0], d * s.ratios[1], d * s.ratios[2]), source: src, note: `${s.diameterKm.value} km effective diameter; ${s.ratioNote}` },
    meanRadiusM: { value: r, source: s.diameterKm.source, note: s.diameterKm.note ?? "" },
    massKg: { value: s.densityKgM3.value * (4 / 3) * Math.PI * r ** 3, source: s.densityKgM3.source, note: `from the diameter and the density (${s.densityKgM3.note ?? ""})` },
    densityKgM3: s.densityKgM3,
    rotationPeriodH: s.rotationH,
    composition: s.composition,
    albedo: s.albedo,
    orbit: { value: s.orbit, source: src, note: "JPL SBDB osculating elements" },
  };
}

const D67P: Sourced<number> = { value: 533, source: sbdb("67P"), note: "0.533 g/cm³ (Pätzold et al. 2016, Nature 530:63)" };

/** Comets of the region. Positions are game values (`COMET_PLACEMENTS_M`). */
export const COMETS: readonly CometData[] = [
  comet({
    id: "67p",
    name: "67P/Churyumov-Gerasimenko",
    designation: "67P",
    diameterKm: { value: 3.4, source: sbdb("67P"), note: "3.4 km (Sierks et al. 2015, Science 347:aaa1044)" },
    densityKgM3: D67P,
    rotationH: { value: 12.76129, source: sbdb("67P"), note: "Mottola et al. 2014, A&A 569:L2" },
    albedo: { value: 0.059, source: "https://en.wikipedia.org/wiki/67P/Churyumov%E2%80%93Gerasimenko", note: "geometric albedo ~0.06 (Rosetta OSIRIS)" },
    orbit: { aAU: 3.46, e: 0.641, iDeg: 7.04, qAU: 1.24, QAU: 5.68 },
    composition: cometComposition(),
    // Two lobes: about 4.1 × 3.3 × 1.8 km and 2.6 × 2.3 × 1.8 km; one lumpy body stands in for both.
    ratios: [1.3, 0.75, 0.95],
    ratioNote: "elongated like the two-lobed nucleus (ESA); one lumpy body stands in for both lobes (game value)",
  }),
  comet({
    id: "46p",
    name: "46P/Wirtanen",
    designation: "46P",
    diameterKm: { value: 1.2, source: sbdb("46P"), note: "1.2 km (Lamy et al. 2004, Comets II)" },
    densityKgM3: { ...D67P, note: "assumed equal to 67P's (both Jupiter-family comets)" },
    rotationH: { value: 8.98, source: COMET_SRC.wirtanenRotation, note: "8.98 h in November 2018 (Farnham et al. 2021)" },
    albedo: { value: 0.04, source: sbdb("46P"), note: "assumed: typical comet nucleus (SBDB lists none)" },
    orbit: { aAU: 3.09, e: 0.659, iDeg: 11.7, qAU: 1.06, QAU: 5.13 },
    composition: cometComposition(REFRACTORY_TO_ICE, "assumed like 67P (no nucleus sample of 46P)"),
    ratios: [1.15, 0.9, 0.95],
    ratioNote: "axis ratios are a game value",
  }),
  comet({
    id: "133p",
    name: "133P/Elst-Pizarro",
    designation: "133P",
    diameterKm: { value: 3.2, source: sbdb("133P"), note: "3.200 ± 0.200 km (NEOWISE via SBDB)" },
    densityKgM3: { value: 1190, source: "https://en.wikipedia.org/wiki/101955_Bennu", note: "assumed: Bennu's, as a main-belt (rocky) comet" },
    rotationH: { value: 3.471, source: sbdb("133P"), note: "LCDB via SBDB (Hsieh, Jewitt & Fernández 2004)" },
    albedo: { value: 0.06, source: sbdb("133P"), note: "0.060 ± 0.020 (NEOWISE)" },
    orbit: { aAU: 3.16, e: 0.155, iDeg: 1.39, qAU: 2.67, QAU: 3.66 },
    // A main-belt comet: an asteroid with a little buried ice that wakes near perihelion.
    composition: [
      ...BENNU.composition.map((e) => ({ ...e, massFraction: { ...e.massFraction, value: [e.massFraction.value[0] * 0.97, e.massFraction.value[1] * 0.97] as [number, number], note: `assumed Bennu-like rock (×0,97): ${e.massFraction.note ?? ""}` } })),
      { material: COMET_MATERIAL.waterIce, massFraction: { value: [0.01, 0.05], source: sbdb("133P"), note: "game value: a few percent of buried ice, enough for its recurrent activity (Hsieh & Jewitt)" } },
    ],
    ratios: [1.1, 0.92, 0.98],
    ratioNote: "axis ratios are a game value",
  }),
];

/** Where each comet sits around Bennu (region centre), metres. Game values, like the asteroids'. */
export const COMET_PLACEMENTS_M: Record<string, Vec3> = {
  "67p": new Vec3(12000, -4000, -9000),
  "46p": new Vec3(6000, 8000, -3000),
  "133p": new Vec3(-13000, 4000, 8000),
};

export const isComet = (a: Pick<AsteroidData, "kind">): boolean => a.kind === "cometa";
