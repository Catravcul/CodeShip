import { Vec3 } from "@core/math/vec3";
import type { Sourced } from "@core/units";
import type { Asteroid, SpectralType } from "./asteroid";
import { julianDateFromUtc, keplerElementsAt, positionFromElements, type OsculatingElements } from "./orbit";
import { skyFrom, type Sky, type SkyBody } from "./sky";

/** A small procedural rock that fills the field (not a catalogued asteroid). */
export interface Rock {
  readonly position: Vec3;
  readonly radiusM: number;
  readonly spectralType: SpectralType;
  /** Geometric albedo used to shade its impostor. */
  readonly albedo: number;
  readonly seed: number;
}

/** A catalogued asteroid of the family seen from far away, outside the flyable area. */
export interface DistantNeighbour {
  readonly asteroid: Asteroid;
  readonly albedo: Sourced<number>;
}

export interface RegionData {
  readonly id: string;
  readonly name: string;
  /** Where the region is: it rides along the orbit of this real body (heliocentric, J2000 ecliptic). */
  readonly anchor: Sourced<OsculatingElements> & { readonly body: string };
  /** Game date the sky is computed for (UTC ms). Game value. */
  readonly gameDateUtcMs: number;
  /** Radius of the flyable sphere around the region centre, metres. Game value. */
  readonly boundaryRadiusM: number;
  /** Width of the band inside the edge where the push back starts, metres. Game value. */
  readonly warningBandM: number;
  /**
   * Direction of the Sun in the game's world frame. The game axes are arbitrary, so the sky is
   * rotated to put the Sun here; directions between sky bodies stay true. Game value.
   */
  readonly sunDirectionGame: Vec3;
}

export type BoundaryZone = "inside" | "warning" | "outside";

export interface BoundaryStatus {
  readonly zone: BoundaryZone;
  readonly distanceFromCentreM: number;
  /** Metres left to the edge (negative beyond it). */
  readonly toEdgeM: number;
}

/** Strongest push back at the edge, m/s². Beats the main engine (≈0,7 m/s²) so the edge can't be crossed. */
export const BOUNDARY_PUSH_MS2 = 1.2;
/** Gap kept around rocks by the anti-collision rule, metres (about the ship's size). */
export const OBSTACLE_MARGIN_M = 4;
/** Rocks are lumpy: their hull is taken as this many times their mean radius. */
export const OBSTACLE_HULL_FACTOR = 1.4;

/**
 * A playable patch of the Solar System: a real heliocentric location (which decides the sky),
 * a soft spherical boundary and the asteroids inside it. Distances inside are compressed for play;
 * see docs/research/sistema-solar.md.
 */
export class Region {
  private readonly basis: { e: [Vec3, Vec3, Vec3]; g: [Vec3, Vec3, Vec3] };

  constructor(
    readonly data: RegionData,
    /** Catalogued asteroids inside the boundary; the first is the expedition's target. */
    readonly asteroids: readonly Asteroid[],
    readonly rocks: readonly Rock[],
    readonly neighbours: readonly DistantNeighbour[] = [],
  ) {
    if (asteroids.length === 0) throw new Error("A region needs at least one asteroid");
    const sunEcl = this.heliocentricAU().scale(-1).normalize();
    this.basis = { e: frame(sunEcl, Vec3.Z), g: frame(data.sunDirectionGame.normalize(), Vec3.Y) };
  }

  get target(): Asteroid {
    return this.asteroids[0]!;
  }

  get julianDate(): number {
    return julianDateFromUtc(this.data.gameDateUtcMs);
  }

  /** The region's position around the Sun at the game date, AU (J2000 ecliptic). */
  heliocentricAU(): Vec3 {
    return positionFromElements(keplerElementsAt(this.data.anchor.value, this.julianDate));
  }

  /** Turns a J2000 ecliptic direction into the game's world frame. */
  toGame(dirEcliptic: Vec3): Vec3 {
    const { e, g } = this.basis;
    return g[0].scale(dirEcliptic.dot(e[0])).add(g[1].scale(dirEcliptic.dot(e[1]))).add(g[2].scale(dirEcliptic.dot(e[2])));
  }

  /** Sun and planets as seen from here, with directions in the game frame. */
  sky(): Sky {
    const s = skyFrom(this.heliocentricAU(), this.julianDate);
    const turn = (b: SkyBody): SkyBody => ({ ...b, direction: this.toGame(b.direction) });
    return { sun: turn(s.sun), planets: s.planets.map(turn) };
  }

  boundary(position: Vec3): BoundaryStatus {
    const d = position.length();
    const toEdgeM = this.data.boundaryRadiusM - d;
    const zone: BoundaryZone = toEdgeM < 0 ? "outside" : toEdgeM < this.data.warningBandM ? "warning" : "inside";
    return { zone, distanceFromCentreM: d, toEdgeM };
  }

  /**
   * Velocity change for one step that keeps the ship in the flyable area: nothing well inside,
   * a push toward the centre that grows across the warning band, and past the edge the outward
   * velocity is cancelled as well. A game rule, not physics.
   */
  boundaryPush(position: Vec3, velocity: Vec3, dtS: number): Vec3 {
    const st = this.boundary(position);
    if (st.zone === "inside" || st.distanceFromCentreM === 0) return Vec3.ZERO;
    const out = position.scale(1 / st.distanceFromCentreM);
    const depth = Math.min(1, 1 - st.toEdgeM / this.data.warningBandM);
    let dv = out.scale(-BOUNDARY_PUSH_MS2 * depth * depth * dtS);
    if (st.zone === "outside") {
      const vOut = velocity.dot(out);
      if (vOut > 0) dv = dv.sub(out.scale(vOut));
    }
    return dv;
  }

  /**
   * Velocity change that stops the ship from flying into a rock or a catalogued asteroid other
   * than the current target (the target has real contact and landing). Removes the approaching part of
   * the velocity once inside a rock's hull plus margin. A game simplification.
   */
  avoidObstacles(position: Vec3, velocity: Vec3, target: Asteroid = this.target): Vec3 {
    let dv = Vec3.ZERO;
    const check = (centre: Vec3, radiusM: number) => {
      const rel = position.sub(centre);
      const d = rel.length();
      if (d === 0 || d > radiusM * OBSTACLE_HULL_FACTOR + OBSTACLE_MARGIN_M) return;
      const n = rel.scale(1 / d);
      const vIn = velocity.add(dv).dot(n);
      if (vIn < 0) dv = dv.sub(n.scale(vIn));
    };
    for (const a of this.asteroids) if (a !== target) check(a.position, a.meanRadiusM);
    for (const r of this.rocks) check(r.position, r.radiusM);
    return dv;
  }

  /** Everything the ship must steer around on the way to `target`: rocks and the other asteroids, as hull spheres plus margin. */
  obstaclesExcept(target: Asteroid): { centre: Vec3; radiusM: number }[] {
    const hull = (r: number) => r * OBSTACLE_HULL_FACTOR + OBSTACLE_MARGIN_M;
    return [
      ...this.asteroids.filter((a) => a !== target).map((a) => ({ centre: a.position, radiusM: hull(a.meanRadiusM) })),
      ...this.rocks.map((r) => ({ centre: r.position, radiusM: hull(r.radiusM) })),
    ];
  }

  /** Catalogued asteroid whose surface is closest to a point. */
  nearestAsteroid(position: Vec3): { asteroid: Asteroid; distanceM: number } {
    let best = { asteroid: this.asteroids[0]!, distanceM: Infinity };
    for (const a of this.asteroids) {
      const d = a.position.sub(position).length() - a.meanRadiusM;
      if (d < best.distanceM) best = { asteroid: a, distanceM: d };
    }
    return best;
  }
}

/** Right-handed orthonormal frame whose first axis is `a` and second is as close to `up` as possible. */
function frame(a: Vec3, up: Vec3): [Vec3, Vec3, Vec3] {
  let b = up.sub(a.scale(up.dot(a)));
  if (b.length() < 1e-9) b = Vec3.X.sub(a.scale(Vec3.X.dot(a)));
  b = b.normalize();
  return [a, b, a.cross(b)];
}
