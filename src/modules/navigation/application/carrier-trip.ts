import type { Quat } from "@core/math/quat";
import type { Vec3 } from "@core/math/vec3";
import type { DockingTarget } from "@modules/mothership/domain/docking";
import { burnSeconds, continuousBurnDistance, type ContinuousBurnPlan } from "../domain/transfer";

/** The mothership closing on a station's port at the end of a trip (the berthing use case). */
export interface BerthRun {
  readonly status: "approach" | "docked" | "failed";
  readonly remainingM: number;
  readonly speedMs: number;
  /** Game seconds left of the approach (holds included). */
  readonly remainingS: number;
  advance(gameS: number): void;
}

/** What navigation needs from the mothership (and its docking port) to move it with the probe aboard. */
export interface CarrierPort {
  readonly name: string;
  readonly position: Vec3;
  readonly orientation: Quat;
  readonly thrustN: number;
  readonly thrusterCount: number;
  /** What pushes it, for the trip's texts («propulsores eléctricos», «motores Raptor de vacío»). Default electric. */
  readonly engineName?: string;
  /** What its tanks hold («xenón», «metano y oxígeno»). Default xenon. */
  readonly propellantName?: string;
  /** Top speed of a hop of this length (a chemical ship coasts at it); none: it pushes all the way. */
  cruiseFor?(distanceM: number): number;
  readonly massKg: number;
  readonly accelerationMs2: number;
  deltaV(): number;
  burnDays(deltaVMs: number): number;
  propellantFor(deltaVMs: number): number;
  /** Spend propellant; false if there is not enough. */
  burn(deltaVMs: number): boolean;
  moveTo(position: Vec3, orientation?: Quat): void;
  /** Where to park for a target, seen from `from`. */
  parkingPoint(target: { position: Vec3; meanRadiusM: number }, from: Vec3): Vec3;
  /** Parking height above the surface, metres. */
  readonly parkingM: number;
  /** Radius the route keeps clear around the whole ship (rings and spine), metres. */
  readonly clearanceM: number;
  /** The probe is docked to this carrier. */
  docked(): boolean;
  undock(): void;
  /** Id of the port the carrier itself is docked at (a station's), if any. */
  dockedTo?(): string | undefined;
  /** When docked at a station: the point on its port axis to back out to before a trip. */
  departure?(): Vec3 | undefined;
  /** Let go of the station's port (start of a trip). */
  release?(): void;
  /** Where the carrier stops before docking at `port`, already turned for the approach. */
  berthStandoff?(port: DockingTarget): { position: Vec3; orientation: Quat };
  /** Start the last approach and docking at `port` from where it is. */
  berth?(port: DockingTarget): BerthRun;
}

/** Game value: the mothership's hours-long hops play in time-lapse, this many game seconds per real second (before time warp). */
export const CARRIER_TIMELAPSE = 1000;

export type CarrierPhase = "burn" | "flip" | "brake" | "coast";

/**
 * The mothership flying a continuous-burn hop along a route (waypoints round the rocks), in
 * game time. The docked probe rides along because its pose is read from the mothership.
 */
export class CarrierTrip {
  private t = 0;
  private readonly legs: { from: Vec3; to: Vec3; len: number }[] = [];

  constructor(
    private readonly carrier: CarrierPort,
    from: Vec3,
    path: readonly Vec3[],
    readonly plan: ContinuousBurnPlan,
    private readonly orientation: Quat,
  ) {
    let p = from;
    for (const w of path) {
      this.legs.push({ from: p, to: w, len: w.sub(p).length() });
      p = w;
    }
    carrier.moveTo(from, orientation);
  }

  get elapsedS(): number {
    return this.t;
  }
  get done(): boolean {
    return this.t >= this.plan.totalS;
  }
  get remainingS(): number {
    return Math.max(0, this.plan.totalS - this.t);
  }
  get fraction(): number {
    return this.plan.totalS > 0 ? Math.min(1, this.t / this.plan.totalS) : 1;
  }
  get travelledM(): number {
    return continuousBurnDistance(this.plan, this.t);
  }
  get speedMS(): number {
    const T = this.plan.totalS;
    return Math.min(this.plan.peakMS, this.plan.accelMS2 * Math.min(this.t, Math.max(0, T - this.t)));
  }
  get phase(): CarrierPhase {
    const coast = this.plan.coastS ?? 0;
    if (coast > 0) {
      // Burn, coast (turning round at its end), brake.
      const tb = burnSeconds(this.plan);
      if (this.t < tb) return "burn";
      if (this.t > this.plan.totalS - tb) return "brake";
      return this.plan.totalS - tb - this.t < 0.02 * this.plan.totalS ? "flip" : "coast";
    }
    const f = this.fraction;
    return Math.abs(f - 0.5) < 0.02 ? "flip" : f < 0.5 ? "burn" : "brake";
  }

  /** Advance `gameS` seconds and move the mothership along the route. */
  advance(gameS: number): void {
    this.t = Math.min(this.plan.totalS, this.t + Math.max(0, gameS));
    // The path is longer than the plan's straight-line share only by the detours: scale onto it.
    const total = this.legs.reduce((s, l) => s + l.len, 0);
    let s = this.plan.distanceM > 0 ? (continuousBurnDistance(this.plan, this.t) / this.plan.distanceM) * total : total;
    for (const l of this.legs) {
      if (s <= l.len || l === this.legs[this.legs.length - 1]) {
        const k = l.len > 0 ? Math.min(1, s / l.len) : 1;
        this.carrier.moveTo(l.from.add(l.to.sub(l.from).scale(k)), this.orientation);
        return;
      }
      s -= l.len;
    }
  }
}

/**
 * Hand flying (docs/design/reglas.md §3.6): the crew commands the speed along the planned route in short
 * translation burns, as on a proximity approach (Hayabusa2 descended at a commanded 40 cm/s). Game values
 * (Starship's crew controls are not published: in development): steps of 0,1 m/s, a top of 1 m/s, and the
 * ship counts as parked within `arriveM` of the end at no more than `holdMs`.
 */
export const MANUAL_CARRIER = { stepMs: 0.1, maxMs: 1, arriveM: 100, holdMs: 0.05 } as const;

export class ManualCarrierRun {
  private s = 0;
  private v = 0;
  private readonly legs: { from: Vec3; to: Vec3; len: number }[] = [];
  /** Δv spent so far, m/s. */
  spentMs = 0;
  /** Why the last command could not be done (no propellant), if so. */
  refused: string | undefined;

  constructor(
    private readonly carrier: CarrierPort,
    from: Vec3,
    path: readonly Vec3[],
    private readonly orientation: Quat,
  ) {
    let p = from;
    for (const w of path) {
      this.legs.push({ from: p, to: w, len: w.sub(p).length() });
      p = w;
    }
    carrier.moveTo(from, orientation);
  }

  get lengthM(): number {
    return this.legs.reduce((a, l) => a + l.len, 0);
  }
  /** Distance left to the end of the route, m (negative: past it). */
  get remainingM(): number {
    return this.lengthM - this.s;
  }
  get speedMs(): number {
    return this.v;
  }
  /** Parked: close enough to the end and nearly still. */
  get arrived(): boolean {
    return Math.abs(this.remainingM) <= MANUAL_CARRIER.arriveM && Math.abs(this.v) <= MANUAL_CARRIER.holdMs + 1e-9;
  }
  get fraction(): number {
    return Math.max(0, Math.min(1, this.s / Math.max(1, this.lengthM)));
  }

  /** One translation burn: change the speed along the route by `dvMs` (spends propellant). */
  command(dvMs: number): boolean {
    const next = Math.max(-MANUAL_CARRIER.maxMs, Math.min(MANUAL_CARRIER.maxMs, Math.round((this.v + dvMs) * 100) / 100));
    const dv = Math.abs(next - this.v);
    if (dv < 1e-9) return true;
    if (!this.carrier.burn(dv)) {
      this.refused = "Sin propelente para encender";
      return false;
    }
    this.refused = undefined;
    this.spentMs += dv;
    this.v = next;
    return true;
  }

  /** Stop dead (a burn of the speed it has). */
  hold(): boolean {
    return this.command(-this.v);
  }

  /** Let `gameS` pass at the commanded speed and move the ship along the route (past its end: straight on). */
  advance(gameS: number): void {
    this.s = Math.max(0, this.s + this.v * Math.max(0, gameS));
    let s = this.s;
    for (const l of this.legs) {
      if (s <= l.len || l === this.legs[this.legs.length - 1]) {
        const k = l.len > 0 ? s / l.len : 1;
        this.carrier.moveTo(l.from.add(l.to.sub(l.from).scale(k)), this.orientation);
        return;
      }
      s -= l.len;
    }
  }
}
