import type { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import type { Ship, ThrustCommand } from "@modules/ship/domain/ship";
import { RigidBodyState, stepRigidBody } from "../domain/rigid-body";
import { evaluateContact, reachToward } from "../domain/contact";

/** Anything that pulls the ship (asteroids, later planets). */
export interface GravitySource {
  gravityAt(p: Vec3): Vec3;
}

/** A body the ship flies to and can land on (an asteroid). */
export interface FlightTarget {
  readonly position: Vec3;
  readonly meanRadiusM: number;
  surfaceDistance(world: Vec3, timeS: number): number;
  surfaceVelocity(world: Vec3): Vec3;
  orientationAt(timeS: number): Quat;
  toLocal(world: Vec3, timeS: number): Vec3;
  toWorld(local: Vec3, timeS: number): Vec3;
}

/**
 * Port for trip guidance (the trip autopilot). Asked for a command every simulation step, so
 * it keeps flying correctly under time warp. Returns null once it hands control back.
 */
export interface Guidance {
  command(state: RigidBodyState, simTimeS: number): ThrustCommand | null;
}

export type FlightEvent = "landed" | "lifted-off" | "bounced" | "crashed" | "tilted" | "docked" | "undocked";

export const NO_INPUT: ThrustCommand = { mainThrottle: 0, translation: Vec3.ZERO, rotation: Vec3.ZERO };

export interface Telemetry {
  readonly distanceToSurface: number;
  /** Positive when approaching the target, m/s. */
  readonly closingSpeed: number;
  /** Velocity relative to the target, in the ship's frame (x right, y up, -z forward). */
  readonly relativeVelocityBody: Vec3;
  readonly angularVelocityBody: Vec3;
  readonly deltaV: number;
  readonly massKg: number;
  readonly landed: boolean;
  /** Held to a mothership's docking port. */
  readonly docked: boolean;
  readonly hullIntegrity: number;
  /** Gap between the lowest part of the ship (legs or hull) and the ground, metres. */
  readonly clearance: number;
  /** Angle between the belly (body −Y) and the local vertical, degrees. */
  readonly tiltDeg: number;
}

const STEP_S = 1 / 120;
/** Nose cone ahead of the hull box (matches the rendered ship). */
const NOSE_M = 0.45;
/** Landing assist: seconds to swing the belly to the ground, and its damping. */
const LEVEL_TIME_S = 2.5;
/** How fast the assist tries to cancel rotation; smaller is snappier. */
const ASSIST_TIME_S = 0.6;

/**
 * Application service: turns pilot input into thruster firings and integrates the ship
 * with a fixed timestep. Deterministic, so whole flights can be tested without rendering.
 */
export class FlightComputer {
  rotationAssist = true;
  /** Turns the belly toward the ground (like a lander's attitude hold) while the pilot isn't rotating. */
  landingAssist = false;
  private accumulator = 0;
  private _simTimeS = 0;
  /** Where the ship is anchored, in the target's own frame, while landed. */
  private anchor: { position: Vec3; orientation: Quat } | null = null;
  private events: FlightEvent[] = [];
  private _guidance: Guidance | null = null;
  private _target: FlightTarget | undefined;
  /** While docked, the pose the ship is held to (a mothership's port). */
  private berth: (() => RigidBodyState) | null = null;
  /**
   * Optional assist run at every 120 Hz step while the pilot gives no input (e.g. the docking
   * assist). Returning undefined leaves the usual rotation/landing assists in charge.
   */
  autopilot?: (state: RigidBodyState) => ThrustCommand | undefined;
  /** Called after every integration step while free (e.g. to check for docking contact). */
  afterStep?: (state: RigidBodyState) => void;

  constructor(
    readonly ship: Ship,
    private _state: RigidBodyState,
    private readonly world: { gravitySources: readonly GravitySource[]; target?: FlightTarget; startTimeS?: number },
  ) {
    this._target = world.target;
    // A craft that joins later (a new probe) shares the mission clock, so asteroids turn the same for both.
    this._simTimeS = world.startTimeS ?? 0;
  }

  /** The body the telemetry, contact and landing refer to. */
  get target(): FlightTarget | undefined {
    return this._target;
  }

  /** Point the flight computer at another body. Not while anchored to the current one. */
  setTarget(target: FlightTarget): void {
    if (this.anchor) throw new Error("Cannot change target while landed");
    this._target = target;
  }

  /** Trip guidance flying the ship now (null when the pilot has the controls). */
  get guidance(): Guidance | null {
    return this._guidance;
  }

  /** Hand the controls to automatic guidance until it returns null or the pilot touches the controls. */
  engage(guidance: Guidance): void {
    this._guidance = guidance;
  }

  disengage(): void {
    this._guidance = null;
  }

  get state(): RigidBodyState {
    return this._state;
  }
  get simTimeS(): number {
    return this._simTimeS;
  }
  get landed(): boolean {
    return this.anchor !== null;
  }

  get docked(): boolean {
    return this.berth !== null;
  }

  /** Latch to a docking port: from now on the ship rides `pose` until `undock`. */
  dock(pose: () => RigidBodyState): void {
    this.anchor = null;
    this.berth = pose;
    this._state = pose();
    this.events.push("docked");
  }

  /** Open the latches and push off with `separation` (world frame, m/s, relative to the port). */
  undock(separation: Vec3): void {
    if (!this.berth) return;
    const p = this.berth();
    this.berth = null;
    this._state = p.withVelocity(p.velocity.add(separation));
    this.events.push("undocked");
  }

  /** Drop the anchors (e.g. an enraged asteroid shakes the ship off). */
  releaseAnchor(): void {
    if (!this.anchor) return;
    this.anchor = null;
    this.events.push("lifted-off");
  }

  /** Instant change of velocity (world frame), e.g. a push from outside. */
  applyImpulse(deltaV: Vec3): void {
    this._state = this._state.withVelocity(this._state.velocity.add(deltaV));
  }

  /** Instant change of position (world frame), e.g. pushed back out of a docking port. */
  nudge(delta: Vec3): void {
    this._state = new RigidBodyState(this._state.position.add(delta), this._state.velocity, this._state.orientation, this._state.angularVelocityBody);
  }

  /** Events since the last call (landing, lift-off, bounce, crash). */
  drainEvents(): FlightEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  update(realDtS: number, input: ThrustCommand): void {
    // Any pilot input takes the controls back from the autopilot.
    if (this._guidance && (input.mainThrottle > 0 || input.translation.length() > 0 || input.rotation.length() > 0)) this._guidance = null;
    this.accumulator += realDtS;
    while (this.accumulator >= STEP_S - 1e-12) {
      this.step(input);
      this.accumulator -= STEP_S;
      this._simTimeS += STEP_S;
    }
  }

  telemetry(): Telemetry {
    const s = this._state;
    const target = this._target;
    const rel = target ? s.position.sub(target.position) : s.position;
    const dist = rel.length();
    return {
      distanceToSurface: target ? target.surfaceDistance(s.position, this._simTimeS) : dist,
      closingSpeed: dist === 0 ? 0 : -rel.dot(s.velocity) / dist,
      relativeVelocityBody: s.toBody(s.velocity),
      angularVelocityBody: s.angularVelocityBody,
      deltaV: this.ship.mainDeltaV(),
      massKg: this.ship.massKg,
      landed: this.landed,
      docked: this.docked,
      hullIntegrity: this.ship.hullIntegrity,
      ...this.groundGeometry(),
    };
  }

  /** Local down at the ship, how far the ship reaches toward it and how tilted the belly is. */
  private groundGeometry(): { clearance: number; tiltDeg: number; reach: number; normal: Vec3; tiltRad: number } {
    const s = this._state;
    const target = this._target;
    const normal = target ? s.position.sub(target.position).normalize() : Vec3.Y;
    const downBody = s.toBody(normal.scale(-1));
    const half = this.ship.design.hull.size.scale(0.5);
    const reach = reachToward(half, downBody, NOSE_M);
    const tiltRad = Math.acos(Math.max(-1, Math.min(1, -downBody.y)));
    const height = target ? target.surfaceDistance(s.position, this._simTimeS) : Infinity;
    return { clearance: height - reach, tiltDeg: (tiltRad * 180) / Math.PI, reach, normal, tiltRad };
  }

  private step(pilotInput: ThrustCommand): void {
    const target = this._target;
    if (this.berth) {
      // Docked: the latches hold the ship; thrusters stay quiet until it undocks.
      this._state = this.berth();
      return;
    }
    let input = pilotInput;
    // Trip guidance first; the docking assist (`autopilot`) only acts when guidance is off.
    if (this._guidance) {
      const auto = this._guidance.command(this._state, this._simTimeS);
      if (auto) input = auto;
      else this._guidance = null;
    }
    if (this.anchor && target) {
      const thrusting = input.mainThrottle > 0 || input.translation.length() > 0;
      if (!thrusting) {
        this.rideSurface(target, this._simTimeS + STEP_S);
        return;
      }
      this.anchor = null;
      this.events.push("lifted-off");
    }
    const pilotIdle = input.mainThrottle === 0 && input.translation.length() === 0 && input.rotation.length() === 0;
    const auto = pilotIdle ? this.autopilot?.(this._state) : undefined;
    if (auto) input = auto;
    const idleRot = input.rotation.length() === 0;
    const cmd = idleRot && this.landingAssist && target ? { ...input, rotation: this.levelRotation() } : idleRot && this.rotationAssist ? { ...input, rotation: this.dampRotation() } : input;
    const out = this.ship.fire(cmd, STEP_S);
    let gravity = Vec3.ZERO;
    for (const g of this.world.gravitySources) gravity = gravity.add(g.gravityAt(this._state.position));
    const massKg = this.ship.massKg;
    this._state = stepRigidBody(
      this._state,
      {
        massKg,
        inertia: this.ship.inertiaKgM2,
        forceWorld: this._state.toWorld(out.forceBody).add(gravity.scale(massKg)),
        torqueBody: out.torqueBody,
      },
      STEP_S,
    );
    if (target) this.checkContact(target, this._simTimeS + STEP_S);
    if (!this.anchor) this.afterStep?.(this._state);
  }

  private checkContact(target: FlightTarget, t: number): void {
    let s = this._state;
    const g = this.groundGeometry();
    const height = target.surfaceDistance(s.position, t);
    // Never sink into the ground: push the ship back out to where its hull or legs touch.
    if (height < g.reach - 0.02) {
      s = new RigidBodyState(s.position.add(g.normal.scale(g.reach - height)), s.velocity, s.orientation, s.angularVelocityBody);
      this._state = s;
    }
    const contact = evaluateContact(
      { height: Math.max(height, g.reach - 0.02), normal: g.normal, groundVelocity: target.surfaceVelocity(s.position), reach: g.reach, tiltRad: g.tiltRad },
      s.velocity,
    );
    switch (contact.kind) {
      case "landed":
        this.anchor = {
          position: target.toLocal(s.position, t),
          orientation: target.orientationAt(t).conjugate().multiply(s.orientation),
        };
        this.events.push("landed");
        this.rideSurface(target, t);
        break;
      case "bounce":
        this._state = s.withVelocity(contact.velocity);
        this.events.push("bounced");
        break;
      case "tilted":
        this._state = s.withVelocity(contact.velocity);
        this.events.push("tilted");
        break;
      case "crash":
        this._state = s.withVelocity(contact.velocity);
        this.ship.damage(contact.hullDamage);
        this.events.push("crashed");
        break;
    }
  }

  /** While anchored the ship turns with the asteroid. */
  private rideSurface(target: FlightTarget, t: number): void {
    const a = this.anchor!;
    const position = target.toWorld(a.position, t);
    this._state = new RigidBodyState(
      position,
      target.surfaceVelocity(position),
      target.orientationAt(t).multiply(a.orientation),
      Vec3.ZERO,
    );
  }

  /** PD controller that swings body +Y onto the local vertical, saturated by RCS authority. */
  private levelRotation(): Vec3 {
    const s = this._state;
    const g = this.groundGeometry();
    const upBody = s.toBody(g.normal);
    // Rotation axis (body frame) that turns +Y toward the local up, scaled by the angle.
    const axis = Vec3.Y.cross(upBody);
    const err = axis.length() < 1e-9 ? (upBody.y < 0 ? Vec3.X.scale(Math.PI) : Vec3.ZERO) : axis.normalize().scale(g.tiltRad);
    const w = s.angularVelocityBody;
    const I = this.ship.inertiaKgM2;
    const max = this.rcsTorque();
    // Rate the belly may swing at: e / LEVEL_TIME_S near the target, but never faster than the RCS can
    // brake to zero over the angle left using half its real authority (α = torque / inertia), so a
    // heavier ship or weaker thrusters swing slower instead of overshooting. A rate loop then follows it.
    const axisCmd = (e: number, wi: number, Ii: number, mi: number) => {
      if (mi === 0) return 0;
      const alpha = Math.abs(mi) / Ii;
      const brake = Math.sqrt(alpha * Math.abs(e));
      const wanted = Math.sign(e) * Math.min(brake, Math.abs(e) / LEVEL_TIME_S);
      return Math.max(-1, Math.min(1, ((wanted - wi) * Ii) / (mi * ASSIST_TIME_S)));
    };
    return new Vec3(axisCmd(err.x, w.x, I.x, max.x), axisCmd(err.y, w.y, I.y, max.y), axisCmd(err.z, w.z, I.z, max.z));
  }

  private rcsTorque(): Vec3 {
    return new Vec3(
      this.ship.preview({ mainThrottle: 0, translation: Vec3.ZERO, rotation: Vec3.X }).torqueBody.x,
      this.ship.preview({ mainThrottle: 0, translation: Vec3.ZERO, rotation: Vec3.Y }).torqueBody.y,
      this.ship.preview({ mainThrottle: 0, translation: Vec3.ZERO, rotation: Vec3.Z }).torqueBody.z,
    );
  }

  /** Proportional controller: command the torque that would stop the spin in ASSIST_TIME_S, saturated by RCS authority. */
  private dampRotation(): Vec3 {
    const w = this._state.angularVelocityBody;
    if (w.length() < 1e-6) return Vec3.ZERO;
    const I = this.ship.inertiaKgM2;
    const max = new Vec3(
      this.ship.preview({ mainThrottle: 0, translation: Vec3.ZERO, rotation: Vec3.X }).torqueBody.x,
      this.ship.preview({ mainThrottle: 0, translation: Vec3.ZERO, rotation: Vec3.Y }).torqueBody.y,
      this.ship.preview({ mainThrottle: 0, translation: Vec3.ZERO, rotation: Vec3.Z }).torqueBody.z,
    );
    const axis = (wi: number, Ii: number, mi: number) => (mi === 0 ? 0 : Math.max(-1, Math.min(1, (-wi * Ii) / (mi * ASSIST_TIME_S))));
    return new Vec3(axis(w.x, I.x, max.x), axis(w.y, I.y, max.y), axis(w.z, I.z, max.z));
  }
}
