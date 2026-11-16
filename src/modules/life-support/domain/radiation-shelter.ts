import type { Sourced } from "@core/units";
import { ECLSS_SOURCES as S } from "../data/eclss-sources";
import { ISPR } from "../data/eclss-machines";

/**
 * RadWorks storm-shelter study (NTRS 20150001237): effective dose reduction against historic solar
 * particle events with water walls, as (g/cm², share of dose removed). 9,3 and 10,8 g/cm² gave the 50 %
 * «must meet»; 25,6 g/cm² the 70 % goal.
 */
export const SHELTER_POINTS: Sourced<readonly (readonly [number, number])[]> = {
  value: [
    [0, 0],
    [10.8, 0.5],
    [25.6, 0.7],
  ],
  source: S.shelter,
  note: "Entre los puntos, interpolación lineal nuestra",
};

/** Share of a solar storm's dose removed by `gcm2` of water around the crew. */
export function doseReduction(gcm2: number): number {
  const pts = SHELTER_POINTS.value;
  if (gcm2 <= 0) return 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]!;
    const [x1, y1] = pts[i]!;
    if (gcm2 <= x1) return y0 + ((y1 - y0) * (gcm2 - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1]![1];
}

/** The shelter: a crew quarter the size of one ISPR bay (like Harmony's), lined on all six sides. */
export const SHELTER_BOX = { w: ISPR.w, h: ISPR.h, d: ISPR.d, source: ISPR.source } as const;

/** Areal density of the design: RadWorks' viable 50 % case (two to a quarter), g/cm². */
export const SHELTER_GCM2: Sourced<number> = { value: 10.8, source: S.shelter, note: "4,3 pulgadas de agua" };

export interface Shelter {
  readonly areaM2: number;
  readonly neededKg: number;
  readonly ready: boolean;
  /** Dose removed with the water on board spread over the walls (at most the design's). */
  readonly reduction: number;
}

/** With `waterKg` of drinking water in bags, how ready the shelter is. */
export function shelter(waterKg: number): Shelter {
  const b = SHELTER_BOX;
  const areaM2 = 2 * (b.w * b.h + b.w * b.d + b.h * b.d);
  // 1 g/cm² over 1 m² is 10 kg.
  const neededKg = SHELTER_GCM2.value * 10 * areaM2;
  const gcm2 = Math.min(SHELTER_GCM2.value, waterKg / (10 * areaM2));
  return { areaM2, neededKg, ready: waterKg >= neededKg, reduction: doseReduction(gcm2) };
}
