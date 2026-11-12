import { Vec3 } from "@core/math/vec3";
import type { FlightComputer } from "@modules/flight/application/flight-computer";
import { ChoreRun, type Chore } from "@modules/chores/domain/chore";
import type { Answer } from "@modules/mind-duel/domain/exercise";
import { duelProfileFor, type DuelProfile } from "@modules/mind-duel/domain/difficulty";
import { resourceRichness } from "@modules/celestial/domain/resources";
import { planRoute, pathLength, type Obstacle } from "../domain/route";
import { planTransfer, TRANSFER_TUNING, type TransferPlan } from "../domain/transfer";
import type { NavTarget } from "../domain/nav-target";
import { TripAutopilot, type AutopilotPhase } from "./autopilot";
import { tripChore, type TripFacts } from "./trip-chore";

export type TripStatus = "idle" | "programming" | "autopilot" | "arrived" | "manual" | "failed";

/** A hop from where the ship is now to the hand-over point of a target. */
export interface Trip {
  readonly target: NavTarget;
  /** Detours before the final leg (may be empty). */
  readonly waypoints: readonly Vec3[];
  /** Height above the surface now, metres. */
  readonly heightM: number;
  readonly plan: TransferPlan;
  readonly facts: TripFacts;
}

/** What the map card shows about a destination. */
export interface DestinationInfo {
  readonly target: NavTarget;
  readonly trip: Trip;
  readonly duel: DuelProfile;
  /** 0..1, from its known composition. */
  readonly richness: number;
  /** Escape speed at the mean radius, m/s. */
  readonly escapeMS: number;
  /** Gravity at the mean radius, m/s². */
  readonly surfaceGravityMS2: number;
  readonly persuaded: boolean;
  readonly selected: boolean;
}

export interface NavigatorPorts {
  readonly targets: readonly NavTarget[];
  /** Keep-out spheres on the way to a target (everything except the target itself). */
  obstaclesFor(t: NavTarget): readonly Obstacle[];
  /** Point the expedition at a target; false if it can't change now (landed, duel, fleeing). */
  retarget(t: NavTarget): boolean;
  isPersuaded?(t: NavTarget): boolean;
}

/**
 * Use case for navigation in a region: pick a destination on the map, program the hop with code
 * challenges built from its real numbers and let the autopilot fly it, handing control back near
 * the target for a manual landing.
 */
export class Navigator {
  private _target: NavTarget;
  private _status: TripStatus = "idle";
  private run: ChoreRun | undefined;
  private programmed: Trip | undefined;
  private _autopilot: TripAutopilot | undefined;
  private startDistanceM = 0;

  constructor(
    private readonly flight: FlightComputer,
    private readonly ports: NavigatorPorts,
    initial: NavTarget,
    readonly approachM = TRANSFER_TUNING.approachM,
  ) {
    this._target = initial;
  }

  get target(): NavTarget {
    return this._target;
  }
  get targets(): readonly NavTarget[] {
    return this.ports.targets;
  }
  get status(): TripStatus {
    return this._status;
  }
  get programming(): ChoreRun | undefined {
    return this._status === "programming" ? this.run : undefined;
  }
  get autopilot(): TripAutopilot | undefined {
    return this._autopilot;
  }

  /** Make a destination the target. Refused while landed, in a duel or fleeing. */
  select(id: string): { ok: boolean; reason?: string } {
    const t = this.ports.targets.find((x) => x.id === id);
    if (!t) return { ok: false, reason: "Destino desconocido" };
    if (t === this._target) return { ok: true };
    if (this.flight.landed) return { ok: false, reason: "Despega antes de cambiar de destino" };
    if (!this.ports.retarget(t)) return { ok: false, reason: "Ahora no se puede cambiar de destino" };
    this.cancel();
    this._target = t;
    this._status = "idle";
    return { ok: true };
  }

  /** The hop to a target from where the ship is right now. */
  trip(t: NavTarget = this._target): Trip {
    const ship = this.flight.ship;
    const s = this.flight.state;
    const centre = t.body.position;
    const height = t.body.surfaceDistance(s.position, this.flight.simTimeS);
    const toCentre = centre.sub(s.position);
    const surfaceR = toCentre.length() - height;
    const u = toCentre.length() > 0 ? toCentre.normalize() : Vec3.Z;
    const arrival = s.position.add(u.scale(Math.max(0, height - this.approachM)));
    const route = planRoute(s.position, arrival, this.ports.obstaclesFor(t));
    const waypoints = route.slice(0, -1);
    const last = waypoints[waypoints.length - 1];
    const distanceM = last ? pathLength(s.position, waypoints) + Math.max(0, centre.sub(last).length() - surfaceR - this.approachM) : Math.max(0, height - this.approachM);
    const thrustN = ship.mainEngines.reduce((f, e) => f + e.model.thrustN, 0);
    const accel = ship.preview({ mainThrottle: 1, translation: Vec3.ZERO, rotation: Vec3.ZERO }).forceBody.length() / ship.massKg;
    const plan = planTransfer({ distanceM, accelMS2: accel, deltaVAvailableMS: ship.mainDeltaV() });
    const facts: TripFacts = {
      targetId: t.id,
      targetName: t.name,
      plan,
      approachM: this.approachM,
      thrustN,
      massKg: ship.massKg,
      deltaVAvailableMS: ship.mainDeltaV(),
      detours: waypoints.length,
    };
    return { target: t, waypoints, heightM: height, plan, facts };
  }

  destination(t: NavTarget): DestinationInfo {
    const a = t.body;
    const richness = resourceRichness(a.data.composition);
    return {
      target: t,
      trip: this.trip(t),
      duel: duelProfileFor({ massKg: a.massKg, richness }),
      richness,
      escapeMS: Math.sqrt((2 * a.mu) / a.meanRadiusM),
      surfaceGravityMS2: a.mu / (a.meanRadiusM * a.meanRadiusM),
      persuaded: this.ports.isPersuaded?.(t) ?? false,
      selected: t === this._target,
    };
  }

  /** Whether a trip to the current target can be programmed now, and why not. */
  canProgram(): { ok: boolean; reason?: string } {
    if (this.flight.landed) return { ok: false, reason: "Despega antes de programar el viaje" };
    if (this._status === "autopilot") return { ok: false, reason: "El piloto automático ya está volando" };
    const trip = this.trip();
    if (trip.heightM <= this.approachM + 50) return { ok: false, reason: `Ya estás a menos de ${this.approachM + 50} m: aterriza a mano` };
    if (!trip.plan.feasible) return { ok: false, reason: "No queda combustible en el motor principal" };
    return { ok: true };
  }

  /** Start the chain of challenges that programs the hop. */
  startProgramming(): ChoreRun {
    const can = this.canProgram();
    if (!can.ok) throw new Error(can.reason);
    this.programmed = this.trip();
    this.run = new ChoreRun(tripChore(this.programmed.facts));
    this._status = "programming";
    return this.run;
  }

  get chore(): Chore | undefined {
    return this.run?.chore;
  }

  /** Answer the current trip challenge. Solving the last one engages the autopilot; too many mistakes and it stays manual. */
  answer(a: Answer): boolean {
    if (this._status !== "programming" || !this.run) return false;
    const ok = this.run.submit(a);
    if (this.run.status === "done") this.engage(this.programmed);
    else if (this.run.status === "failed") this._status = "failed";
    return ok;
  }

  /** Give the plan to the autopilot (also usable directly, e.g. from tests). */
  engage(trip: Trip = this.trip()): void {
    // Re-plan from where the ship is now: it kept drifting while the crew programmed.
    const now = this.trip(trip.target);
    this._autopilot = new TripAutopilot(this.flight.ship, now.target.body, now.waypoints, now.plan.cruiseMS, this.approachM);
    this.flight.engage(this._autopilot);
    this.startDistanceM = Math.max(1, now.plan.distanceM);
    this._status = "autopilot";
  }

  /** Stop programming or flying the trip; the pilot has the controls. */
  cancel(): void {
    if (this._autopilot && this.flight.guidance === this._autopilot) this.flight.disengage();
    if (this._status === "programming" || this._status === "autopilot") this._status = "manual";
    this._autopilot = undefined;
    this.run = undefined;
  }

  /** Call once per frame: notices when the autopilot handed over or the pilot took the controls. */
  update(): void {
    if (this._status !== "autopilot" || !this._autopilot) return;
    if (this.flight.guidance === this._autopilot) return;
    this._status = this._autopilot.arrived ? "arrived" : "manual";
  }

  /** Autopilot progress for the HUD, while it flies. */
  progress(): { phase: AutopilotPhase; remainingM: number; etaS: number; speedMS: number; fraction: number } | undefined {
    if (this._status !== "autopilot" || !this._autopilot) return undefined;
    const s = this._autopilot.status;
    const remaining = Number.isFinite(s.remainingM) ? s.remainingM : this.startDistanceM;
    return { ...s, remainingM: remaining, fraction: Math.max(0, Math.min(1, 1 - remaining / this.startDistanceM)) };
  }
}
