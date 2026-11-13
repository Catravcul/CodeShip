import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import type { FlightComputer, FlightTarget } from "@modules/flight/application/flight-computer";
import { ChoreRun } from "@modules/chores/domain/chore";
import type { Answer } from "@modules/mind-duel/domain/exercise";
import type { Asteroid } from "@modules/celestial/domain/asteroid";
import type { Obstacle } from "../domain/route";
import { TRANSFER_TUNING } from "../domain/transfer";
import { realSeconds, TRAVEL_TIME, TravelClock } from "../domain/travel-time";
import { AUTOPILOT_TUNING, TripAutopilot, type AutopilotPhase } from "./autopilot";
import { planHop, type Hop } from "./hop";
import { tripChore, type TripFacts } from "./trip-chore";

/** Game values of the probe's automatic trips (docs/design/viajes.md). */
export const PROBE_TRIP = {
  /** Closer than this to the target (surface or bay) it is flown by hand: no trip to program, m. */
  minDistanceM: 1500,
  /** The autopilot hands the probe back this high above the asteroid: parking stays manual, m. */
  approachM: TRANSFER_TUNING.approachM,
  /** …or this far from the bay on the way home (its weak RCS needs room to stop): the last metres to the arm are manual, m. */
  bayHandoverM: 60,
  /** A stowed probe climbs this far above the bay before heading off (clear of the rings and spine), m. */
  departureM: 120,
  /** Home, it lines up this far above the bay and comes straight down, with room to brake, m. */
  homeViaM: 400,
  /** …stopping within this of that point before the way down, m. */
  viaStopM: 20,
  /** Share of the probe's small Δv (≈90 m/s) one hop may spend, so it can still come home and park. */
  maxDeltaVShare: 0.35,
} as const;

const PROBE_TUNING = { ...TRANSFER_TUNING, maxDeltaVShare: PROBE_TRIP.maxDeltaVShare };
/**
 * The probe's engine gives ≈0,06 m/s² (a fifth of the lander's): a velocity error the lander's
 * guidance shrugs off costs it tens of metres of braking, so it corrects smaller errors (game values).
 */
const PROBE_GUIDANCE = { ...AUTOPILOT_TUNING, burnStartMS: 0.3, burnStopMS: 0.05 };

/** Where the probe goes: an asteroid (then it is parked by hand) or home to the mothership's bay. */
export type ProbeGoal = { readonly kind: "asteroid"; readonly body: Asteroid } | { readonly kind: "bay" };

export type ProbeTripStatus = "idle" | "programming" | "flying" | "arrived" | "manual" | "failed";

/** What the probe trip needs from the probe operations and the region. */
export interface ProbeTripPorts {
  /** The probe's flight computer now (a lost probe is replaced by the next one). */
  flight(): FlightComputer;
  /** The probe sits in its bay on the mothership. */
  stowed(): boolean;
  /** Release a stowed probe from the bay; false if it can't. */
  launch(): boolean;
  /** Bay position and the "up" out of it (world). */
  bay(): { readonly position: Vec3; readonly up: Vec3 };
  /** Keep-out spheres on the way (all bodies but the goal, and the mothership itself). */
  obstaclesFor(goal: ProbeGoal): readonly Obstacle[];
  /** Why no trip can start now (another vehicle is on a compressed trip…), if so. */
  busy?(): string | undefined;
}

/** A point (the bay) as something the trip autopilot can fly to: zero size, not turning. */
function pointTarget(at: () => Vec3): FlightTarget {
  return {
    get position() {
      return at();
    },
    meanRadiusM: 0,
    surfaceDistance: (w) => w.sub(at()).length(),
    surfaceVelocity: () => Vec3.ZERO,
    orientationAt: () => Quat.IDENTITY,
    toLocal: (w) => w.sub(at()),
    toWorld: (l) => l.add(at()),
  };
}

export interface ProbeTripProgress {
  readonly goalName: string;
  readonly phase: AutopilotPhase;
  readonly remainingM: number;
  /** Game seconds left. */
  readonly etaS: number;
  /** Real seconds left at the time-lapse. */
  readonly etaRealS: number;
  readonly speedMS: number;
  readonly fraction: number;
  readonly lapse: number;
}

/**
 * Use case: the uncrewed probe's long trips (docs/design/viajes.md). For an asteroid far from the
 * mothership (or for the way home), the hop is programmed with the same code challenges as the
 * lander's, with the probe's real thrust and mass; then the probe flies itself in time-lapse, at most
 * the cap of real seconds, and hands back the controls `approachM` above the asteroid (parking is
 * manual) or a few metres from the bay (the arm's catch is manual).
 */
export class ProbeTrip {
  private _status: ProbeTripStatus = "idle";
  private _goal: ProbeGoal | undefined;
  private run: ChoreRun | undefined;
  private _autopilot: TripAutopilot | undefined;
  private flying: FlightComputer | undefined;
  private clock: TravelClock | undefined;
  private startDistanceM = 1;
  /** Home trips fly in two legs: stop above the bay, then straight down to the hand-over. */
  private nextLeg: (() => TripAutopilot) | undefined;

  constructor(private readonly ports: ProbeTripPorts) {}

  get status(): ProbeTripStatus {
    return this._status;
  }
  get goal(): ProbeGoal | undefined {
    return this._goal;
  }
  get autopilot(): TripAutopilot | undefined {
    return this._autopilot;
  }
  get programming(): ChoreRun | undefined {
    return this._status === "programming" ? this.run : undefined;
  }
  /** The probe is on an automatic trip. */
  get active(): boolean {
    return this._status === "flying";
  }

  static goalName(g: ProbeGoal): string {
    return g.kind === "bay" ? "la nodriza" : g.body.data.name;
  }

  private body(g: ProbeGoal): FlightTarget {
    return g.kind === "asteroid" ? g.body : pointTarget(() => this.ports.bay().position);
  }

  private handoverM(g: ProbeGoal): number {
    return g.kind === "asteroid" ? PROBE_TRIP.approachM : PROBE_TRIP.bayHandoverM;
  }

  /** The hop from where the probe is (or from its bay, climbing out first) to the hand-over point. */
  hop(g: ProbeGoal): Hop {
    const f = this.ports.flight();
    const stowed = this.ports.stowed();
    const bay = this.ports.bay();
    const lead = stowed ? [bay.position.add(bay.up.normalize().scale(PROBE_TRIP.departureM))] : [];
    // Home: come down on the bay from above, clear of the rings and the spine.
    const via = g.kind === "bay" ? bay.position.add(bay.up.normalize().scale(PROBE_TRIP.homeViaM)) : undefined;
    return planHop(f, this.body(g), this.ports.obstaclesFor(g), this.handoverM(g), { from: stowed ? bay.position : f.state.position, lead, tuning: PROBE_TUNING, ...(via ? { via } : {}) });
  }

  /** Game seconds of the hop and the real seconds it plays in. */
  time(g: ProbeGoal): { gameS: number; realS: number } {
    const gameS = this.hop(g).plan.totalS;
    return { gameS, realS: realSeconds(gameS, TRAVEL_TIME.lapse.probe) };
  }

  facts(g: ProbeGoal, h: Hop = this.hop(g)): TripFacts {
    return {
      targetId: g.kind === "bay" ? "bahia-sonda" : g.body.data.id,
      targetName: ProbeTrip.goalName(g),
      plan: h.plan,
      approachM: this.handoverM(g),
      thrustN: h.thrustN,
      massKg: h.massKg,
      deltaVAvailableMS: h.deltaVAvailableMS,
      detours: Math.max(0, h.waypoints.length - (this.ports.stowed() ? 1 : 0)),
      ...(g.kind === "bay" ? { arm: true } : {}),
    };
  }

  /** Whether a trip to `g` can be programmed now, and why not. */
  canProgram(g: ProbeGoal): { ok: boolean; reason?: string } {
    if (this._status === "flying") return { ok: false, reason: "La sonda ya está en viaje" };
    const busy = this.ports.busy?.();
    if (busy) return { ok: false, reason: busy };
    const f = this.ports.flight();
    const stowed = this.ports.stowed();
    if (g.kind === "bay" && stowed) return { ok: false, reason: "La sonda ya está en su bahía" };
    if (!stowed && f.landed) return { ok: false, reason: "La sonda está posada: despega antes" };
    const from = stowed ? this.ports.bay().position : f.state.position;
    const d = this.body(g).surfaceDistance(from, f.simTimeS);
    if (d < PROBE_TRIP.minDistanceM) return { ok: false, reason: `A menos de ${(PROBE_TRIP.minDistanceM / 1000).toFixed(1).replace(".", ",")} km se vuela a mano` };
    if (!this.hop(g).plan.feasible) return { ok: false, reason: "A la sonda no le queda hidracina para ese viaje" };
    return { ok: true };
  }

  /** Start the chain of challenges that programs the hop. */
  startProgramming(g: ProbeGoal): ChoreRun {
    const can = this.canProgram(g);
    if (!can.ok) throw new Error(can.reason);
    this._goal = g;
    this.run = new ChoreRun(tripChore(this.facts(g)));
    this._status = "programming";
    return this.run;
  }

  /** Answer the current challenge; solving the last one launches (if stowed) and engages the autopilot. */
  answer(a: Answer): boolean {
    if (this._status !== "programming" || !this.run) return false;
    const ok = this.run.submit(a);
    if (this.run.status === "done") this.engage();
    else if (this.run.status === "failed") this._status = "failed";
    return ok;
  }

  /** Give the plan to the probe's autopilot (also usable directly, e.g. from tests). */
  engage(g: ProbeGoal | undefined = this._goal): void {
    if (!g) return;
    this._goal = g;
    const h = this.hop(g);
    if (this.ports.stowed() && !this.ports.launch()) {
      this._status = "failed";
      return;
    }
    const f = this.ports.flight();
    const cruise = Math.max(0.5, h.plan.cruiseMS);
    if (g.kind === "bay") {
      // Stop above the bay first (its weak RCS can't turn a fast corner), then come straight down.
      const via = h.waypoints[h.waypoints.length - 1]!;
      this._autopilot = new TripAutopilot(f.ship, pointTarget(() => via), h.waypoints.slice(0, -1), cruise, PROBE_TRIP.viaStopM, PROBE_GUIDANCE);
      const down = Math.max(1, PROBE_TRIP.homeViaM - PROBE_TRIP.bayHandoverM);
      this.nextLeg = () => new TripAutopilot(f.ship, this.body(g), [], Math.max(0.5, Math.min(cruise, Math.floor(Math.sqrt(h.plan.accelMS2 * down)))), this.handoverM(g), PROBE_GUIDANCE);
    } else {
      this._autopilot = new TripAutopilot(f.ship, this.body(g), h.waypoints, cruise, this.handoverM(g), PROBE_GUIDANCE);
      this.nextLeg = undefined;
    }
    f.engage(this._autopilot);
    this.flying = f;
    this.startDistanceM = Math.max(1, h.plan.distanceM);
    this.clock = new TravelClock(h.plan.totalS, realSeconds(h.plan.totalS, TRAVEL_TIME.lapse.probe), { minLapse: 1, maxLapse: TRAVEL_TIME.maxPhysicsLapse });
    this._status = "flying";
  }

  /** Stop programming or flying: the remote pilot has the probe. */
  cancel(): void {
    if (this.flying && this._autopilot && this.flying.guidance === this._autopilot) this.flying.disengage();
    if (this._status === "programming" || this._status === "flying") this._status = "manual";
    this.clock?.cancel();
    this.clean();
  }

  private clean(): void {
    this._autopilot = undefined;
    this.nextLeg = undefined;
    this.flying = undefined;
    this.clock = undefined;
    this.run = undefined;
  }

  /** Game seconds per real second while the probe flies itself (1 otherwise). */
  get lapse(): number {
    return this._status === "flying" && this.clock && this._autopilot ? this.clock.lapse(this._autopilot.status.etaS) : 1;
  }

  /**
   * Once per frame with the real frame time, after the probe's physics ran at `lapse`: keeps the
   * clock and notices the hand-over, the pilot taking the controls or the probe being lost.
   */
  update(realDtS: number): void {
    if (this._status !== "flying" || !this._autopilot || !this.flying) return;
    const f = this.flying;
    if (f !== this.ports.flight()) {
      // Lost on the way (debris, battery): its replacement is in the bay.
      this._status = "failed";
      this.clock?.cancel();
      this.clean();
      return;
    }
    if (f.guidance === this._autopilot) {
      this.clock?.advance(realDtS, this._autopilot.status.etaS);
      return;
    }
    if (this._autopilot.arrived && this.nextLeg) {
      this._autopilot = this.nextLeg();
      this.nextLeg = undefined;
      f.engage(this._autopilot);
      return;
    }
    if (this._autopilot.arrived) {
      this._status = "arrived";
      this.clock?.arrive();
    } else {
      this._status = "manual";
      this.clock?.cancel();
    }
    this.clean();
  }

  progress(): ProbeTripProgress | undefined {
    const a = this._autopilot;
    if (this._status !== "flying" || !a || !this._goal || !this.clock) return undefined;
    const s = a.status;
    const remaining = Number.isFinite(s.remainingM) ? s.remainingM : this.startDistanceM;
    return {
      goalName: ProbeTrip.goalName(this._goal),
      phase: s.phase,
      remainingM: remaining,
      etaS: Number.isFinite(s.etaS) ? s.etaS : Math.max(0, this.clock.plannedGameS - this.clock.gameElapsedS),
      etaRealS: this.clock.etaRealS(s.etaS),
      speedMS: s.speedMS,
      fraction: Math.max(0, Math.min(1, 1 - remaining / this.startDistanceM)),
      lapse: this.lapse,
    };
  }
}
