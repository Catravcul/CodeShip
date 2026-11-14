import { Vec3 } from "@core/math/vec3";
import type { AsteroidData } from "../domain/asteroid";

const WIKI = "https://en.wikipedia.org/wiki/101955_Bennu";
/** Lauretta et al. 2024, Meteoritics & Planetary Science: the returned sample is CI-chondrite-like. */
const SAMPLE = "https://arxiv.org/abs/2404.12536";
/** Lodders 2003, ApJ 591:1220, Table 3: CI chondrite abundances (ppm by mass). */
const LODDERS = "https://ui.adsabs.harvard.edu/abs/2003ApJ...591.1220L/abstract";

/** 101955 Bennu, visited by OSIRIS-REx. Values copied from the cited page on 2026-11-11. */
export const BENNU: AsteroidData = {
  id: "101955-bennu",
  name: "101955 Bennu",
  spectralType: { value: "B", source: WIKI, note: "Infobox lists B (Tholen F)" },
  dimensionsM: { value: new Vec3(565, 508, 535), source: WIKI, note: "565 m × 535 m × 508 m" },
  meanRadiusM: { value: 245.03, source: WIKI, note: "245.03±0.08 m" },
  massKg: { value: 7.329e10, source: WIKI, note: "(7.329±0.009)×10^10 kg" },
  densityKgM3: { value: 1190, source: WIKI, note: "1190±13 kg/m3" },
  rotationPeriodH: { value: 4.296057, source: WIKI, note: "4.296057±0.000002 h" },
  composition: [
    {
      material: "Water (in hydrated minerals)",
      massFraction: { value: [0.01, 0.062], source: WIKI, note: "~1 wt% conservative; another estimate 6.2 wt%" },
    },
    {
      material: "Carbon",
      massFraction: { value: [0.045, 0.047], source: WIKI, note: "4.5–4.7 wt% in returned sample (Lauretta et al. 2024, Table 4)" },
    },
    {
      material: "Nitrogen (in ammonium salts and organics)",
      massFraction: {
        value: [0.0023, 0.0025],
        source: "https://ntrs.nasa.gov/api/citations/20250001355/downloads/GlavinAbundantSTI.pdf",
        note: "N 0.23–0.25 wt% in Bennu aggregates; water-extracted ammonia ~13.6 µmol/g, 75 × Ryugu's (Glavin et al. 2025, Nature Astronomy)",
      },
    },
    // The bulk rock. Bennu's sample is CI-like (Lauretta et al. 2024: ~80 vol% phyllosilicates,
    // ~10 % Fe-Ni sulfides, ~5 % magnetite), so iron and nickel take the CI values of Lodders 2003.
    {
      material: "Iron (in magnetite and Fe-Ni sulfides)",
      massFraction: { value: [0.1813, 0.1843], source: LODDERS, note: "CI Fe 182 800 ± 1 470 ppm; assumed for Bennu because the sample is CI-like (" + SAMPLE + ")" },
    },
    {
      material: "Nickel (in Fe-Ni sulfides)",
      massFraction: { value: [0.0104, 0.0109], source: LODDERS, note: "CI Ni 10 640 ± 210 ppm; assumed for Bennu (CI-like sample)" },
    },
    {
      material: "Silicates (phyllosilicates)",
      massFraction: { value: [0.55, 0.65], source: SAMPLE, note: "serpentine and smectite, ~80 vol% of the sample; the mass fraction left after the other entries is a game estimate" },
    },
  ],
};
