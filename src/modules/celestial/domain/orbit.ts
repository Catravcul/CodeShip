import { Vec3 } from "@core/math/vec3";

/** Julian date of the J2000.0 epoch (2000-01-01 12:00 TT). */
export const J2000_JD = 2451545.0;
const DEG = Math.PI / 180;

/** Julian date from a UTC timestamp in ms. The ~69 s between UTC and TT does not matter here. */
export function julianDateFromUtc(ms: number): number {
  return J2000_JD + (ms - Date.UTC(2000, 0, 1, 12)) / 86_400_000;
}

/**
 * Mean Keplerian elements with linear rates per Julian century, as in JPL's
 * "Approximate Positions of the Planets" (Standish). Angles in degrees, a in AU.
 */
export interface MeanElements {
  readonly a: readonly [number, number];
  readonly e: readonly [number, number];
  readonly I: readonly [number, number];
  /** Mean longitude. */
  readonly L: readonly [number, number];
  /** Longitude of perihelion. */
  readonly longPeri: readonly [number, number];
  /** Longitude of the ascending node. */
  readonly longNode: readonly [number, number];
}

/** Osculating heliocentric elements at an epoch (the way JPL SBDB gives them for asteroids). */
export interface OsculatingElements {
  readonly aAU: number;
  readonly e: number;
  readonly iDeg: number;
  /** Longitude of the ascending node (om). */
  readonly nodeDeg: number;
  /** Argument of perihelion (w). */
  readonly periDeg: number;
  /** Mean anomaly at the epoch (ma). */
  readonly meanAnomalyDeg: number;
  readonly epochJd: number;
  /** Mean motion n. */
  readonly meanMotionDegPerDay: number;
}

/** Elements resolved at one instant, angles in radians. */
export interface KeplerElements {
  readonly aAU: number;
  readonly e: number;
  readonly i: number;
  readonly node: number;
  /** Argument of perihelion ω. */
  readonly argPeri: number;
  /** Mean anomaly, wrapped to [-π, π]. */
  readonly M: number;
}

const wrapPi = (x: number) => x - 2 * Math.PI * Math.floor((x + Math.PI) / (2 * Math.PI));

export function keplerElementsAt(el: MeanElements | OsculatingElements, jd: number): KeplerElements {
  if ("aAU" in el) {
    const M = (el.meanAnomalyDeg + el.meanMotionDegPerDay * (jd - el.epochJd)) * DEG;
    return { aAU: el.aAU, e: el.e, i: el.iDeg * DEG, node: el.nodeDeg * DEG, argPeri: el.periDeg * DEG, M: wrapPi(M) };
  }
  const T = (jd - J2000_JD) / 36525;
  const at = (x: readonly [number, number]) => x[0] + x[1] * T;
  const longPeri = at(el.longPeri);
  const node = at(el.longNode);
  return { aAU: at(el.a), e: at(el.e), i: at(el.I) * DEG, node: node * DEG, argPeri: (longPeri - node) * DEG, M: wrapPi((at(el.L) - longPeri) * DEG) };
}

/** Eccentric anomaly E from M = E − e·sin E (Newton iteration), radians. */
export function solveKepler(M: number, e: number): number {
  let E = M + e * Math.sin(M);
  for (let k = 0; k < 50; k++) {
    const dE = (M - (E - e * Math.sin(E))) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return E;
}

/** Heliocentric position in the J2000 ecliptic frame, AU (x to the vernal equinox, z to ecliptic north). */
export function positionFromElements(k: KeplerElements): Vec3 {
  const E = solveKepler(k.M, k.e);
  const xp = k.aAU * (Math.cos(E) - k.e);
  const yp = k.aAU * Math.sqrt(1 - k.e * k.e) * Math.sin(E);
  const cw = Math.cos(k.argPeri), sw = Math.sin(k.argPeri);
  const cO = Math.cos(k.node), sO = Math.sin(k.node);
  const ci = Math.cos(k.i), si = Math.sin(k.i);
  return new Vec3(
    (cw * cO - sw * sO * ci) * xp + (-sw * cO - cw * sO * ci) * yp,
    (cw * sO + sw * cO * ci) * xp + (-sw * sO + cw * cO * ci) * yp,
    sw * si * xp + cw * si * yp,
  );
}
