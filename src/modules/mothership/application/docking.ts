import { Vec3 } from "@core/math/vec3";
import type { FlightComputer } from "@modules/flight/application/flight-computer";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import { alignment, dockingCommand, judgeContact, type Alignment, type Authority, type DockingLimits, type DockingTarget } from "../domain/docking";

export type DockingEvent =
  | { readonly type: "docked"; readonly target: DockingTarget }
  | { readonly type: "undocked"; readonly target: DockingTarget }
  | { readonly type: "rebound"; readonly target: DockingTarget; readonly failures: readonly string[]; readonly damage: number };

/** Lateral offset at which the probe still meets the port's guide ring rather than the node, m. */
const GUIDE_RADIUS_M = 0.6;
/** Farther off the axis than the guide ring but within this, the probe hits the node itself, m. */
const NODE_RADIUS_M = 3;
/** Share of the closing speed kept after a contact that does not latch (game value). */
const REBOUND = 0.3;
/** Hard contacts dent the hull: damage per m/s above this speed (game values). */
const SAFE_CONTACT_MS = 0.3;
const DAMAGE_PER_MS = 0.25;
/** The assist only works this close to the port (the port's approach lights and ranging), m. */
export const ASSIST_RANGE_M = 3000;

/**
 * Use case: the probe docks with and undocks from any docking target (the mothership, a station's
 * port). Hooks into the flight computer's 120 Hz loop: checks every step whether the probe's port
 * touches one of the targets' ports and judges the contact with the IDSS limits; while `assist` is
 * on, flies the approach to the chosen port (like the landing assist).
 */
export class Docking {
  /** Docking assist on/off (button in the cockpit). */
  assist = false;
  readonly targets: DockingTarget[];
  private events: DockingEvent[] = [];
  private _last: readonly string[] = [];
  private _dockedTo: DockingTarget | undefined;
  /** Port the assist flies to; unset = the nearest one. */
  private aim: DockingTarget | undefined;

  constructor(
    readonly flight: FlightComputer,
    targets: DockingTarget | readonly DockingTarget[],
    readonly limits: DockingLimits,
    private readonly undockPushMs: number,
  ) {
    this.targets = Array.isArray(targets) ? [...targets] : [targets as DockingTarget];
    flight.autopilot = (s) => {
      if (!this.assist) return undefined;
      const t = this.assistTarget(s);
      return this.inRange(s, t) ? dockingCommand(s, this.probePort, t.port, this.authority()) : undefined;
    };
    flight.afterStep = (s) => this.checkContact(s);
  }

  /** The probe's docking port in its own frame (on top of the hull). */
  get probePort(): Vec3 {
    return this.flight.ship.design.dockingPort ?? new Vec3(0, this.flight.ship.design.hull.size.y / 2, 0);
  }

  get docked(): boolean {
    return this.flight.docked;
  }

  /** What the probe is latched to now. */
  get dockedTo(): DockingTarget | undefined {
    return this.flight.docked ? this._dockedTo : undefined;
  }

  /** Why the last contact did not latch (empty after a good one). */
  get lastFailures(): readonly string[] {
    return this._last;
  }

  /** Target whose port is closest to the probe. */
  nearest(s = this.flight.state): DockingTarget {
    let best = this.targets[0]!;
    let bestD = Infinity;
    for (const t of this.targets) {
      const d = s.position.sub(t.port.position).length();
      if (d < bestD) [best, bestD] = [t, d];
    }
    return best;
  }

  /** The port the assist flies to: the one asked for, else the nearest. */
  assistTarget(s = this.flight.state): DockingTarget {
    return this.aim ?? this.nearest(s);
  }

  /** The target the read-outs refer to: the one docked to, else the assist's. */
  current(): DockingTarget {
    return this.dockedTo ?? this.assistTarget();
  }

  /** Turn the assist on toward a given port (navigation's automatic docking) or the nearest one. */
  assistTo(target?: DockingTarget): void {
    this.aim = target;
    this.assist = true;
  }

  toggleAssist(): void {
    if (this.assist) this.assist = false;
    else this.assistTo();
  }

  alignment(target = this.current()): Alignment {
    return alignment(this.flight.state, this.probePort, target.port);
  }

  inRange(s = this.flight.state, target = this.assistTarget(s)): boolean {
    return s.position.sub(target.port.position).length() <= ASSIST_RANGE_M;
  }

  /** Latch now (the game starts docked). */
  dockNow(target: DockingTarget = this.targets[0]!): void {
    if (this.flight.docked) return;
    this.latch(target);
  }

  /** Open the latches; the springs push the probe away along the port axis. */
  undock(): void {
    const t = this.dockedTo;
    if (!t) return;
    this.flight.undock(t.port.normal.scale(this.undockPushMs));
    this.assist = false;
    this.aim = undefined;
    this.events.push({ type: "undocked", target: t });
  }

  drainEvents(): DockingEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  private latch(t: DockingTarget): void {
    this._last = [];
    this._dockedTo = t;
    this.flight.dock(() => t.dockedPose(this.probePort));
    this.assist = false;
    this.aim = undefined;
    this.events.push({ type: "docked", target: t });
  }

  private authority(): Authority {
    const ship = this.flight.ship;
    const t = (rotation: Vec3) => ship.preview({ mainThrottle: 0, translation: Vec3.ZERO, rotation }).torqueBody;
    const f = (translation: Vec3) => ship.preview({ mainThrottle: 0, translation, rotation: Vec3.ZERO }).forceBody;
    const m = ship.massKg;
    return {
      inertiaKgM2: ship.inertiaKgM2,
      maxTorque: new Vec3(t(Vec3.X).x, t(Vec3.Y).y, t(Vec3.Z).z),
      maxAccel: new Vec3(Math.abs(f(Vec3.X).x) / m, Math.abs(f(Vec3.Y).y) / m, Math.abs(f(Vec3.Z).z) / m),
    };
  }

  private checkContact(s: RigidBodyState): void {
    for (const t of this.targets) {
      const a = alignment(s, this.probePort, t.port);
      if (a.axialM > 0 || a.axialM < -1 || a.lateralM > NODE_RADIUS_M) continue;
      this.contact(s, t, a);
      return;
    }
  }

  private contact(s: RigidBodyState, t: DockingTarget, a: Alignment): void {
    const j = a.lateralM > GUIDE_RADIUS_M ? { capture: false, failures: ["fuera del puerto: has tocado el nodo"] } : judgeContact(a, this.limits);
    if (j.capture) {
      this.latch(t);
      return;
    }
    // No latch: the guide petals push the probe back out along the axis.
    const n = t.port.normal;
    const vAxis = s.velocity.dot(n);
    const back = Math.max(0.02, -vAxis * REBOUND);
    const v = s.velocity.sub(n.scale(vAxis)).add(n.scale(back));
    const damage = Math.max(0, a.closingMs - SAFE_CONTACT_MS) * DAMAGE_PER_MS;
    this.flight.ship.damage(damage);
    this.flight.applyImpulse(v.sub(s.velocity));
    this.flight.nudge(n.scale(-a.axialM + 0.01));
    this._last = j.failures;
    this.events.push({ type: "rebound", target: t, failures: j.failures, damage });
  }
}
