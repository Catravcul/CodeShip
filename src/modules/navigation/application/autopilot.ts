import { Vec3 } from "@core/math/vec3";
import type { Guidance, FlightTarget } from "@modules/flight/application/flight-computer";
import type { RigidBodyState } from "@modules/flight/domain/rigid-body";
import type { Ship, ThrustCommand } from "@modules/ship/domain/ship";
import { TRANSFER_TUNING, turnTimeS } from "../domain/transfer";

/** What the autopilot is doing, for the HUD. */
export type AutopilotPhase = "orient" | "burn" | "coast" | "flip" | "brake" | "aim" | "arrived";

/** Guidance gains and limits (game values tuned on the Explorer; docs/design/navegacion.md). */
export const AUTOPILOT_TUNING = {
  /** Start a main-engine burn when the velocity is this far from the plan, m/s… */
  burnStartMS: 1,
  /** …and stop it once within this, m/s. Smaller errors are trimmed with the RCS. */
  burnStopMS: 0.15,
  /** Fire the main engine only with the nose this close to the wanted direction. */
  alignRad: (6 * Math.PI) / 180,
  /** Top turn rate the autopilot commands, rad/s. */
  maxRateRadS: 0.15,
  /** Share of the RCS angular acceleration used for planning turns. */
  turnShare: 0.5,
  /** A waypoint counts as passed this close, metres. */
  waypointReachM: 60,
  /** Done when slower than this relative to the target, m/s… */
  arriveSpeedMS: 0.25,
  /** …and with the nose this close to the target. */
  arriveAimRad: (5 * Math.PI) / 180,
  /** Never fly the ship closer than this share of the approach height (safety hand-over). */
  safetyShare: 0.5,
} as const;

const NOSE_BODY = new Vec3(0, 0, -1);
const clamp = (v: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));
const angleBetween = (a: Vec3, b: Vec3) => Math.atan2(a.cross(b).length(), a.dot(b));

export interface AutopilotStatus {
  readonly phase: AutopilotPhase;
  /** Path left to the hand-over point, metres. */
  readonly remainingM: number;
  readonly speedMS: number;
  /** Rough time left, seconds. */
  readonly etaS: number;
}

/**
 * Trip guidance with the ship's real thrust: flies the route at the planned cruise speed, turns
 * the ship round and brakes so the speed falls to zero at the hand-over height, then points the
 * nose at the target and returns control. Velocity-tracking law: the wanted velocity along the path
 * is min(cruise, √(2·a·distance left)); big errors are fixed with the main engine (after turning
 * the nose to them), small ones with the RCS.
 */
export class TripAutopilot implements Guidance {
  private wp = 0;
  private burning = false;
  private aiming = false;
  private _arrived = false;
  private _status: AutopilotStatus;
  private readonly tuning = AUTOPILOT_TUNING;

  constructor(
    private readonly ship: Ship,
    private readonly target: FlightTarget,
    /** Detour waypoints before the final leg straight at the target (may be empty). */
    private readonly waypoints: readonly Vec3[],
    readonly cruiseMS: number,
    readonly approachM = TRANSFER_TUNING.approachM,
  ) {
    this._status = { phase: "orient", remainingM: Infinity, speedMS: 0, etaS: Infinity };
  }

  get arrived(): boolean {
    return this._arrived;
  }
  get status(): AutopilotStatus {
    return this._status;
  }

  /** Main engine acceleration now, m/s². */
  private accel(): number {
    return this.ship.preview({ mainThrottle: 1, translation: Vec3.ZERO, rotation: Vec3.ZERO }).forceBody.length() / this.ship.massKg;
  }

  private torqueMax(): Vec3 {
    const t = (r: Vec3) => this.ship.preview({ mainThrottle: 0, translation: Vec3.ZERO, rotation: r }).torqueBody;
    return new Vec3(Math.abs(t(Vec3.X).x), Math.abs(t(Vec3.Y).y), Math.abs(t(Vec3.Z).z));
  }

  /** Rotation command that turns the nose toward `dirWorld` (bang-bang with a rate cap, roll held at zero). */
  private pointNose(state: RigidBodyState, dirWorld: Vec3): Vec3 {
    const d = state.toBody(dirWorld.normalize());
    let axis = NOSE_BODY.cross(d);
    const angle = Math.atan2(axis.length(), NOSE_BODY.dot(d));
    if (axis.length() < 1e-9) axis = angle > 1 ? Vec3.Y : Vec3.ZERO;
    const err = axis.length() === 0 ? Vec3.ZERO : axis.normalize().scale(angle);
    const I = this.ship.inertiaKgM2;
    const m = this.torqueMax();
    const w = state.angularVelocityBody;
    const T = this.tuning;
    const axisCmd = (e: number, wi: number, Ii: number, mi: number) => {
      if (mi === 0) return 0;
      const alpha = (mi / Ii) * T.turnShare;
      const want = Math.sign(e) * Math.min(T.maxRateRadS, Math.sqrt(2 * alpha * Math.abs(e)));
      return clamp(((want - wi) * Ii) / (mi * 0.25));
    };
    return new Vec3(axisCmd(err.x, w.x, I.x, m.x), axisCmd(err.y, w.y, I.y, m.y), axisCmd(0, w.z, I.z, m.z));
  }

  /** Seconds to turn the ship half round with the planning limits. */
  private flipTimeS(): number {
    const I = this.ship.inertiaKgM2;
    const m = this.torqueMax();
    const alpha = Math.min(m.x / I.x, m.y / I.y) * this.tuning.turnShare;
    return turnTimeS(Math.PI, alpha, this.tuning.maxRateRadS);
  }

  command(state: RigidBodyState, simTimeS: number): ThrustCommand | null {
    const T = this.tuning;
    const pos = state.position;
    const vel = state.velocity;
    const speed = vel.length();
    const height = this.target.surfaceDistance(pos, simTimeS);
    const toCentre = this.target.position.sub(pos);
    const surfaceR = toCentre.length() - height;
    const nose = state.toWorld(NOSE_BODY);

    // Safety: never let the guidance take the ship near the ground.
    if (height < this.approachM * T.safetyShare) return this.finish(state, "arrived");

    while (this.wp < this.waypoints.length && this.waypoints[this.wp]!.sub(pos).length() < T.waypointReachM) this.wp++;
    const onFinal = this.wp >= this.waypoints.length;
    const aimPoint = onFinal ? this.target.position : this.waypoints[this.wp]!;
    let remaining = onFinal ? height - this.approachM : aimPoint.sub(pos).length();
    if (!onFinal) {
      for (let i = this.wp; i < this.waypoints.length - 1; i++) remaining += this.waypoints[i + 1]!.sub(this.waypoints[i]!).length();
      remaining += this.target.position.sub(this.waypoints[this.waypoints.length - 1]!).length() - surfaceR - this.approachM;
    }
    const u = aimPoint.sub(pos).normalize();

    // Arrived at the hand-over point: kill what is left of the speed with the RCS and look at the target.
    if (onFinal && (this.aiming || (remaining < 15 && speed < 1))) {
      this.aiming = true;
      const rotation = this.pointNose(state, toCentre);
      const aimErr = angleBetween(nose, toCentre);
      if (speed < T.arriveSpeedMS && aimErr < T.arriveAimRad && state.angularVelocityBody.length() < 0.01) return this.finish(state, "arrived");
      const translation = this.rcsTrim(state, vel.scale(-1));
      this._status = { phase: "aim", remainingM: Math.max(0, remaining), speedMS: speed, etaS: 10 };
      return { mainThrottle: 0, translation, rotation };
    }

    const a = this.accel();
    const aBrake = a * TRANSFER_TUNING.brakeShare;
    const retro = speed > 0.05 ? vel.scale(-1 / speed) : u.scale(-1);
    // Time the flip will still take before braking can start, as distance lost at this speed.
    const lead = speed * this.flipTimeS() * (angleBetween(nose, retro) / Math.PI);
    const vWant = remaining <= 0 ? 0 : Math.min(this.cruiseMS, Math.sqrt(2 * aBrake * Math.max(0, remaining - lead)));
    const err = u.scale(vWant).sub(vel);
    const e = err.length();

    if (e > T.burnStartMS || (this.burning && e > T.burnStopMS)) this.burning = true;
    else this.burning = false;
    const braking = err.dot(vel) < 0 && speed > 0.5;

    let phase: AutopilotPhase;
    let dir: Vec3;
    let throttle = 0;
    let translation = Vec3.ZERO;
    if (this.burning) {
      dir = err;
      const aligned = angleBetween(nose, err) < T.alignRad;
      throttle = aligned ? clamp(e / (a * 0.5), 0.05, 1) : 0;
      phase = aligned ? (braking ? "brake" : "burn") : braking ? "flip" : "orient";
    } else {
      // Cruising: turn round early when the braking point is close, else fly nose first.
      const stopDist = (speed * speed) / (2 * aBrake);
      const flipSoon = speed > 0.5 && remaining - stopDist < speed * this.flipTimeS() * 1.5 + 50;
      dir = flipSoon ? retro : speed > 0.5 ? vel : u;
      translation = this.rcsTrim(state, err);
      phase = flipSoon && angleBetween(nose, retro) > T.alignRad ? "flip" : "coast";
    }
    const rotation = this.pointNose(state, dir);
    const eta = speed > 0.5 ? Math.max(0, remaining) / Math.max(0.5, Math.min(speed, this.cruiseMS)) + speed / (2 * aBrake) : Math.max(0, remaining) / Math.max(1, this.cruiseMS) + this.cruiseMS / a;
    this._status = { phase, remainingM: Math.max(0, remaining), speedMS: speed, etaS: eta };
    return { mainThrottle: throttle, translation, rotation };
  }

  /** RCS translation (body frame) to remove a small velocity error. */
  private rcsTrim(state: RigidBodyState, errWorld: Vec3): Vec3 {
    if (errWorld.length() < 0.02) return Vec3.ZERO;
    const b = state.toBody(errWorld).scale(1 / 0.2);
    return new Vec3(clamp(b.x), clamp(b.y), clamp(b.z));
  }

  private finish(state: RigidBodyState, phase: "arrived"): null {
    this._arrived = true;
    this._status = { phase, remainingM: 0, speedMS: state.velocity.length(), etaS: 0 };
    return null;
  }
}
