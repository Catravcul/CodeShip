import { Vec3 } from "@core/math/vec3";
import type { FlightComputer } from "@modules/flight/application/flight-computer";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import type { Mothership } from "../domain/mothership";
import { alignment, dockingCommand, judgeContact, type Alignment, type Authority, type DockingLimits } from "../domain/docking";

export type DockingEvent =
  | { readonly type: "docked" }
  | { readonly type: "undocked" }
  | { readonly type: "rebound"; readonly failures: readonly string[]; readonly damage: number };

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
 * Use case: the probe docks with and undocks from the mothership. Hooks into the flight computer's
 * 120 Hz loop: checks every step whether the two ports touch and judges the contact with the IDSS
 * limits; while `assist` is on, flies the approach (like the landing assist).
 */
export class Docking {
  /** Docking assist on/off (button in the cockpit). */
  assist = false;
  private events: DockingEvent[] = [];
  private _last: readonly string[] = [];

  constructor(
    readonly flight: FlightComputer,
    readonly mothership: Mothership,
    readonly limits: DockingLimits,
    private readonly undockPushMs: number,
  ) {
    flight.autopilot = (s) => (this.assist && this.inRange(s) ? dockingCommand(s, this.probePort, this.mothership.port, this.authority()) : undefined);
    flight.afterStep = (s) => this.checkContact(s);
  }

  /** The probe's docking port in its own frame (on top of the hull). */
  get probePort(): Vec3 {
    return this.flight.ship.design.dockingPort ?? new Vec3(0, this.flight.ship.design.hull.size.y / 2, 0);
  }

  get docked(): boolean {
    return this.flight.docked;
  }

  /** Why the last contact did not latch (empty after a good one). */
  get lastFailures(): readonly string[] {
    return this._last;
  }

  alignment(): Alignment {
    return alignment(this.flight.state, this.probePort, this.mothership.port);
  }

  inRange(s = this.flight.state): boolean {
    return s.position.sub(this.mothership.port.position).length() <= ASSIST_RANGE_M;
  }

  /** Latch now (the game starts docked). */
  dockNow(): void {
    if (this.flight.docked) return;
    this.flight.dock(() => this.mothership.dockedPose(this.probePort));
    this.assist = false;
    this._last = [];
    this.events.push({ type: "docked" });
  }

  /** Open the latches; the springs push the probe away along the port axis. */
  undock(): void {
    if (!this.flight.docked) return;
    this.flight.undock(this.mothership.port.normal.scale(this.undockPushMs));
    this.assist = false;
    this.events.push({ type: "undocked" });
  }

  drainEvents(): DockingEvent[] {
    const out = this.events;
    this.events = [];
    return out;
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
    const a = alignment(s, this.probePort, this.mothership.port);
    if (a.axialM > 0 || a.axialM < -1 || a.lateralM > NODE_RADIUS_M) return;
    const j = a.lateralM > GUIDE_RADIUS_M ? { capture: false, failures: ["fuera del puerto: has tocado el nodo"] } : judgeContact(a, this.limits);
    if (j.capture) {
      this._last = [];
      this.flight.dock(() => this.mothership.dockedPose(this.probePort));
      this.assist = false;
      this.events.push({ type: "docked" });
      return;
    }
    // No latch: the guide petals push the probe back out along the axis.
    const n = this.mothership.port.normal;
    const vAxis = s.velocity.dot(n);
    const back = Math.max(0.02, -vAxis * REBOUND);
    const v = s.velocity.sub(n.scale(vAxis)).add(n.scale(back));
    const damage = Math.max(0, a.closingMs - SAFE_CONTACT_MS) * DAMAGE_PER_MS;
    this.flight.ship.damage(damage);
    this.flight.applyImpulse(v.sub(s.velocity));
    this.flight.nudge(n.scale(-a.axialM + 0.01));
    this._last = j.failures;
    this.events.push({ type: "rebound", failures: j.failures, damage });
  }
}
