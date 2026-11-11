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

export class Asteroid {
  constructor(
    readonly data: AsteroidData,
    readonly position: Vec3,
  ) {}

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
