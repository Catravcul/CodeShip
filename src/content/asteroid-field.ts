import { Vec3 } from "@core/math/vec3";
import type { Rock } from "@modules/celestial/domain/region";
import { seededRandom } from "./random";

export interface FieldParams {
  seed: number;
  count: number;
  /** Rocks stay inside this radius from the centre, metres. */
  radiusM: number;
  /** Smallest and largest diameters, metres. */
  minDiameterM: number;
  maxDiameterM: number;
  /** Cumulative size slope: N(>D) ∝ D^-slope. 2.5 is the collisional-equilibrium value (Dohnanyi 1969). */
  slope: number;
  /** Fraction of rocks gathered in debris clouds around the cluster centres. */
  clustered: number;
  clusterCentres: readonly Vec3[];
  /** Debris clouds fill a shell this far from each cluster centre, metres. */
  clusterShellM: readonly [number, number];
  /** Spheres (centre, radius) that must stay empty: big asteroids, the start point. */
  keepClear: readonly { centre: Vec3; radiusM: number }[];
}

/**
 * PROCEDURAL filler rocks (not catalogued objects): sizes follow a power law, most are dark
 * C/B like the New Polana family and about one in ten is a brighter S-type interloper.
 * Deterministic for a given seed.
 */
export function generateRockField(p: FieldParams): Rock[] {
  const rnd = seededRandom(p.seed);
  const k = 1 - (p.minDiameterM / p.maxDiameterM) ** p.slope;
  const randomIn = (r0: number, r1: number) => {
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    const r = Math.cbrt(r0 ** 3 + rnd() * (r1 ** 3 - r0 ** 3));
    return new Vec3(s * Math.cos(th) * r, u * r, s * Math.sin(th) * r);
  };
  const rocks: Rock[] = [];
  // Spatial hash so the spacing check only looks at nearby rocks.
  const CELL = 2 * (p.maxDiameterM * 1.5 + 10);
  const grid = new Map<string, Rock[]>();
  const key = (x: number, y: number, z: number) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)},${Math.floor(z / CELL)}`;
  const crowded = (pos: Vec3, radiusM: number) => {
    const cx = Math.floor(pos.x / CELL), cy = Math.floor(pos.y / CELL), cz = Math.floor(pos.z / CELL);
    for (let i = -1; i <= 1; i++)
      for (let j = -1; j <= 1; j++)
        for (let k = -1; k <= 1; k++)
          for (const o of grid.get(`${cx + i},${cy + j},${cz + k}`) ?? []) if (o.position.sub(pos).length() < (o.radiusM + radiusM) * 1.5 + 10) return true;
    return false;
  };
  let guard = 0;
  while (rocks.length < p.count && guard++ < p.count * 50) {
    const diameter = p.minDiameterM * (1 - rnd() * k) ** (-1 / p.slope);
    const inCluster = rnd() < p.clustered && p.clusterCentres.length > 0;
    const pos = inCluster ? p.clusterCentres[Math.floor(rnd() * p.clusterCentres.length)]!.add(randomIn(p.clusterShellM[0], p.clusterShellM[1])) : randomIn(0, p.radiusM);
    const radiusM = diameter / 2;
    if (pos.length() + radiusM > p.radiusM) continue;
    if (p.keepClear.some((c) => pos.sub(c.centre).length() < c.radiusM + radiusM)) continue;
    if (crowded(pos, radiusM)) continue;
    const s = rnd() < 0.1;
    const rock: Rock = { position: pos, radiusM, spectralType: s ? "S" : rnd() < 0.5 ? "B" : "C", albedo: s ? 0.2 + rnd() * 0.1 : 0.03 + rnd() * 0.04, seed: Math.floor(rnd() * 1e9) };
    rocks.push(rock);
    const kk = key(pos.x, pos.y, pos.z);
    grid.set(kk, [...(grid.get(kk) ?? []), rock]);
  }
  return rocks;
}
