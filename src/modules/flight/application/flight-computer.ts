import type { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import type { Ship, ThrustCommand } from "@modules/ship/domain/ship";
import { RigidBodyState, stepRigidBody } from "../domain/rigid-body";
import { evaluateContact } from "../domain/contact";

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

export type FlightEvent = "landed" | "lifted-off" | "bounced" | "crashed";

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
  readonly hullIntegrity: number;
}

const STEP_S = 1 / 120;
/** How fast the assist tries to cancel rotation; smaller is snappier. */
const ASSIST_TIME_S = 0.6;

/**
 * Application service: turns pilot input into thruster firings and integrates the ship
 * with a fixed timestep. Deterministic, so whole flights can be tested without rendering.
 */
export class FlightComputer {
  rotationAssist = true;
  private accumulator = 0;
  private _simTimeS = 0;
  /** Where the ship is anchored, in the target's own frame, while landed. */
  private anchor: { position: Vec3; orientation: Quat } | null = null;
  private events: FlightEvent[] = [];

  constructor(
    readonly ship: Ship,
    private _state: RigidBodyState,
    private readonly world: { gravitySources: readonly GravitySource[]; target?: FlightTarget },
  ) {}

  get state(): RigidBodyState {
    return this._state;
  }
  get simTimeS(): number {
    return this._simTimeS;
  }
  get landed(): boolean {
    return this.anchor !== null;
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

  /** Events since the last call (landing, lift-off, bounce, crash). */
  drainEvents(): FlightEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  update(realDtS: number, input: ThrustCommand): void {
    this.accumulator += realDtS;
    while (this.accumulator >= STEP_S - 1e-12) {
      this.step(input);
      this.accumulator -= STEP_S;
      this._simTimeS += STEP_S;
    }
  }

  telemetry(): Telemetry {
    const s = this._state;
    const target = this.world.target;
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
      hullIntegrity: this.ship.hullIntegrity,
    };
  }

  private step(input: ThrustCommand): void {
    const target = this.world.target;
    if (this.anchor && target) {
      const thrusting = input.mainThrottle > 0 || input.translation.length() > 0;
      if (!thrusting) {
        this.rideSurface(target, this._simTimeS + STEP_S);
        return;
      }
      this.anchor = null;
      this.events.push("lifted-off");
    }
    const cmd = this.rotationAssist && input.rotation.length() === 0 ? { ...input, rotation: this.dampRotation() } : input;
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
  }

  private checkContact(target: FlightTarget, t: number): void {
    const s = this._state;
    const contact = evaluateContact(
      {
        height: target.surfaceDistance(s.position, t),
        normal: s.position.sub(target.position).normalize(),
        groundVelocity: target.surfaceVelocity(s.position),
      },
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
