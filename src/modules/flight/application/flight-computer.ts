import { Vec3 } from "@core/math/vec3";
import type { Ship, ThrustCommand } from "@modules/ship/domain/ship";
import { RigidBodyState, stepRigidBody } from "../domain/rigid-body";

/** Anything that pulls the ship (asteroids, later planets). */
export interface GravitySource {
  gravityAt(p: Vec3): Vec3;
}

/** What the HUD can lock on to. */
export interface FlightTarget {
  readonly position: Vec3;
  readonly meanRadiusM: number;
}

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
      distanceToSurface: target ? dist - target.meanRadiusM : dist,
      closingSpeed: dist === 0 ? 0 : -rel.dot(s.velocity) / dist,
      relativeVelocityBody: s.toBody(s.velocity),
      angularVelocityBody: s.angularVelocityBody,
      deltaV: this.ship.mainDeltaV(),
      massKg: this.ship.massKg,
    };
  }

  private step(input: ThrustCommand): void {
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
