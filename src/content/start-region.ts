import { Vec3 } from "@core/math/vec3";
import { Asteroid, type AsteroidData } from "@modules/celestial/domain/asteroid";
import { Region, OBSTACLE_HULL_FACTOR } from "@modules/celestial/domain/region";
import { NUEVA_POLANA, POLANA_MEMBERS, POLANA_NEIGHBOURS, POLANA_PLACEMENTS_M } from "@modules/celestial/data/nueva-polana";
import { COMETS, COMET_PLACEMENTS_M } from "@modules/celestial/data/comets";
import { generateRockField } from "./asteroid-field";
import { asteroidSurfaceFn, type AsteroidShapeParams } from "./asteroid-shape";

/** Number of procedural filler rocks in the starting region (game value). */
export const FILLER_ROCKS = 5000;

/**
 * Procedural shape of a catalogued member (its real shape is unknown): one set of parameters
 * drives both the mesh that is drawn and the surface the ship lands on.
 */
export function memberShapeParams(data: AsteroidData): AsteroidShapeParams {
  const d = data.dimensionsM.value;
  return { seed: Number.parseInt(data.id, 36) % 100000, size: { x: d.x, y: d.y, z: d.z }, detail: 5, ridge: 0.03, roughness: 0.08, craters: 45 };
}

/**
 * The game's starting region: Bennu at the centre, six real New Polana–area asteroids at
 * compressed distances, three real comets passing through, procedural rubble around them and
 * 142 Polana far away.
 */
export function buildStartRegion(bennu: Asteroid, start: Vec3, clear: readonly { centre: Vec3; radiusM: number }[] = []): Region {
  const members = POLANA_MEMBERS.map((m) => {
    const surface = asteroidSurfaceFn(memberShapeParams(m));
    return new Asteroid(m, POLANA_PLACEMENTS_M[m.id]!, (local) => surface(local));
  });
  // Comets passing through (docs/design/importacion.md): subjugated like the asteroids, rich in ice.
  const comets = COMETS.map((c) => {
    const surface = asteroidSurfaceFn(memberShapeParams(c));
    return new Asteroid(c, COMET_PLACEMENTS_M[c.id]!, (local) => surface(local));
  });
  const rocks = generateRockField({
    seed: 2026,
    count: FILLER_ROCKS,
    radiusM: NUEVA_POLANA.boundaryRadiusM - 200,
    minDiameterM: 8,
    maxDiameterM: 500,
    // Game value: flatter than Dohnanyi's 2.5 so more rocks are big enough to see and steer around.
    slope: 1.8,
    clustered: 0.55,
    clusterShellM: [500, 4000],
    clusterCentres: [bennu.position, ...members.map((m) => m.position)],
    keepClear: [
      { centre: bennu.position, radiusM: bennu.meanRadiusM * 1.6 + 150 },
      { centre: start, radiusM: 300 },
      ...[...members, ...comets].map((m) => ({ centre: m.position, radiusM: m.meanRadiusM * OBSTACLE_HULL_FACTOR + 150 })),
      // Places such as the space station.
      ...clear,
    ],
  });
  const neighbours = POLANA_NEIGHBOURS.map((n) => ({ asteroid: new Asteroid(n.data, n.position), albedo: n.albedo }));
  return new Region(NUEVA_POLANA, [bennu, ...members, ...comets], rocks, neighbours);
}
