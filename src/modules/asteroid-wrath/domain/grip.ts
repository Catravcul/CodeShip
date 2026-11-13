import type { Vec3 } from "@core/math/vec3";

/**
 * Gravity grip (tier 5, the most massive bodies). Game licence based on the real escape speed and
 * surface gravity: inside the grip radius the asteroid adds a pull toward itself that starts at
 * several times its real surface gravity and fades to nothing at the edge. Near a body like Ceres
 * (0,28 m/s² at the surface) the pull beats a lander's ~0,3 m/s² engine: escape becomes impossible.
 */
export const GRIP = {
  /** Grip radius in asteroid radii (game value). */
  radiusFactor: 3,
  /** Strongest extra pull at the surface, in multiples of the real surface gravity, at full anger (game value). */
  gain: 5,
  /** The grip never goes below this at the surface, m/s² (game value: even a small tier-5 body grips). */
  minSurfaceMs2: 0.05,
} as const;

export const gripRadiusM = (radiusM: number): number => radiusM * GRIP.radiusFactor;

/** Size of the extra pull at a distance from the centre, m/s². */
export function gripAccelMs2(surfaceGravityMs2: number, radiusM: number, distanceFromCentreM: number, anger: number): number {
  const edge = gripRadiusM(radiusM);
  if (distanceFromCentreM >= edge || anger <= 0) return 0;
  const surface = Math.max(GRIP.minSurfaceMs2, surfaceGravityMs2 * GRIP.gain) * anger;
  const fade = 1 - Math.max(0, distanceFromCentreM - radiusM) / (edge - radiusM);
  return surface * fade;
}

/** The extra pull as a vector toward the centre, m/s². */
export function gripAt(centre: Vec3, p: Vec3, surfaceGravityMs2: number, radiusM: number, anger: number): Vec3 {
  const toCentre = centre.sub(p);
  const d = toCentre.length();
  const a = gripAccelMs2(surfaceGravityMs2, radiusM, d, anger);
  return a === 0 || d < 1e-9 ? toCentre.scale(0) : toCentre.scale(a / d);
}

/** Whether a craft with this much thrust acceleration can no longer climb out at this distance. */
export const escapeImpossible = (craftAccelMs2: number, surfaceGravityMs2: number, radiusM: number, distanceFromCentreM: number, anger: number): boolean =>
  gripAccelMs2(surfaceGravityMs2, radiusM, distanceFromCentreM, anger) >= craftAccelMs2;
