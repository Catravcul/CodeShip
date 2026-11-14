import { Vec3 } from "@core/math/vec3";
import type { Sourced } from "@core/units";
import type { AsteroidData, SpectralType } from "../domain/asteroid";
import type { RegionData } from "../domain/region";
import { BENNU } from "./bennu";

const sbdb = (designation: string) => `https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=${encodeURIComponent(designation)}&phys-par=1`;
const NEOWISE = "NEOWISE diameter/albedo (Masiero et al. 2014, ApJ 791:121) via JPL SBDB, read 2026-11-12";
const QUERY =
  'https://ssd-api.jpl.nasa.gov/sbdb_query.api?fields=full_name,a,e,i,diameter,albedo,H&sb-cdata={"AND":["a|RG|2.41|2.43","i|LT|3","albedo|LT|0.07","diameter|LT|2"]}';
const GAME = "game value";

/** Density assumed for the family's small members: Bennu's, since Bennu is thought to come from here. */
const ASSUMED_DENSITY: Sourced<number> = {
  value: 1190,
  source: "https://en.wikipedia.org/wiki/101955_Bennu",
  note: "assumed: Bennu's bulk density, as a likely fragment of the same family (Takir et al. 2024)",
};

interface MemberSpec {
  id: string;
  name: string;
  /** SBDB designation used for the source link. */
  designation: string;
  diameterKm: number;
  albedo: number;
  /** Rotation period in hours when the light-curve database has one. */
  rotationH?: number;
  /** Game-value period when none is known. */
  gameRotationH?: number;
  source?: string;
}

/**
 * A small New Polana–area member. Diameter and albedo are real (NEOWISE via SBDB). The class is
 * inferred from the low albedo (no spectrum exists); shape ratios, density and composition are
 * assumed by analogy with Bennu and labelled so.
 */
function member(s: MemberSpec): AsteroidData & { albedo: Sourced<number> } {
  const src = s.source ?? sbdb(s.designation);
  const d = s.diameterKm * 1000;
  const r = d / 2;
  const mass = ASSUMED_DENSITY.value * (4 / 3) * Math.PI * r ** 3;
  return {
    id: s.id,
    name: s.name,
    spectralType: { value: "C" as SpectralType, source: src, note: `inferred from geometric albedo ${s.albedo} (C/B complex); no spectrum` },
    // Mean ratios 1.15 : 0.95 : 0.9 are a game choice; the real shapes are unknown.
    dimensionsM: { value: new Vec3(d * 1.15, d * 0.9, d * 0.95), source: src, note: `${s.diameterKm} km equivalent diameter (${NEOWISE}); axis ratios are a ${GAME}` },
    meanRadiusM: { value: r, source: src, note: NEOWISE },
    massKg: { value: mass, source: ASSUMED_DENSITY.source, note: "computed from the NEOWISE diameter and Bennu's density (assumption)" },
    densityKgM3: ASSUMED_DENSITY,
    rotationPeriodH:
      s.rotationH !== undefined
        ? { value: s.rotationH, source: src, note: "rot_per from the Asteroid Lightcurve Database via SBDB" }
        : { value: s.gameRotationH ?? 6, source: GAME, note: "no measured period; game value" },
    // Same rock as Bennu (the family's best-known member).
    composition: BENNU.composition.map((e) => ({ ...e, massFraction: { ...e.massFraction, note: `assumed equal to Bennu's: ${e.massFraction.note ?? ""}` } })),
    albedo: { value: s.albedo, source: src, note: NEOWISE },
  };
}

/** Real small asteroids of the inner belt near 142 Polana (a 2,41–2,44 AU, i < 3°, albedo < 0,07). */
export const POLANA_MEMBERS = [
  member({ id: "242916", name: "242916 (2006 OS2)", designation: "242916", diameterKm: 2.44, albedo: 0.052, rotationH: 4.717 }),
  member({ id: "58587", name: "58587 (1997 SK23)", designation: "58587", diameterKm: 2.306, albedo: 0.04, rotationH: 5.43 }),
  member({ id: "265900", name: "265900 (2006 BY34)", designation: "265900", diameterKm: 1.794, albedo: 0.05, gameRotationH: 7.1, source: QUERY }),
  member({ id: "236201", name: "236201 (2005 WF81)", designation: "236201", diameterKm: 1.562, albedo: 0.066, gameRotationH: 5.2, source: QUERY }),
  member({ id: "417464", name: "417464 (2006 QY64)", designation: "417464", diameterKm: 1.319, albedo: 0.053, gameRotationH: 9.4, source: QUERY }),
  member({ id: "2009uf113", name: "2009 UF113", designation: "2009 UF113", diameterKm: 1.197, albedo: 0.049, gameRotationH: 3.9, source: QUERY }),
];

/**
 * Where each member sits around Bennu (region centre), metres. Game values: in reality the
 * nearest one would be hundreds of thousands of kilometres away.
 */
export const POLANA_PLACEMENTS_M: Record<string, Vec3> = {
  "242916": new Vec3(-4200, 900, -9000),
  "58587": new Vec3(7500, -1800, -6000),
  "265900": new Vec3(-9000, -2500, 3000),
  "236201": new Vec3(3000, 5200, 9000),
  "417464": new Vec3(11000, 3000, 2000),
  "2009uf113": new Vec3(-2500, -6500, -11000),
};

/** 142 Polana, the family's parent body, seen from afar (outside the flyable area). */
export const POLANA_NEIGHBOURS = [
  {
    data: {
      id: "142-polana",
      name: "142 Polana",
      spectralType: { value: "B" as SpectralType, source: sbdb("142"), note: "SMASSII B, Tholen F" },
      dimensionsM: { value: new Vec3(60000, 50000, 54800), source: sbdb("142"), note: "54.812±0.277 km equivalent diameter (NEOWISE); axis ratios are a game value" },
      meanRadiusM: { value: 27406, source: sbdb("142"), note: "54.812 km / 2 (NEOWISE)" },
      massKg: { value: 1190 * (4 / 3) * Math.PI * 27406 ** 3, source: ASSUMED_DENSITY.source, note: "assumed Bennu-like density" },
      densityKgM3: ASSUMED_DENSITY,
      rotationPeriodH: { value: 9.764, source: sbdb("142"), note: "LCDB via SBDB" },
      composition: [],
    } satisfies AsteroidData,
    albedo: { value: 0.047, source: sbdb("142"), note: "0.047±0.007 (NEOWISE)" } as Sourced<number>,
    /** Compressed distance for play (game value): direction and range from the region centre, metres. */
    position: new Vec3(-900_000, 260_000, -1_200_000),
  },
];

/** The starting region: the inner main belt where Bennu's family (New Polana) lives. */
export const NUEVA_POLANA: RegionData = {
  id: "nueva-polana",
  name: "Familia de Nueva Polana · cinturón interior",
  anchor: {
    body: "142 Polana",
    value: {
      aAU: 2.419192123784419,
      e: 0.1328207882615142,
      iDeg: 2.242554209440512,
      nodeDeg: 291.0582934673843,
      periDeg: 292.6747995110621,
      meanAnomalyDeg: 3.501640779154536,
      epochJd: 2461200.5,
      meanMotionDegPerDay: 0.2619380162199745,
    },
    source: sbdb("142"),
    note: "osculating elements, JPL solution of 2026-06-05",
  },
  gameDateUtcMs: Date.UTC(2026, 10, 12),
  boundaryRadiusM: 20_000,
  warningBandM: 2_500,
  sunDirectionGame: new Vec3(-0.85, 0.35, 0.5),
};
