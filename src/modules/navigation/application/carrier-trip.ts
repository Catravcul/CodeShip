import type { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import type { DockingTarget } from "@modules/mothership/domain/docking";
import type { ManualBerthing, Unberthing } from "@modules/mothership/application/berthing";
import { burnSeconds, continuousBurnDistance, type ContinuousBurnPlan } from "../domain/transfer";
import { angleBetween, facing, turnToward } from "../domain/attitude";

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
  /** The last approach to `port` flown by hand (the docking station). */
  manualBerth?(port: DockingTarget): ManualBerthing;
  /** Undock from `port` and back out to Waypoint 1. */
  unberth?(port: DockingTarget): Unberthing;
}

/** Game value: the mothership's hours-long hops play in time-lapse, this many game seconds per real second (before time warp). */
export const CARRIER_TIMELAPSE = 1000;

export type CarrierPhase = "aim" | "burn" | "flip" | "brake" | "coast";

/**
 * How fast the mothership turns, °/s: a game value (en desarrollo; Starship's attitude rates are not published),
 * of the order of a crewed ship's slow manoeuvres. The 180° flip before braking takes 3 game minutes.
 */
export const CARRIER_SLEW_DEG_S = 1;
const SLEW_RAD_S = (CARRIER_SLEW_DEG_S * Math.PI) / 180;
/** Aligned within this, rad. */
const ALIGNED_RAD = 1e-3;

/** Legs of a route, walked by distance: where along it and which way it runs. */
class Route {
  readonly legs: { from: Vec3; to: Vec3; len: number }[] = [];
  constructor(from: Vec3, path: readonly Vec3[]) {
    let p = from;
    for (const w of path) {
      this.legs.push({ from: p, to: w, len: w.sub(p).length() });
      p = w;
    }
  }
  get length(): number {
    return this.legs.reduce((a, l) => a + l.len, 0);
  }
  /** Point and unit direction `s` metres along (past the end: straight on). */
  at(s: number, clampEnd: boolean): { position: Vec3; dir: Vec3 } {
    for (const l of this.legs) {
      if (s <= l.len || l === this.legs[this.legs.length - 1]) {
        const k = l.len > 0 ? (clampEnd ? Math.min(1, s / l.len) : s / l.len) : 1;
        const dir = l.len > 0 ? l.to.sub(l.from).normalize() : Vec3.Z.scale(-1);
        return { position: l.from.add(l.to.sub(l.from).scale(k)), dir };
      }
      s -= l.len;
    }
    return { position: Vec3.ZERO, dir: Vec3.Z.scale(-1) };
  }
}

/**
 * The mothership flying a continuous-burn hop along a route (waypoints round the rocks), in
 * game time. The docked probe rides along because its pose is read from the mothership.
 * It flies, not slides: it first turns its nose (body −z, the main engines aft) along the route, burns,
 * coasts, flips 180° so the engines face the way it goes, brakes, and at the end turns to `orientation`
 * (at a station, the standoff attitude on the port axis), all at {@link CARRIER_SLEW_DEG_S}.
 */
/**
 * Game seconds a hop spends only turning: from `start` onto the route before the burn, and at the end from
 * braking (engines first) to `end`, if given. The flip itself happens inside the plan's coast or burn.
 */
export function carrierTurnSeconds(start: Quat, from: Vec3, path: readonly Vec3[], end?: Quat, backingOut = false): number {
  const route = new Route(from, path);
  const up = (end ?? start).rotate(Vec3.Y);
  const first = backingOut ? 0 : angleBetween(start, facing(route.at(0, true).dir, up));
  const last = end ? angleBetween(facing(route.at(route.length, true).dir.scale(-1), up), end) : 0;
  return (first + last) / SLEW_RAD_S;
}

/** What a hop was started with (its start pose included): enough to fly it again to the same point (a saved game). */
export interface CarrierTripStart {
  readonly from: Vec3;
  readonly startQ: Quat;
  readonly path: readonly Vec3[];
  readonly plan: ContinuousBurnPlan;
  readonly orientation?: Quat;
  readonly backingOut: boolean;
}

/** Game seconds per step when a saved hop is flown again to where it was (about one frame of a trip at ×60). */
const REPLAY_STEP_S = 1;

export class CarrierTrip {
  private t = 0;
  /** Game seconds advanced since it started (turns included). */
  private advanced = 0;
  /** How it started, for a saved game. */
  readonly started: CarrierTripStart;
  private readonly route: Route;
  private att: Quat;
  /** The first turn onto the route, before the burn. */
  private aimed = false;
  private readonly up: Vec3;
  /** Plan seconds at which it starts the flip (it is retrograde from there on). */
  private readonly flipAtS: number;
  /** Whether the attitude is changing now (RCS firing), for the model. */
  turning = false;
  /** The attitude it ends in. */
  private readonly orientation: Quat;
  private readonly start: Quat;

  constructor(
    private readonly carrier: CarrierPort,
    from: Vec3,
    path: readonly Vec3[],
    readonly plan: ContinuousBurnPlan,
    orientation?: Quat,
    /** Leaving a station's port: the first leg backs out on the RCS in the berthed attitude; it turns after it. */
    private readonly backingOut = false,
  ) {
    this.route = new Route(from, path);
    this.att = carrier.orientation;
    this.start = carrier.orientation;
    this.started = { from, startQ: carrier.orientation, path: [...path], plan, ...(orientation ? { orientation } : {}), backingOut };
    this.aimed = backingOut;
    this.up = (orientation ?? carrier.orientation).rotate(Vec3.Y);
    // No final attitude asked (a parking point): it stays as it braked, engines toward the way it came.
    this.orientation = orientation ?? this.retrograde(this.route.at(this.route.length, true).dir);
    const flipS = Math.PI / SLEW_RAD_S;
    // With a coast, the flip ends as the braking burn starts; with none, it straddles the turnaround.
    const coasts = (plan.coastS ?? 0) > 0;
    const brakeAt = coasts ? plan.totalS - burnSeconds(plan) : plan.totalS / 2;
    this.flipAtS = coasts ? Math.max(burnSeconds(plan), brakeAt - flipS) : Math.max(0, brakeAt - flipS / 2);
    carrier.moveTo(from, this.att);
  }

  private prograde(dir: Vec3): Quat {
    return facing(dir, this.up);
  }
  private retrograde(dir: Vec3): Quat {
    return facing(dir.scale(-1), this.up);
  }
  /** The attitude it wants at plan time `t` on a leg running along `dir`. */
  private wanted(dir: Vec3): Quat {
    if (this.t >= this.plan.totalS) return this.orientation;
    if (this.backingOut && this.distanceAlong() < (this.route.legs[0]?.len ?? 0)) return this.start;
    return this.t < this.flipAtS ? this.prograde(dir) : this.retrograde(dir);
  }

  /**
   * A saved hop flown again from its start to where it was (`gameS` advanced): the same steps the trip took, so
   * the mothership ends at the same point with the same attitude and phase.
   */
  static replay(carrier: CarrierPort, s: CarrierTripStart, gameS: number): CarrierTrip {
    carrier.moveTo(s.from, s.startQ);
    const trip = new CarrierTrip(carrier, s.from, s.path, s.plan, s.orientation, s.backingOut);
    for (let left = Math.max(0, gameS); left > 0; left -= REPLAY_STEP_S) trip.advance(Math.min(REPLAY_STEP_S, left));
    return trip;
  }

  get elapsedS(): number {
    return this.t;
  }
  /** Game seconds advanced since it started (its turns included). */
  get advancedS(): number {
    return this.advanced;
  }
  get done(): boolean {
    return this.t >= this.plan.totalS && angleBetween(this.att, this.orientation) <= ALIGNED_RAD;
  }
  /** Game seconds left: the first turn, the plan and the last turn. */
  get remainingS(): number {
    const first = this.aimed ? 0 : angleBetween(this.att, this.prograde(this.route.at(0, true).dir)) / SLEW_RAD_S;
    const endDir = this.route.at(this.route.length, true).dir;
    const last = angleBetween(this.t >= this.plan.totalS ? this.att : this.retrograde(endDir), this.orientation) / SLEW_RAD_S;
    return first + Math.max(0, this.plan.totalS - this.t) + last;
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
    if (!this.aimed || this.t >= this.plan.totalS) return "aim";
    const coast = this.plan.coastS ?? 0;
    const turningRound = this.t >= this.flipAtS && angleBetween(this.att, this.retrograde(this.route.at(this.distanceAlong(), true).dir)) > ALIGNED_RAD;
    if (coast > 0) {
      // Burn, coast (turning round at its end), brake.
      const tb = burnSeconds(this.plan);
      if (this.t < tb) return "burn";
      if (this.t > this.plan.totalS - tb) return turningRound ? "flip" : "brake";
      return turningRound ? "flip" : "coast";
    }
    if (turningRound) return "flip";
    return this.fraction < 0.5 ? "burn" : "brake";
  }
  /** The ship's current attitude. */
  get attitude(): Quat {
    return this.att;
  }

  /** Metres along the route at plan time `t` (the plan's straight-line share scaled onto the detours). */
  private distanceAlong(): number {
    const total = this.route.length;
    return this.plan.distanceM > 0 ? (continuousBurnDistance(this.plan, this.t) / this.plan.distanceM) * total : total;
  }

  /** Advance `gameS` seconds: turn, then move the mothership along the route. */
  advance(gameS: number): void {
    let left = Math.max(0, gameS);
    this.advanced += left;
    const before = this.att;
    if (!this.aimed) {
      const want = this.prograde(this.route.at(0, true).dir);
      const need = angleBetween(this.att, want) / SLEW_RAD_S;
      const use = Math.min(left, need);
      this.att = turnToward(this.att, want, SLEW_RAD_S * use);
      left -= use;
      if (angleBetween(this.att, want) <= ALIGNED_RAD) this.aimed = true;
    }
    if (this.aimed && left > 0) {
      const used = Math.min(left, Math.max(0, this.plan.totalS - this.t));
      this.t += used;
      left -= used;
      const here = this.route.at(this.distanceAlong(), true);
      this.att = turnToward(this.att, this.wanted(here.dir), SLEW_RAD_S * used);
      if (this.t >= this.plan.totalS) this.att = turnToward(this.att, this.orientation, SLEW_RAD_S * left);
    }
    this.turning = angleBetween(before, this.att) > 1e-6;
    this.carrier.moveTo(this.route.at(this.aimed ? this.distanceAlong() : 0, true).position, this.att);
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
  private readonly route: Route;
  private att: Quat;
  /** Whether the attitude is changing now (RCS firing), for the model. */
  turning = false;
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
    this.route = new Route(from, path);
    // It turns to the run's attitude at the slew rate (RCS), never in one jump.
    this.att = carrier.orientation;
    carrier.moveTo(from, this.att);
  }

  get lengthM(): number {
    return this.route.length;
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
    const dt = Math.max(0, gameS);
    this.s = Math.max(0, this.s + this.v * dt);
    const before = this.att;
    this.att = turnToward(this.att, this.orientation, SLEW_RAD_S * dt);
    this.turning = angleBetween(before, this.att) > 1e-6;
    this.carrier.moveTo(this.route.at(this.s, false).position, this.att);
  }
}
