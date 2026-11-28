import { Vec3 } from "@core/math/vec3";
import { G0 } from "@core/units";

/**
 * Artificial gravity from spin. A ring that turns at ω pushes everything on its floor outward with
 * a = ω²r: that push is the only "gravity" a ship can have (docs/design/gravedad.md).
 *
 * Ring frame used throughout (it matches the interior scene): x along the spin axis, y "up" (from the
 * floor toward the axis), z spinward (the direction the floor moves). Heights are above the rim floor.
 */

export const rpmToRadS = (rpm: number): number => (rpm * 2 * Math.PI) / 60;
export const radSToRpm = (w: number): number => (w * 60) / (2 * Math.PI);

/** a = ω²r, m/s². */
export function centripetalAcceleration(omegaRadS: number, radiusM: number): number {
  return omegaRadS * omegaRadS * radiusM;
}

/** Floor radius that gives `accelMs2` at `rpm`. */
export function radiusForGravity(accelMs2: number, rpm: number): number {
  const w = rpmToRadS(rpm);
  return accelMs2 / (w * w);
}

/** Spin rate that gives `accelMs2` at `radiusM`. */
export function rpmForGravity(accelMs2: number, radiusM: number): number {
  return radSToRpm(Math.sqrt(accelMs2 / radiusM));
}

export interface RingSpec {
  readonly name: string;
  /** Distance from the spin axis to the floor of the decks, m. */
  readonly floorRadiusM: number;
  /** Width along the spin axis, m. */
  readonly widthM: number;
  /** Tallest deck (floor to ceiling), m. */
  readonly deckHeightM: number;
  /** Cruise spin rate. */
  readonly rpm: number;
  /** Angular acceleration the spin motor gives when spinning up or down, rad/s². */
  readonly spinUpRadS2: number;
  /** A twin ring turns the other way, so the ship carries no net angular momentum. */
  readonly counterRotating: boolean;
  readonly sources: readonly string[];
}

/** One author's comfort boundaries (Hall 1999, table 1). Missing fields = that author set no limit. */
export interface ComfortLimit {
  readonly id: string;
  readonly author: string;
  readonly year: number;
  readonly maxRpm?: number;
  readonly minG?: number;
  readonly maxG?: number;
  readonly minRimSpeedMs?: number;
  /** Head-to-foot change as a fraction of floor gravity. */
  readonly maxGradient?: number;
  /** Head-to-foot change in g (Cramer gives it as an absolute value). */
  readonly maxGradientG?: number;
  readonly source: string;
}

export interface ComfortResult {
  readonly limit: ComfortLimit;
  readonly ok: boolean;
  readonly failures: readonly string[];
}

/** Floor gravity may be up to this much over a "1 g" limit and still count (rounding of radius/rpm). */
const G_TOLERANCE = 1.01;

/** Which comfort limits from the literature a ring meets, for a person `bodyHeightM` tall. */
export function checkComfort(spec: RingSpec, limits: readonly ComfortLimit[], bodyHeightM: number): ComfortResult[] {
  const w = rpmToRadS(spec.rpm);
  const g = centripetalAcceleration(w, spec.floorRadiusM) / G0;
  const rim = w * spec.floorRadiusM;
  const gradient = bodyHeightM / spec.floorRadiusM;
  return limits.map((l) => {
    const f: string[] = [];
    if (l.maxRpm !== undefined && spec.rpm > l.maxRpm) f.push(`${spec.rpm} rpm > ${l.maxRpm} rpm`);
    if (l.minG !== undefined && g < l.minG) f.push(`${g.toFixed(2)} g < ${l.minG} g`);
    if (l.maxG !== undefined && g > l.maxG * G_TOLERANCE) f.push(`${g.toFixed(2)} g > ${l.maxG} g`);
    if (l.minRimSpeedMs !== undefined && rim < l.minRimSpeedMs) f.push(`borde a ${rim.toFixed(1)} m/s < ${l.minRimSpeedMs} m/s`);
    if (l.maxGradient !== undefined && gradient > l.maxGradient) f.push(`gradiente ${(gradient * 100).toFixed(1)} % > ${l.maxGradient * 100} %`);
    if (l.maxGradientG !== undefined && gradient * g > l.maxGradientG) f.push(`gradiente ${(gradient * g).toFixed(3)} g > ${l.maxGradientG} g`);
    return { limit: l, ok: f.length === 0, failures: f };
  });
}

export interface Release {
  /** Path in the ring frame (x axial, y height above floor, z along the floor, spinward +). */
  readonly points: readonly Vec3[];
  readonly timeS: number;
  /** Where it touches the floor (y = 0). */
  readonly landing: Vec3;
}

/** A spinning ring: its spin state and what anyone inside feels. */
export class SpinRing {
  private omega: number;
  private target: number;

  constructor(
    readonly spec: RingSpec,
    spinning = true,
  ) {
    this.target = rpmToRadS(spec.rpm);
    this.omega = spinning ? this.target : 0;
  }

  get omegaRadS(): number {
    return this.omega;
  }
  get rpm(): number {
    return radSToRpm(this.omega);
  }
  /** 0 stopped … 1 at cruise spin. */
  get spinFraction(): number {
    const full = rpmToRadS(this.spec.rpm);
    return full === 0 ? 0 : this.omega / full;
  }
  get spinningUp(): boolean {
    return this.omega < this.target;
  }

  spinUp(): void {
    this.target = rpmToRadS(this.spec.rpm);
  }
  spinDown(): void {
    this.target = 0;
  }

  /** Advance the spin motor `dtS` seconds toward the target rate. */
  tick(dtS: number): void {
    const step = this.spec.spinUpRadS2 * dtS;
    this.omega = this.omega < this.target ? Math.min(this.target, this.omega + step) : Math.max(this.target, this.omega - step);
  }

  /** Apparent gravity at `radiusM` from the axis, m/s². */
  gravityAtRadius(radiusM: number): number {
    return centripetalAcceleration(this.omega, Math.max(0, radiusM));
  }
  /** Same, in multiples of standard gravity. */
  gravityG(radiusM: number): number {
    return this.gravityAtRadius(radiusM) / G0;
  }
  /** Apparent gravity `heightM` above the rim floor (it falls linearly toward the axis). */
  gravityAtHeight(heightM: number): number {
    return this.gravityAtRadius(this.spec.floorRadiusM - heightM);
  }
  /** Head-to-foot drop in gravity as a fraction of the floor value: h / R, whatever the spin rate. */
  gradient(heightM: number): number {
    return heightM / this.spec.floorRadiusM;
  }
  /** Speed of the floor through space, m/s. */
  get rimSpeedMs(): number {
    return this.omega * this.spec.floorRadiusM;
  }
  /** Apparent weight while walking along the floor at `speedMs` (spinward +), as a factor of standing weight. */
  walkingWeightFactor(speedMs: number): number {
    const rim = this.rimSpeedMs;
    return rim === 0 ? 0 : (1 + speedMs / rim) ** 2;
  }

  /** Spin vector in the ring frame: about −x, so the floor below the axis moves toward +z. */
  private get omegaVec(): Vec3 {
    return new Vec3(-this.omega, 0, 0);
  }

  /** Coriolis acceleration −2ω×v on something moving at `v` in the ring frame, m/s². */
  coriolis(v: Vec3): Vec3 {
    return this.omegaVec.cross(v).scale(-2);
  }

  /**
   * Centrifugal plus Coriolis acceleration felt at `fromAxis` (position relative to the spin axis,
   * ring frame) while moving at `v`. On the floor: ω²R straight down.
   */
  apparentAcceleration(fromAxis: Vec3, v: Vec3): Vec3 {
    const w2 = this.omega * this.omega;
    return new Vec3(0, fromAxis.y * w2, fromAxis.z * w2).add(this.coriolis(v));
  }

  /**
   * Exact path of an object let go at `start` with velocity `v` (both ring frame). Seen from outside,
   * it flies in a straight line until it meets the floor, which has turned meanwhile. Undefined if it
   * never reaches the floor (ring stopped, or thrown along the axis at rest).
   */
  release(start: Vec3, v: Vec3, samples = 24): Release | undefined {
    const R = this.spec.floorRadiusM;
    const w = this.omega;
    // Inertial plane ⊥ axis: u spinward at the release point, up toward the axis; axis at the origin.
    const r0 = R - start.y;
    const pu = start.z * (r0 / R);
    const pw = -r0;
    const vu = w * r0 + v.z;
    const vw = v.y;
    const a = vu * vu + vw * vw;
    if (a < 1e-12) return undefined;
    const b = 2 * (pu * vu + pw * vw);
    const c = pu * pu + pw * pw - R * R;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return undefined;
    const tHit = (-b + Math.sqrt(disc)) / (2 * a);
    if (!(tHit > 0)) return undefined;
    const at = (t: number): Vec3 => {
      const u = pu + vu * t;
      const ww = pw + vw * t;
      const rho = Math.hypot(u, ww);
      const phi = Math.atan2(u, -ww) - w * t;
      return new Vec3(start.x + v.x * t, R - rho, R * phi);
    };
    const points: Vec3[] = [];
    for (let i = 0; i <= samples; i++) points.push(at((tHit * i) / samples));
    const landing = new Vec3(points[samples]!.x, 0, points[samples]!.z);
    points[samples] = landing;
    return { points, timeS: tHit, landing };
  }

  /** Where the same throw would land under uniform gravity of the floor value (no Coriolis). */
  flatLanding(start: Vec3, v: Vec3): Vec3 {
    const g = this.gravityAtHeight(0);
    const t = (v.y + Math.sqrt(v.y * v.y + 2 * g * start.y)) / g;
    return new Vec3(start.x + v.x * t, 0, start.z + v.z * t);
  }

  /** How far along the floor something dropped from `heightM` lands from the point below it (− = antispinward). */
  dropDrift(heightM: number): number {
    return this.release(new Vec3(0, heightM, 0), Vec3.ZERO)?.landing.z ?? 0;
  }
}
