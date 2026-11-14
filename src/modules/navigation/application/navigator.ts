import { Vec3 } from "@core/math/vec3";
import type { FlightComputer } from "@modules/flight/application/flight-computer";
import { ChoreRun, type Chore } from "@modules/chores/domain/chore";
import type { Answer } from "@modules/mind-duel/domain/exercise";
import { duelProfileFor, type DuelProfile } from "@modules/mind-duel/domain/difficulty";
import { resourceRichness } from "@modules/celestial/domain/resources";
import { planRoute, pathLength, type Obstacle } from "../domain/route";
import { planContinuousBurn, planTransfer, TRANSFER_TUNING, type ContinuousBurnPlan, type TransferPlan } from "../domain/transfer";
import { facing } from "../domain/attitude";
import { portFlightTarget, targetDistance, type AsteroidTarget, type DockTarget, type NavTarget } from "../domain/nav-target";
import type { DockingTarget } from "@modules/mothership/domain/docking";
import { remainingEstimateS, TripAutopilot, type AutopilotPhase } from "./autopilot";
import { CarrierTrip, type BerthRun, type CarrierPort } from "./carrier-trip";
import { legBudgets, TRAVEL_TIME, TravelClock } from "../domain/travel-time";
import { carrierTripChore, tripChore, type CarrierTripFacts, type DockFacts, type TripFacts } from "./trip-chore";
import { DOCK_TRIP } from "./dock-trip";
import { planHop } from "./hop";

/**
 * `carrier`: the mothership is flying with the probe docked (and, at a station, docking itself);
 * `autopilot`: the probe's last leg; `docking`: the docking assist is closing on the port;
 * `docked`: a dock trip ended latched to the port.
 */
export type TripStatus = "idle" | "programming" | "carrier" | "autopilot" | "docking" | "docked" | "arrived" | "manual" | "failed";

/** The mothership's share of a trip: from where it is to its parking point, round the rocks. */
export interface CarrierLeg {
  readonly from: Vec3;
  readonly path: readonly Vec3[];
  readonly parking: Vec3;
  readonly plan: ContinuousBurnPlan;
  readonly facts: CarrierTripFacts;
  /** Set when the mothership docks at the end (a station's port). */
  readonly berthAt?: DockingTarget;
}

/** How a dock trip ends: the probe's port, where the autopilot hands over, and the way in. */
export interface DockLeg {
  readonly port: DockingTarget;
  /** Point on the port axis where the route turns in, metres from the port. */
  readonly entry: Vec3;
  readonly handoverM: number;
}

/** A hop from where the ship is now to the hand-over point of a target. */
export interface Trip {
  readonly target: NavTarget;
  /** Set when the mothership carries the probe most of the way. */
  readonly carrier?: CarrierLeg;
  /** Detours before the final leg (may be empty). */
  readonly waypoints: readonly Vec3[];
  /** Height above the surface now, metres. */
  readonly heightM: number;
  readonly plan: TransferPlan;
  readonly facts: TripFacts;
  /** Set for a dock target: the probe ends docked to this port. */
  readonly dock?: DockLeg;
  /** Game time of the whole trip (physics of each leg) and the real seconds it plays in (compressed, capped). */
  readonly travel?: TripTime;
}

/** How long a trip is: game seconds of flight and the real seconds of its time-lapse (docs/design/viajes.md). */
export interface TripTime {
  readonly gameS: number;
  readonly realS: number;
  /** Real seconds of each leg: [mothership, lander] or [lander]. */
  readonly legsRealS: readonly number[];
}

/** Game and real seconds of a trip's legs. */
export function tripTime(t: Pick<Trip, "carrier" | "plan">): TripTime {
  const legs = [...(t.carrier ? [{ gameS: t.carrier.plan.totalS, lapse: TRAVEL_TIME.lapse.carrier }] : []), { gameS: t.plan.totalS, lapse: TRAVEL_TIME.lapse.lander }];
  const legsRealS = legBudgets(legs);
  return { gameS: legs.reduce((s, l) => s + l.gameS, 0), realS: legsRealS.reduce((s, x) => s + x, 0), legsRealS };
}

/** What the map card shows about a destination. */
export interface DestinationInfo {
  readonly target: AsteroidTarget;
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

/** What the map card shows about a station or the mothership. */
export interface DockDestinationInfo {
  readonly target: DockTarget;
  readonly trip: Trip;
  /** Distance to the probe's port now, metres. */
  readonly distanceM: number;
  /** The probe is latched to this target's port now. */
  readonly docked: boolean;
  /** The mothership is docked at this target now. */
  readonly carrierDocked: boolean;
  readonly selected: boolean;
}

/** The probe's docking assist, as navigation sees it (the docking use case). */
export interface DockingPort {
  readonly dockedTo: DockingTarget | undefined;
  readonly assist: boolean;
  assistTo(target: DockingTarget): void;
  undock(): void;
  alignment(target: DockingTarget): { readonly axialM: number; readonly lateralM: number; readonly closingMs: number };
}

export interface NavigatorPorts {
  readonly targets: readonly NavTarget[];
  /** Keep-out spheres on the way to a target (everything except the target itself). */
  obstaclesFor(t: NavTarget): readonly Obstacle[];
  /** Point the expedition at a target; false if it can't change now (landed, duel, fleeing). */
  retarget(t: NavTarget): boolean;
  isPersuaded?(t: NavTarget): boolean;
  /** The mothership, when there is one: with the probe docked it flies the long part of the trip. */
  readonly carrier?: CarrierPort;
  /** The probe's docking assist: a dock trip ends with it. */
  readonly docking?: DockingPort;
  /** Why no trip can start now (another vehicle is on a compressed trip, the probe is out…), if so. */
  busy?(carrier: boolean): string | undefined;
}

/** Trip progress for the HUD. `vehicle: "probe"` is the lander (the craft the cockpit flies). */
export interface TripProgress {
  readonly vehicle: "carrier" | "probe";
  readonly phase: AutopilotPhase;
  readonly remainingM: number;
  /** Game seconds left. */
  readonly etaS: number;
  readonly speedMS: number;
  readonly fraction: number;
  /** Real seconds left at the time-lapse. */
  readonly etaRealS: number;
  /** Game seconds per real second now. */
  readonly lapse: number;
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
  private _carrierTrip: CarrierTrip | undefined;
  private _berthing: BerthRun | undefined;
  private startDistanceM = 0;
  /** Time-lapse of the leg flying now, and the real seconds kept for the lander's leg after the mothership's. */
  private clock: TravelClock | undefined;
  private landerBudgetS: number | undefined;

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
  get carrierTrip(): CarrierTrip | undefined {
    return this._carrierTrip;
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
    const trip = this.trip_(t);
    return { ...trip, travel: tripTime(trip) };
  }

  private trip_(t: NavTarget): Trip {
    const c = this.ports.carrier;
    if (c && c.docked()) {
      if (t.kind === "asteroid" && t.body.surfaceDistance(c.position, this.flight.simTimeS) > c.parkingM + this.approachM) return this.carrierTrip_(t, c);
      // A station the mothership can dock at: it takes the probe all the way, unless already there.
      if (t.kind === "dock" && t.carrierPort && c.berthStandoff && c.dockedTo?.() !== t.carrierPort.id) return this.carrierTrip_(t, c);
    }
    return t.kind === "dock" ? this.probeDockTrip(t) : this.probeTrip(t);
  }

  /** The mothership flies to its parking point; the probe then covers the last stretch. */
  private carrierTrip_(t: NavTarget, c: CarrierPort): Trip {
    const from = c.position;
    const berthAt = t.kind === "dock" ? t.carrierPort : undefined;
    const parking = berthAt ? c.berthStandoff!(berthAt).position : c.parkingPoint((t as AsteroidTarget).body, from);
    const obstacles = this.ports.obstaclesFor(t).map((o) => ({ centre: o.centre, radiusM: o.radiusM + c.clearanceM }));
    // Docked at a station: back out along its port axis first.
    const out = c.departure?.();
    const path = out ? [out, ...planRoute(out, parking, obstacles)] : planRoute(from, parking, obstacles);
    const distanceM = pathLength(from, path);
    const plan = planContinuousBurn(distanceM, c.accelerationMs2);
    const probe = t.kind === "dock" ? this.probeDockTrip(t) : this.probeTrip(t);
    const probeLegM = berthAt ? 0 : Math.max(0, c.parkingM - this.approachM);
    const facts: CarrierTripFacts = {
      targetId: t.id,
      targetName: t.name,
      carrierName: c.name,
      plan,
      thrusterCount: c.thrusterCount,
      thrustN: c.thrustN,
      massKg: c.massKg,
      deltaVAvailableMS: c.deltaV(),
      burnDays: c.burnDays(plan.deltaVMS),
      propellantKg: c.propellantFor(plan.deltaVMS),
      parkingM: berthAt ? DOCK_TRIP.berthStandoffM : c.parkingM,
      approachM: this.approachM,
      detours: path.length - 1 - (out ? 1 : 0),
      ...(berthAt ? { dock: this.dockFacts(t as DockTarget, DOCK_TRIP.berthStandoffM) } : {}),
    };
    const probePlan = planTransfer({ distanceM: probeLegM, accelMS2: probe.plan.accelMS2, deltaVAvailableMS: this.flight.ship.mainDeltaV() });
    return { ...probe, plan: probePlan, waypoints: [], dock: undefined, carrier: { from, path, parking, plan, facts, ...(berthAt ? { berthAt } : {}) } };
  }

  private dockFacts(t: DockTarget, handoverM: number): DockFacts {
    return { what: t.what, handoverM, contactMs: DOCK_TRIP.contactMs, closingMaxMs: DOCK_TRIP.closingMaxMs };
  }

  /** The probe's hop to a structure: round the rocks to a point on the port axis, then straight in. */
  private probeDockTrip(t: DockTarget): Trip {
    const ship = this.flight.ship;
    const s = this.flight.state;
    const port = t.probePort.port;
    const n = port.normal;
    const handoverM = DOCK_TRIP.handoverM;
    const rel = s.position.sub(port.position);
    const axial = rel.dot(n);
    const lateral = rel.sub(n.scale(axial)).length();
    // Far enough out on the axis already: straight in. Else go round to the entry point first.
    const entryM = Math.max(DOCK_TRIP.entryMinM, t.radiusM - port.position.sub(t.position).dot(n) + DOCK_TRIP.entryMarginM);
    const entry = port.position.add(n.scale(entryM));
    const onAxis = axial > handoverM && lateral < axial * DOCK_TRIP.onAxisShare;
    const waypoints = onAxis ? [] : planRoute(s.position, entry, this.ports.obstaclesFor(t));
    const last = waypoints[waypoints.length - 1] ?? s.position;
    const distanceM = Math.max(0, pathLength(s.position, waypoints) + last.sub(port.position).length() - handoverM);
    const thrustN = ship.mainEngines.reduce((f, e) => f + e.model.thrustN, 0);
    const accel = ship.preview({ mainThrottle: 1, translation: Vec3.ZERO, rotation: Vec3.ZERO }).forceBody.length() / ship.massKg;
    const plan = planTransfer({ distanceM, accelMS2: accel, deltaVAvailableMS: ship.mainDeltaV() });
    const facts: TripFacts = {
      targetId: t.id,
      targetName: t.name,
      plan,
      approachM: handoverM,
      thrustN,
      massKg: ship.massKg,
      deltaVAvailableMS: ship.mainDeltaV(),
      detours: Math.max(0, waypoints.length - 1),
      dock: this.dockFacts(t, handoverM),
    };
    return { target: t, waypoints, heightM: rel.length(), plan, facts, dock: { port: t.probePort, entry, handoverM } };
  }

  private probeTrip(t: AsteroidTarget): Trip {
    const h = planHop(this.flight, t.body, this.ports.obstaclesFor(t), this.approachM);
    const facts: TripFacts = {
      targetId: t.id,
      targetName: t.name,
      plan: h.plan,
      approachM: this.approachM,
      thrustN: h.thrustN,
      massKg: h.massKg,
      deltaVAvailableMS: h.deltaVAvailableMS,
      detours: h.waypoints.length,
    };
    return { target: t, waypoints: h.waypoints, heightM: h.heightM, plan: h.plan, facts };
  }

  destination(t: AsteroidTarget): DestinationInfo {
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

  dockDestination(t: DockTarget): DockDestinationInfo {
    const c = this.ports.carrier;
    return {
      target: t,
      trip: this.trip(t),
      distanceM: targetDistance(t, this.flight.state.position),
      docked: this.ports.docking?.dockedTo === t.probePort,
      carrierDocked: !!t.carrierPort && c?.dockedTo?.() === t.carrierPort.id,
      selected: t === this._target,
    };
  }

  /** Whether a trip to the current target can be programmed now, and why not. */
  canProgram(): { ok: boolean; reason?: string } {
    if (this.flight.landed) return { ok: false, reason: "Despega antes de programar el viaje" };
    if (this._status === "autopilot" || this._status === "carrier" || this._status === "docking") return { ok: false, reason: "El piloto automático ya está volando" };
    const t = this._target;
    if (t.kind === "dock" && this.ports.docking?.dockedTo === t.probePort) return { ok: false, reason: `Ya estás acoplada a ${t.name}` };
    const trip = this.trip();
    const busy = this.ports.busy?.(!!trip.carrier);
    if (busy) return { ok: false, reason: busy };
    if (t.kind === "asteroid" && trip.heightM <= this.approachM + 50) return { ok: false, reason: `Ya estás a menos de ${this.approachM + 50} m: aterriza a mano` };
    if (trip.carrier) {
      if (trip.carrier.plan.deltaVMS > this.ports.carrier!.deltaV()) return { ok: false, reason: "A la nodriza no le queda xenón para ese viaje" };
      return { ok: true };
    }
    if (!trip.plan.feasible) return { ok: false, reason: "No queda combustible en el motor principal" };
    return { ok: true };
  }

  /** The lander's own trip to a target, never carried by the travel ship (the task list's travel mode). */
  landerTrip(t: NavTarget = this._target): Trip {
    const trip = t.kind === "dock" ? this.probeDockTrip(t) : this.probeTrip(t);
    return { ...trip, travel: tripTime(trip) };
  }

  /** Whether the lander alone can fly to a target now, and why not. */
  canFlyLander(t: NavTarget): { ok: boolean; reason?: string } {
    if (this.flight.landed) return { ok: false, reason: "Despega antes de volar a otro sitio" };
    if (this._status === "autopilot" || this._status === "carrier" || this._status === "docking") return { ok: false, reason: "El piloto automático ya está volando" };
    if (t.kind === "dock" && this.ports.docking?.dockedTo === t.probePort) return { ok: false, reason: `Ya estás acoplada a ${t.name}` };
    const busy = this.ports.busy?.(false);
    if (busy) return { ok: false, reason: busy };
    if (!this.landerTrip(t).plan.feasible) return { ok: false, reason: "No queda combustible en el motor principal" };
    return { ok: true };
  }

  /**
   * The lander alone to a target, with no challenges (the task list's «Ir» in travel mode,
   * docs/design/viaje-a-una-tarea.md): undock, the compressed autopilot leg and, at a port, the docking assist.
   */
  flyLander(id: string): { ok: boolean; reason?: string } {
    const t = this.ports.targets.find((x) => x.id === id);
    if (!t) return { ok: false, reason: "Destino desconocido" };
    const can = this.canFlyLander(t);
    if (!can.ok) return can;
    const sel = this.select(id);
    if (!sel.ok) return sel;
    this.landerBudgetS = undefined;
    this.engageProbe(t);
    return { ok: true };
  }

  /** Whether the travel ship can carry the lander to a target now (no challenges), and why not. */
  canCarry(t: NavTarget): { ok: boolean; reason?: string } {
    if (this._status === "autopilot" || this._status === "carrier" || this._status === "docking") return { ok: false, reason: "El piloto automático ya está volando" };
    const trip = this.trip(t);
    if (!trip.carrier) return { ok: false, reason: "La nodriza solo vuela con el módulo de aterrizaje acoplado" };
    const busy = this.ports.busy?.(true);
    if (busy) return { ok: false, reason: busy };
    if (trip.carrier.plan.deltaVMS > this.ports.carrier!.deltaV()) return { ok: false, reason: "A la nodriza no le queda xenón para ese viaje" };
    return { ok: true };
  }

  /** The travel ship carries the lander to a target, with no challenges (the task list's travel mode). */
  carry(id: string): { ok: boolean; reason?: string } {
    const t = this.ports.targets.find((x) => x.id === id);
    if (!t) return { ok: false, reason: "Destino desconocido" };
    const can = this.canCarry(t);
    if (!can.ok) return can;
    const sel = this.select(id);
    if (!sel.ok) return sel;
    this.engage(this.trip(t));
    return this._status === "carrier" ? { ok: true } : { ok: false, reason: "La nodriza no ha podido encender los motores" };
  }

  /** Start the chain of challenges that programs the hop. */
  startProgramming(): ChoreRun {
    const can = this.canProgram();
    if (!can.ok) throw new Error(can.reason);
    this.programmed = this.trip();
    const t = this.programmed;
    this.run = new ChoreRun(t.carrier ? carrierTripChore(t.carrier.facts) : tripChore(t.facts));
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

  /** Give the plan to the mothership or the autopilot (also usable directly, e.g. from tests). */
  engage(trip: Trip = this.trip()): void {
    // Re-plan from where the ships are now: they kept drifting while the crew programmed.
    const now = this.trip(trip.target);
    const c = this.ports.carrier;
    if (now.carrier && c) {
      if (!c.burn(now.carrier.plan.deltaVMS)) {
        this._status = "failed";
        return;
      }
      // Leaving a station's port: keep the attitude (the rings must not swing into the station).
      const leaving = !!c.departure?.();
      c.release?.();
      const berth = now.carrier.berthAt;
      const q = berth ? c.berthStandoff!(berth).orientation : leaving ? c.orientation : facing(now.carrier.parking.sub(now.carrier.from));
      this._carrierTrip = new CarrierTrip(c, now.carrier.from, now.carrier.path, now.carrier.plan, q);
      const budget = tripTime(now).legsRealS;
      this.clock = new TravelClock(now.carrier.plan.totalS, budget[0] ?? 0);
      this.landerBudgetS = budget[1];
      this.startDistanceM = Math.max(1, now.carrier.plan.distanceM);
      this._status = "carrier";
      return;
    }
    this.engageProbe(now.target);
  }

  /** The probe's own leg: undock if needed and let the autopilot fly to the hand-over point. */
  private engageProbe(target: NavTarget): void {
    // Leave whatever port the probe is on (the mothership's or a station's).
    if (this.flight.docked) {
      if (this.ports.docking) this.ports.docking.undock();
      else this.ports.carrier?.undock();
    }
    const now = target.kind === "dock" ? this.probeDockTrip(target) : this.probeTrip(target);
    const body = now.dock ? portFlightTarget(now.dock.port) : (target as AsteroidTarget).body;
    this._autopilot = new TripAutopilot(this.flight.ship, body, now.waypoints, Math.max(1, now.plan.cruiseMS), now.dock?.handoverM ?? this.approachM);
    this.flight.engage(this._autopilot);
    this.startDistanceM = Math.max(1, now.plan.distanceM);
    const budget = this.landerBudgetS ?? tripTime(now).legsRealS[0] ?? 0;
    this.landerBudgetS = undefined;
    this.clock = new TravelClock(now.plan.totalS, budget, { minLapse: 1, maxLapse: TRAVEL_TIME.maxPhysicsLapse });
    this._status = "autopilot";
  }

  /** Stop programming or flying the trip; the pilot has the controls (the mothership stays where it is). */
  cancel(): void {
    if (this._autopilot && this.flight.guidance === this._autopilot) this.flight.disengage();
    if (this._status === "programming" || this._status === "autopilot" || this._status === "carrier" || this._status === "docking") this._status = "manual";
    this._autopilot = undefined;
    this._carrierTrip = undefined;
    this._berthing = undefined;
    this.run = undefined;
    this.clock?.cancel();
    this.clock = undefined;
    this.landerBudgetS = undefined;
  }

  /**
   * Game seconds per real second while a trip flies itself (1 otherwise): the mothership's hop and the
   * lander's leg play in time-lapse, never longer than the cap (docs/design/viajes.md). Main runs the
   * mission clock (physics, wrath, station) at this pace.
   */
  get lapse(): number {
    if (this._status === "carrier" && this._berthing) return TRAVEL_TIME.lapse.carrier;
    if (this._status === "carrier" && this._carrierTrip && this.clock) return this.clock.lapse(this._carrierTrip.remainingS);
    if (this._status === "autopilot" && this._autopilot && this.clock) return this.clock.lapse(remainingEstimateS(this._autopilot.status));
    return 1;
  }

  /** Real seconds left for the leg flying now (the lander's leg after the mothership's included). */
  private etaRealS(): number {
    const c = this.clock;
    if (!c) return 0;
    if (this._status === "carrier" && this._carrierTrip) return c.etaRealS(this._carrierTrip.remainingS) + (this.landerBudgetS ?? 0);
    if (this._status === "autopilot" && this._autopilot) return c.etaRealS(remainingEstimateS(this._autopilot.status));
    return 0;
  }

  /**
   * Call once per frame with the real frame time: moves the mothership (in time-lapse) and notices when
   * the autopilot handed over or the pilot took the controls. `held`: a threat of the wrath holds the
   * trip at ×1 this frame (main's `frameClocks`, HC-03): the time-lapse clock does not count it.
   */
  update(realDtS = 0, held = false): void {
    if (this._status === "carrier" && this._berthing) {
      this._berthing.advance(realDtS * (held ? 1 : TRAVEL_TIME.lapse.carrier));
      if (this._berthing.status !== "approach") {
        this._status = this._berthing.status === "docked" ? "docked" : "failed";
        this._berthing = undefined;
      }
      return;
    }
    if (this._status === "carrier" && this._carrierTrip) {
      // Held by a threat (HC-03): the mothership flies at ×1 and the time-lapse clock waits.
      this._carrierTrip.advance(this.clock && !held ? this.clock.advance(realDtS, this._carrierTrip.remainingS) : realDtS);
      if (this._carrierTrip.done) {
        this.clock?.arrive();
        const berth = this._target.kind === "dock" ? this._target.carrierPort : undefined;
        this._carrierTrip = undefined;
        // At a station the mothership docks itself; at an asteroid the probe flies the last leg.
        if (berth && this.ports.carrier?.berth) this._berthing = this.ports.carrier.berth(berth);
        else this.engageProbe(this._target);
      }
      return;
    }
    if (this._status === "docking") {
      const d = this.ports.docking;
      const t = this._target;
      if (!d || t.kind !== "dock") return;
      if (d.dockedTo === t.probePort) this._status = "docked";
      else if (!d.assist) this._status = "manual";
      return;
    }
    if (this._status !== "autopilot" || !this._autopilot) return;
    // The physics ran at `lapse` this frame (main steps it); keep the clock's books.
    if (this.flight.guidance === this._autopilot) {
      if (!held) this.clock?.advance(realDtS, remainingEstimateS(this._autopilot.status));
      return;
    }
    if (this._autopilot.arrived) this.clock?.arrive();
    else this.clock?.cancel();
    if (!this._autopilot.arrived) {
      this._status = "manual";
      return;
    }
    // A dock trip ends with the docking assist on the port.
    const t = this._target;
    if (t.kind === "dock" && this.ports.docking) {
      this.ports.docking.assistTo(t.probePort);
      this._status = "docking";
      return;
    }
    this._status = "arrived";
  }

  /** Autopilot progress for the HUD, while it flies. */
  progress(): TripProgress | undefined {
    const p = this.progress_();
    return p ? { ...p, etaRealS: this.etaRealS(), lapse: this.lapse } : undefined;
  }

  private progress_(): Omit<TripProgress, "etaRealS" | "lapse"> | undefined {
    const b = this._berthing;
    if (this._status === "carrier" && b) {
      const r = b.remainingM;
      const v = Math.max(1e-3, b.speedMs);
      return { vehicle: "carrier", phase: "dock", remainingM: r, etaS: r / v, speedMS: b.speedMs, fraction: 1 - r / Math.max(1, DOCK_TRIP.berthStandoffM) };
    }
    const t = this._target;
    if (this._status === "docking" && t.kind === "dock" && this.ports.docking) {
      const a = this.ports.docking.alignment(t.probePort);
      // Straight-line gap to the port (off the axis it first backs out and centres).
      const r = Math.hypot(Math.max(0, a.axialM), a.lateralM);
      return { vehicle: "probe", phase: "dock", remainingM: r, etaS: r / Math.max(0.05, a.closingMs), speedMS: Math.abs(a.closingMs), fraction: 1 - Math.min(1, r / DOCK_TRIP.handoverM) };
    }
    const ct = this._carrierTrip;
    if (this._status === "carrier" && ct) {
      return { vehicle: "carrier", phase: ct.phase, remainingM: Math.max(0, ct.plan.distanceM - ct.travelledM), etaS: ct.remainingS, speedMS: ct.speedMS, fraction: ct.fraction };
    }
    if (this._status !== "autopilot" || !this._autopilot) return undefined;
    const s = this._autopilot.status;
    const remaining = Number.isFinite(s.remainingM) ? s.remainingM : this.startDistanceM;
    const etaS = remainingEstimateS(s) ?? Math.max(0, (this.clock?.plannedGameS ?? 0) - (this.clock?.gameElapsedS ?? 0));
    return { ...s, etaS, vehicle: "probe", remainingM: remaining, fraction: Math.max(0, Math.min(1, 1 - remaining / this.startDistanceM)) };
  }
}
