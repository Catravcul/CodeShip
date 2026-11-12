import { Vec3 } from "@core/math/vec3";
import { Asteroid } from "@modules/celestial/domain/asteroid";
import { Region, OBSTACLE_HULL_FACTOR } from "@modules/celestial/domain/region";
import { NUEVA_POLANA, POLANA_MEMBERS, POLANA_NEIGHBOURS, POLANA_PLACEMENTS_M } from "@modules/celestial/data/nueva-polana";
import { generateRockField } from "./asteroid-field";

/** Number of procedural filler rocks in the starting region (game value). */
export const FILLER_ROCKS = 5000;

/**
 * The game's starting region: Bennu at the centre, six real New Polana–area asteroids at
 * compressed distances, procedural rubble around them and 142 Polana far away.
 */
export function buildStartRegion(bennu: Asteroid, start: Vec3): Region {
  const members = POLANA_MEMBERS.map((m) => new Asteroid(m, POLANA_PLACEMENTS_M[m.id]!));
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
      ...members.map((m) => ({ centre: m.position, radiusM: m.meanRadiusM * OBSTACLE_HULL_FACTOR + 150 })),
    ],
  });
  const neighbours = POLANA_NEIGHBOURS.map((n) => ({ asteroid: new Asteroid(n.data, n.position), albedo: n.albedo }));
  return new Region(NUEVA_POLANA, [bennu, ...members], rocks, neighbours);
}
