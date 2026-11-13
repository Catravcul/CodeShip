import { Vec3 } from "@core/math/vec3";

/**
 * Moving on a rubble-pile asteroid in a suit. Everything is in the asteroid's own (rotating) frame,
 * so the ground stays still and the spin shows up as centrifugal and Coriolis accelerations.
 *
 * On Bennu a step is impossible: escape speed is about 0.2 m/s, so a normal walk (≈1.4 m/s) would
 * throw her into space. She moves by holding on (crawling hand over hand on rocks), pushes off gently
 * to float, and uses a cold-gas jetpack (SAFER) and the safety tether to get back.
 */

/** Game tuning (labelled): speeds and grip rules, chosen to stay honest with the escape speed. */
export const EVA_TUNING = {
  /** Hand-over-hand crawl speed, m/s. Below escape speed so letting go never launches her. */
  crawlSpeedMs: 0.15,
  /** Gentle push-off with the legs; the suit's assist caps it well under escape speed. m/s. */
  pushOffMs: 0.04,
  /** Touching the ground slower than this she can grab a rock and hold on, m/s. */
  gripCatchMs: 0.3,
  /** Loose regolith (near-zero cohesion) absorbs most of a bounce. */
  restitution: 0.2,
  tangentialKeep: 0.5,
  /** Speed at which the airlock's tether winch reels her in, m/s. */
  reelSpeedMs: 0.12,
  /** Fixed physics step, s. */
  stepS: 1 / 60,
} as const;

export interface EvaWorld {
  /** Standard gravitational parameter G·M, m³/s². */
  readonly mu: number;
  /** Spin rate around the local +Y axis, rad/s. */
  readonly spinRadS: number;
  /** Distance from the centre to the surface along the ray through a local point (the real shape). */
  readonly surface: (local: Vec3) => number;
  /** Mean radius: gravity is clamped inside it (point mass, like the flight model). */
  readonly meanRadiusM: number;
  /** Optional solid things on the ground (the landed ship): returns the point pushed out of them. */
  readonly keepOut?: (local: Vec3) => Vec3;
}

export interface Tether {
  /** Where the tether is clipped (the airlock), local frame. */
  readonly anchor: Vec3;
  readonly lengthM: number;
}

export interface Jet {
  /** Acceleration at full stick, m/s². */
  readonly accelMs2: number;
  /** Δv budget, m/s. */
  readonly deltaVMs: number;
}

export interface EvaInput {
  /** Wanted crawl direction (local frame, projected on the ground), length 0..1. */
  readonly move: Vec3;
  /** Jetpack command (local frame), length 0..1. */
  readonly jet: Vec3;
  /** Push off the ground (only while holding on). */
  readonly pushOff: boolean;
  /** Reel the tether in. */
  readonly reel: boolean;
}

export const NO_EVA_INPUT: EvaInput = { move: Vec3.ZERO, jet: Vec3.ZERO, pushOff: false, reel: false };

export type EvaMode = "agarrada" | "flotando";

/** Escape speed √(2μ/r), m/s. */
export function escapeSpeed(mu: number, rM: number): number {
  return Math.sqrt((2 * mu) / rM);
}

/** Gravity (point mass) plus centrifugal acceleration at a point at rest on the ground, local frame. */
export function effectiveGravity(world: EvaWorld, p: Vec3): Vec3 {
  const r = p.length();
  const d = Math.max(r, world.meanRadiusM);
  const g = p.normalize().scale(-world.mu / (d * d));
  const w = new Vec3(0, world.spinRadS, 0);
  return g.sub(w.cross(w.cross(p)));
}

/** Height above the real surface, metres (negative = inside). */
export function heightAbove(world: EvaWorld, p: Vec3): number {
  return p.length() - world.surface(p);
}

/** The point of the ground under (along the ray of) a local point. */
export function groundUnder(world: EvaWorld, p: Vec3): Vec3 {
  const dir = p.normalize();
  return dir.scale(world.surface(dir.scale(world.meanRadiusM)));
}

/** Outward surface normal from the gradient of the height field (central differences). */
export function surfaceNormal(world: EvaWorld, p: Vec3, eps = 0.05): Vec3 {
  const h = (q: Vec3) => heightAbove(world, q);
  const n = new Vec3(
    h(p.add(new Vec3(eps, 0, 0))) - h(p.sub(new Vec3(eps, 0, 0))),
    h(p.add(new Vec3(0, eps, 0))) - h(p.sub(new Vec3(0, eps, 0))),
    h(p.add(new Vec3(0, 0, eps))) - h(p.sub(new Vec3(0, 0, eps))),
  ).normalize();
  return n.length() === 0 ? p.normalize() : n;
}

/**
 * Doménica's feet on the asteroid: holding on or floating. Deterministic; never below the ground.
 */
export class EvaBody {
  private _p: Vec3;
  private _v = Vec3.ZERO;
  private _mode: EvaMode = "agarrada";
  private _jetLeft: number;
  private _taut = false;
  private acc = 0;

  constructor(
    readonly world: EvaWorld,
    start: Vec3,
    readonly tether: Tether,
    readonly jet: Jet,
  ) {
    this._p = groundUnder(world, start);
    this._jetLeft = jet.deltaVMs;
  }

  get position(): Vec3 {
    return this._p;
  }
  /** Velocity relative to the ground, m/s. */
  get velocity(): Vec3 {
    return this._v;
  }
  get mode(): EvaMode {
    return this._mode;
  }
  get jetDeltaVLeft(): number {
    return this._jetLeft;
  }
  get heightM(): number {
    return Math.max(0, heightAbove(this.world, this._p));
  }
  get normal(): Vec3 {
    return surfaceNormal(this.world, this._p);
  }
  get distanceToAnchor(): number {
    return this._p.sub(this.tether.anchor).length();
  }
  /** The tether is at full length and holding her. */
  get tetherTaut(): boolean {
    return this._taut;
  }
  /** Inertial velocity (ground velocity due to spin + her own), m/s. */
  get inertialVelocity(): Vec3 {
    return this._v.add(new Vec3(0, this.world.spinRadS, 0).cross(this._p));
  }
  get escapeSpeedMs(): number {
    return escapeSpeed(this.world.mu, this._p.length());
  }
  /** Unbound from the asteroid: fast enough to leave it for good if nothing holds her. */
  get escaping(): boolean {
    const v = this.inertialVelocity.length();
    return 0.5 * v * v - this.world.mu / Math.max(this._p.length(), this.world.meanRadiusM) > 0;
  }

  update(dtS: number, input: EvaInput): void {
    this.acc += dtS;
    const h = EVA_TUNING.stepS;
    while (this.acc >= h - 1e-12) {
      this.step(h, input);
      this.acc -= h;
    }
  }

  /** Come to rest where she holds on (lying down on the ground). */
  stop(): void {
    if (this._mode === "agarrada") this._v = Vec3.ZERO;
  }

  /** Instant change of velocity (local frame); lets go of the ground. */
  applyImpulse(dv: Vec3): void {
    this._mode = "flotando";
    this._v = this._v.add(dv);
  }

  private step(dt: number, input: EvaInput): void {
    if (this._mode === "agarrada") this.crawl(dt, input);
    else this.float(dt, input);
  }

  private crawl(dt: number, input: EvaInput): void {
    const n = this.normal;
    if (input.pushOff) {
      this._mode = "flotando";
      this._v = this.tangent(input.move, n).scale(EVA_TUNING.crawlSpeedMs).add(n.scale(EVA_TUNING.pushOffMs));
      return;
    }
    // Firing the jetpack away from the ground lets go; sideways she keeps holding on.
    if (input.jet.dot(n) > 0.05 && this._jetLeft > 0) {
      this._mode = "flotando";
      this._v = Vec3.ZERO;
      this.float(dt, input);
      return;
    }
    let move = input.move;
    if (input.reel) move = this.tether.anchor.sub(this._p);
    const v = this.tangent(move, n).scale(EVA_TUNING.crawlSpeedMs);
    const next = groundUnder(this.world, this.keepOut(this._p.add(v.scale(dt))));
    const before = this.distanceToAnchor;
    const after = next.sub(this.tether.anchor).length();
    this._taut = after >= this.tether.lengthM && after > before;
    if (this._taut) {
      this._v = Vec3.ZERO;
      return;
    }
    this._v = next.sub(this._p).scale(1 / dt);
    this._p = next;
  }

  private float(dt: number, input: EvaInput): void {
    const w = new Vec3(0, this.world.spinRadS, 0);
    // Rotating frame: gravity + centrifugal, Coriolis, and the jetpack while it has gas.
    let a = effectiveGravity(this.world, this._p).sub(w.cross(this._v).scale(2));
    const jet = input.jet.length() > 1 ? input.jet.normalize() : input.jet;
    if (jet.length() > 0 && this._jetLeft > 0) {
      const dv = Math.min(this._jetLeft, jet.length() * this.jet.accelMs2 * dt);
      this._jetLeft -= dv;
      a = a.add(jet.normalize().scale(dv / dt));
    }
    this._v = this._v.add(a.scale(dt));
    const free = this._p.add(this._v.scale(dt));
    this._p = this.keepOut(free);
    const pushed = this._p.sub(free);
    if (pushed.length() > 0) {
      const u = pushed.normalize();
      const into = this._v.dot(u);
      if (into < 0) this._v = this._v.sub(u.scale(into));
    }

    // The tether: taut at full length (absorbs outward speed); the winch pulls her in.
    let d = this._p.sub(this.tether.anchor);
    const dist = d.length();
    this._taut = false;
    if (dist > this.tether.lengthM) {
      d = d.normalize();
      this._p = this.tether.anchor.add(d.scale(this.tether.lengthM));
      const out = this._v.dot(d);
      if (out > 0) this._v = this._v.sub(d.scale(out));
      this._taut = true;
    }
    if (input.reel && dist > 0.5) {
      const u = d.normalize();
      const inward = -this._v.dot(u);
      if (inward < EVA_TUNING.reelSpeedMs) this._v = this._v.add(u.scale(-(EVA_TUNING.reelSpeedMs - inward)));
    }

    // Never sink into the ground: project out, then grab on if slow enough or bounce off the regolith.
    if (heightAbove(this.world, this._p) <= 0) {
      this._p = groundUnder(this.world, this._p);
      const n = this.normal;
      const vn = this._v.dot(n);
      if (vn < 0) {
        if (this._v.length() < EVA_TUNING.gripCatchMs) {
          this._mode = "agarrada";
          this._v = Vec3.ZERO;
        } else {
          const tangential = this._v.sub(n.scale(vn)).scale(EVA_TUNING.tangentialKeep);
          this._v = tangential.add(n.scale(-vn * EVA_TUNING.restitution));
        }
      }
    }
  }

  private keepOut(p: Vec3): Vec3 {
    return this.world.keepOut ? this.world.keepOut(p) : p;
  }

  /** Project a wanted direction onto the ground plane, keeping its length (≤ 1). */
  private tangent(m: Vec3, n: Vec3): Vec3 {
    const t = m.sub(n.scale(m.dot(n)));
    const len = Math.min(1, m.length());
    return t.length() < 1e-9 ? Vec3.ZERO : t.normalize().scale(len);
  }
}
