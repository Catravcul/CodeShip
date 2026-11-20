/**
 * Getting goods from Earth to the region: a Hohmann transfer between circular orbits around the Sun,
 * leaving from low Earth orbit (docs/design/importacion.md). Circular, coplanar orbits are a
 * simplification: the belt's eccentricity and inclination cost more Δv, and windows open once per
 * synodic period.
 */

/** Sun's GM, m³/s² (IAU 2015 nominal). */
export const MU_SUN = 1.32712440018e20;
/** Earth's GM, m³/s² (WGS 84). */
export const MU_EARTH = 3.986004418e14;
/** Astronomical unit, m (IAU 2012). */
export const AU_M = 1.495978707e11;
/** Earth's equatorial radius, m (WGS 84). */
export const EARTH_RADIUS_M = 6.378137e6;
/** Low Earth orbit the launchers deliver to, m above the surface (game choice: the ISS's ~400 km). */
export const LEO_ALTITUDE_M = 400e3;

export interface HohmannTransfer {
  /** Heliocentric speed changes at each end, m/s. */
  readonly dv1HelioMs: number;
  readonly dv2HelioMs: number;
  /** Half the transfer ellipse's period, days. */
  readonly days: number;
  /** Semi-major axis of the transfer ellipse, AU. */
  readonly aAU: number;
}

/** Hohmann transfer between circular solar orbits of radius r1 and r2 (AU). */
export function hohmann(r1AU: number, r2AU: number, mu = MU_SUN): HohmannTransfer {
  const r1 = r1AU * AU_M;
  const r2 = r2AU * AU_M;
  const a = (r1 + r2) / 2;
  const v1 = Math.sqrt(mu / r1);
  const v2 = Math.sqrt(mu / r2);
  const vp = Math.sqrt(mu * (2 / r1 - 1 / a));
  const va = Math.sqrt(mu * (2 / r2 - 1 / a));
  return { dv1HelioMs: Math.abs(vp - v1), dv2HelioMs: Math.abs(v2 - va), days: (Math.PI * Math.sqrt(a ** 3 / mu)) / 86400, aAU: a / AU_M };
}

/** Burn in low Earth orbit that leaves Earth with hyperbolic excess speed vInf (Oberth: √(v∞² + v_esc²) − v_circ). */
export function departureFromLeoMs(vInfMs: number, altitudeM = LEO_ALTITUDE_M): number {
  const r = EARTH_RADIUS_M + altitudeM;
  const vEsc = Math.sqrt((2 * MU_EARTH) / r);
  const vCirc = Math.sqrt(MU_EARTH / r);
  return Math.sqrt(vInfMs * vInfMs + vEsc * vEsc) - vCirc;
}

export interface EarthToRegion {
  /** Burn in LEO, m/s. */
  readonly departMs: number;
  /** Burn to match the region's orbit on arrival (the small bodies have almost no gravity), m/s. */
  readonly arriveMs: number;
  readonly totalMs: number;
  readonly days: number;
}

/** From LEO to a region `rAU` from the Sun (Earth at 1 AU). */
export function earthToRegion(rAU: number): EarthToRegion {
  const h = hohmann(1, rAU);
  const departMs = departureFromLeoMs(h.dv1HelioMs);
  return { departMs, arriveMs: h.dv2HelioMs, totalMs: departMs + h.dv2HelioMs, days: h.days };
}

/** Synodic period between Earth and a circular orbit of radius r (AU), days: how often a window opens. */
export function synodicDays(rAU: number): number {
  const tEarth = 365.25636;
  const t = tEarth * rAU ** 1.5;
  return 1 / Math.abs(1 / tEarth - 1 / t);
}
