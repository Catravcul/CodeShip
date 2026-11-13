import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import { G, type Sourced } from "@core/units";

/** Tholen/SMASS-style spectral classes used in the game. */
export type SpectralType = "B" | "C" | "S" | "M" | "X";

export interface CompositionEntry {
  readonly material: string;
  /** Mass fraction 0..1. Ranges are stored as [low, high]. */
  readonly massFraction: Sourced<[number, number]>;
}

export interface AsteroidData {
  readonly id: string;
  readonly name: string;
  readonly spectralType: Sourced<SpectralType>;
  /** Extents in metres (x, y, z). */
  readonly dimensionsM: Sourced<Vec3>;
  /** Volume-equivalent mean radius, metres. */
  readonly meanRadiusM: Sourced<number>;
  readonly massKg: Sourced<number>;
  readonly densityKgM3: Sourced<number>;
  readonly rotationPeriodH: Sourced<number>;
  readonly composition: readonly CompositionEntry[];
}

/** Distance from the centre to the surface along the ray through a point in the asteroid's own frame. */
export type SurfaceShape = (local: Vec3) => number;

export class Asteroid {
  private readonly shape: SurfaceShape;

  /** @param shape optional real surface; defaults to a sphere of the mean radius. */
  constructor(
    readonly data: AsteroidData,
    readonly position: Vec3,
    shape?: SurfaceShape,
  ) {
    this.shape = shape ?? (() => this.meanRadiusM);
  }

  /** Orientation after t seconds of spin around its own Y axis. */
  orientationAt(timeS: number): Quat {
    return Quat.fromAxisAngle(Vec3.Y, this.spinRadS * timeS);
  }

  toLocal(world: Vec3, timeS: number): Vec3 {
    return this.orientationAt(timeS).conjugate().rotate(world.sub(this.position));
  }

  toWorld(local: Vec3, timeS: number): Vec3 {
    return this.orientationAt(timeS).rotate(local).add(this.position);
  }

  /** Distance from the centre to the surface along the ray through a local point (the real shape). */
  surfaceRadius(local: Vec3): number {
    return this.shape(local);
  }

  /** Height above the real surface, metres (negative = inside). */
  surfaceDistance(world: Vec3, timeS: number): number {
    const local = this.toLocal(world, timeS);
    return local.length() - this.shape(local);
  }

  /** Velocity of the ground under a point, due to the asteroid's spin. */
  surfaceVelocity(world: Vec3): Vec3 {
    return new Vec3(0, this.spinRadS, 0).cross(world.sub(this.position));
  }

  get massKg(): number {
    return this.data.massKg.value;
  }

  /** Standard gravitational parameter, m^3/s^2. */
  get mu(): number {
    return G * this.massKg;
  }

  get meanRadiusM(): number {
    return this.data.meanRadiusM.value;
  }

  /** Spin rate around its own Y axis, rad/s. */
  get spinRadS(): number {
    return (2 * Math.PI) / (this.data.rotationPeriodH.value * 3600);
  }

  /** Point-mass gravitational acceleration at a world position, m/s^2 (clamped inside the body). */
  gravityAt(p: Vec3): Vec3 {
    const r = this.position.sub(p);
    const dist = Math.max(r.length(), this.meanRadiusM);
    return r.normalize().scale(this.mu / (dist * dist));
  }

  /** Kilograms of a material if the whole body were processed (mid value of the range). */
  materialKg(material: string): number {
    const e = this.data.composition.find((c) => c.material === material);
    if (!e) return 0;
    const [lo, hi] = e.massFraction.value;
    return this.massKg * ((lo + hi) / 2);
  }
}
