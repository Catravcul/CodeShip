import { Vec3 } from "@core/math/vec3";
import { AU_KM, PLANETS, SUN, type PlanetData } from "../data/planets";
import { keplerElementsAt, positionFromElements } from "./orbit";

/** A body as an observer sees it: where it is in the sky, how big and how bright. */
export interface SkyBody {
  readonly id: string;
  readonly name: string;
  /** Unit vector from the observer, J2000 ecliptic frame. */
  readonly direction: Vec3;
  readonly distanceAU: number;
  readonly angularDiameterRad: number;
  /** Apparent visual magnitude (smaller is brighter). */
  readonly magnitude: number;
}

export interface Sky {
  readonly sun: SkyBody;
  readonly planets: readonly SkyBody[];
}

/** Exact angular diameter of a sphere of radius r seen from distance d (same units). */
export function angularDiameterRad(radius: number, distance: number): number {
  return 2 * Math.asin(Math.min(1, radius / distance));
}

/** Sun–body–observer angle in degrees. Positions are heliocentric. */
export function phaseAngleDeg(body: Vec3, observer: Vec3): number {
  const toSun = body.scale(-1).normalize();
  const toObs = observer.sub(body).normalize();
  return (Math.acos(Math.max(-1, Math.min(1, toSun.dot(toObs)))) * 180) / Math.PI;
}

export function sunAsSeenFrom(observerAU: Vec3): SkyBody {
  const d = observerAU.length();
  return {
    id: "sol",
    name: SUN.name,
    direction: observerAU.scale(-1 / d),
    distanceAU: d,
    angularDiameterRad: angularDiameterRad(SUN.radiusKm.value, d * AU_KM.value),
    magnitude: SUN.magnitudeAt1AU.value + 5 * Math.log10(d),
  };
}

export function planetAsSeenFrom(planet: PlanetData, observerAU: Vec3, jd: number): SkyBody {
  const p = positionFromElements(keplerElementsAt(planet.orbit.value, jd));
  const rel = p.sub(observerAU);
  const delta = rel.length();
  const alpha = phaseAngleDeg(p, observerAU);
  return {
    id: planet.id,
    name: planet.name,
    direction: rel.scale(1 / delta),
    distanceAU: delta,
    angularDiameterRad: angularDiameterRad(planet.radiusKm.value, delta * AU_KM.value),
    magnitude: planet.magnitude.value(alpha) + 5 * Math.log10(p.length() * delta),
  };
}

/** Sun and planets seen from a heliocentric point (AU, J2000 ecliptic) at a Julian date. */
export function skyFrom(observerAU: Vec3, jd: number): Sky {
  const planets = PLANETS.map((p) => planetAsSeenFrom(p, observerAU, jd)).filter((b) => b.distanceAU > 0.01);
  return { sun: sunAsSeenFrom(observerAU), planets };
}
