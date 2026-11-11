import { Vec3 } from "@core/math/vec3";
import type { AsteroidData } from "../domain/asteroid";

const WIKI = "https://en.wikipedia.org/wiki/101955_Bennu";

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
      massFraction: { value: [0.045, 0.047], source: WIKI, note: "4.5–4.7 wt% in returned sample; to re-verify against the sample papers" },
    },
  ],
};
