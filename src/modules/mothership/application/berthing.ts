import type { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import { facing } from "@modules/navigation/domain/attitude";
import { alignment, DOCKING_ASSIST, judgeContact, type Alignment, type CraftPort, type DockingLimits, type DockingTarget } from "../domain/docking";

/** A big craft moved as a whole between poses (the mothership on its trips), not flown by the 120 Hz loop. */
export interface KinematicCraft {
  readonly position: Vec3;
  readonly orientation: Quat;
  /** Its thrust over its mass now, m/s². */
  readonly accelerationMs2: number;
  moveTo(position: Vec3, orientation?: Quat): void;
  dockedTo: string | undefined;
}

/**
 * The last approach of a big crewed ship to a station's port, as the ISS's visiting vehicles fly it
 * (docs/design/viajes.md, «Atraque real»). Crew Dragon Demo-1 (2019): Waypoint 1 150 m out from the
 * Node 2 port, Waypoint 2 at 20 m with a go/no-go hold, and 51 min from Waypoint 1 to soft capture
 * (https://planetary.org/articles/crew-dragon-docks). Real.
 */
export const PROXIMITY = {
  /** Waypoint 1: where the ship stops on the port axis before the last approach, m (Demo-1). */
  waypoint1M: 150,
  /** Waypoint 2: the go/no-go hold, m (Demo-1). */
  waypoint2M: 20,
  /** Waypoint 1 to soft capture, s (Demo-1: 51 min). */
  waypoint1ToCaptureS: 51 * 60,
  /** Closing speed along the axis, m/s: the contact speed the docking assist aims at, inside IDSS's 0,05–0,10. */
  closingMs: DOCKING_ASSIST.contactSpeedMs,
} as const;

/** The hold at Waypoint 2, s: what Demo-1's 51 min leave after closing 150 m at the closing speed (derived, ≈15 min). */
export const WAYPOINT2_HOLD_S = PROXIMITY.waypoint1ToCaptureS - PROXIMITY.waypoint1M / PROXIMITY.closingMs;

/** Where the mothership stops on the port axis before the last approach, m: Waypoint 1. */
export const BERTH_STANDOFF_M = PROXIMITY.waypoint1M;

/** Game seconds of the last approach from `fromM` out on the axis: closing at a steady speed, with the hold at Waypoint 2 if it is ahead. */
export function berthSeconds(fromM: number = BERTH_STANDOFF_M): number {
  const d = Math.max(0, fromM);
  return d / PROXIMITY.closingMs + (d > PROXIMITY.waypoint2M ? WAYPOINT2_HOLD_S : 0);
}
/** Time step of the approach, game seconds. */
const STEP_S = 1;

/** Rotation from the craft port's docking frame (+y along the axis, −z along `forward`) to the body. */
const portFrame = (p: CraftPort): Quat => facing(p.forward, p.axis);

/** Body pose of a craft latched to `target` with its port `p`. */
export function berthedPose(target: DockingTarget, p: CraftPort): { position: Vec3; orientation: Quat } {
  const f = portFrame(p);
  const pose = target.dockedPose(f.conjugate().rotate(p.position));
  return { position: pose.position, orientation: pose.orientation.multiply(f.conjugate()).normalize() };
}

/** Body pose on the port axis `standoffM` out from the latched pose, already turned for the approach. */
export function berthStandoff(target: DockingTarget, p: CraftPort, standoffM = BERTH_STANDOFF_M): { position: Vec3; orientation: Quat } {
  const d = berthedPose(target, p);
  return { position: d.position.add(target.port.normal.scale(standoffM)), orientation: d.orientation };
}

export type BerthingStatus = "approach" | "docked" | "failed";

/**
 * The RCS's push on the last approach, m/s²: a game value (Starship's RCS is not published), of the order of
 * Crew Dragon's Draco translation on its ~13 t (it reaches the 0,07 m/s closing speed in under 10 s).
 */
export const BERTH_RCS_MS2 = 0.01;

/**
 * Use case: the mothership docks to a station's port. It is too big for the probe's 120 Hz loop, so
 * it is moved along the port axis with the same braking profile as the probe's docking assist and
 * the contact is judged with the same IDSS limits. Starts wherever the craft is (normally the
 * standoff point after a trip).
 */
export class Berthing {
  private _status: BerthingStatus = "approach";
  private _failures: readonly string[] = [];
  private speed = 0;
  /** Game seconds still to wait at Waypoint 2 (the go/no-go hold), once it gets there. */
  private hold = WAYPOINT2_HOLD_S;

  constructor(
    private readonly craft: KinematicCraft,
    readonly target: DockingTarget,
    private readonly craftPort: CraftPort,
    private readonly limits: DockingLimits,
  ) {
    craft.dockedTo = undefined;
  }

  get status(): BerthingStatus {
    return this._status;
  }
  get failures(): readonly string[] {
    return this._failures;
  }
  get speedMs(): number {
    return this.speed;
  }

  /** The craft measured against the port, as the probe's read-out does it. */
  alignment(velocity = Vec3.ZERO): Alignment {
    const f = portFrame(this.craftPort);
    const state = new RigidBodyState(this.craft.position, velocity, this.craft.orientation.multiply(f).normalize(), Vec3.ZERO);
    return alignment(state, f.conjugate().rotate(this.craftPort.position), this.target.port);
  }

  /** Game seconds left of the approach (the hold included). */
  get remainingS(): number {
    const r = this.remainingM;
    return r / PROXIMITY.closingMs + (this.hold > 0 ? this.hold : 0);
  }

  /** Holding at Waypoint 2. */
  get holding(): boolean {
    return this.hold > 0 && this.remainingM <= PROXIMITY.waypoint2M + 1e-6;
  }

  /** Axial gap left to the port, m. */
  get remainingM(): number {
    return Math.max(0, this.alignment().axialM);
  }

  /** Move the craft `gameS` seconds along the approach. */
  advance(gameS: number): void {
    let t = Math.max(0, gameS);
    while (t > 0 && this._status === "approach") {
      const dt = Math.min(STEP_S, t);
      t -= dt;
      const a0 = this.alignment();
      const n = this.target.port.normal;
      // At Waypoint 2 it holds still for the go/no-go, then closes at the contact speed.
      if (a0.axialM <= PROXIMITY.waypoint2M + 1e-6 && this.hold > 0) {
        this.hold = Math.max(0, this.hold - dt);
        this.speed = 0;
        continue;
      }
      // Never past Waypoint 2 in one step while the hold is still ahead.
      const stopAt = this.hold > 0 && a0.axialM > PROXIMITY.waypoint2M ? PROXIMITY.waypoint2M : 0;
      // Flown on the RCS: it speeds up to the closing speed and, before the hold, brakes to it, at BERTH_RCS_MS2.
      const brakeCap = stopAt > 0 ? Math.sqrt(2 * BERTH_RCS_MS2 * Math.max(0, a0.axialM - stopAt)) : Infinity;
      const want = Math.min(PROXIMITY.closingMs, Math.max(brakeCap, 0.005));
      this.speed = want > this.speed ? Math.min(want, this.speed + BERTH_RCS_MS2 * dt) : want;
      const v = n.scale(-this.speed);
      const step = Math.min(this.speed * dt, Math.max(0, a0.axialM - stopAt));
      this.craft.moveTo(this.craft.position.add(n.scale(-step)));
      if (a0.axialM - step > 1e-6) continue;
      const j = judgeContact(this.alignment(v), this.limits);
      if (!j.capture) {
        this._failures = j.failures;
        this._status = "failed";
        return;
      }
      const pose = berthedPose(this.target, this.craftPort);
      this.craft.moveTo(pose.position, pose.orientation);
      this.craft.dockedTo = this.target.id;
      this._status = "docked";
    }
  }
}

/**
 * The crew flies the last approach by hand (docs/design/puente.md §Acople), as Crew Dragon allows: its crew
 * can take over in manual mode and fly the translation and rotation from the touchscreens, with the docking
 * camera on the same display (Demo-2, 2020-05-31: Hurley flew it near the ISS; https://spaceflightnow.com/2020/05/30/dragon-astronauts-name-their-spacecraft-endeavour-complete-first-manual-flight-test/).
 * Starship's own controls are not published: these steps are game values (en desarrollo), sized so that the
 * IDSS contact window (0,05–0,10 m/s closing, under 0,10 m off the axis and 0,04 m/s of drift) can be hit with taps.
 */
export const MANUAL_BERTH = {
  /** One tap on closing speed, m/s; the top closing speed, m/s. */
  closingStepMs: 0.05,
  closingMaxMs: 0.5,
  /** One tap across the axis, m/s; the top drift, m/s. */
  lateralStepMs: 0.01,
  lateralMaxMs: 0.1,
  /** Game seconds per real second of the hand approach (the board's ×60 is too fast to line up by eye). */
  lapse: 10,
} as const;

/** Axes across the port axis, seen from the docking camera: right and up on its screen. */
export type BerthAxis = "closing" | "right" | "up";

/**
 * Use case: the mothership's last approach flown by hand. Its attitude is held on the port axis (Dragon's
 * flight computer holds it in manual translation); the crew commands closing speed and drift across the
 * axis. At contact the IDSS limits judge it; out of limits it is a failed capture and the ship backs off.
 */
export class ManualBerthing {
  private _status: BerthingStatus = "approach";
  private _failures: readonly string[] = [];
  /** Commanded rates in the port frame, m/s: closing (toward the port), right and up on the camera. */
  private rate = { closing: 0, right: 0, up: 0 };
  /** Δv spent on the approach, m/s. */
  spentMs = 0;

  constructor(
    private readonly craft: KinematicCraft,
    readonly target: DockingTarget,
    private readonly craftPort: CraftPort,
    private readonly limits: DockingLimits,
  ) {
    craft.dockedTo = undefined;
    // Turned for the approach, wherever it holds (the standoff's attitude).
    craft.moveTo(craft.position, berthStandoff(target, craftPort).orientation);
  }

  get status(): BerthingStatus {
    return this._status;
  }
  get failures(): readonly string[] {
    return this._failures;
  }
  get rates(): { readonly closing: number; readonly right: number; readonly up: number } {
    return this.rate;
  }

  /** The camera's right and up across the port axis, world (the port's own frame). */
  private frame(): { right: Vec3; up: Vec3; n: Vec3 } {
    const p = this.target.port;
    const n = p.normal;
    const fwd = p.orientation.rotate(new Vec3(0, 0, -1));
    const up = fwd.sub(n.scale(fwd.dot(n))).normalize();
    return { n, up, right: up.cross(n).normalize() };
  }

  private velocity(): Vec3 {
    const f = this.frame();
    return f.n.scale(-this.rate.closing).add(f.right.scale(this.rate.right)).add(f.up.scale(this.rate.up));
  }

  /** The craft measured against the port, with its commanded velocity. */
  alignment(): Alignment {
    const f = portFrame(this.craftPort);
    const state = new RigidBodyState(this.craft.position, this.velocity(), this.craft.orientation.multiply(f).normalize(), Vec3.ZERO);
    return alignment(state, f.conjugate().rotate(this.craftPort.position), this.target.port);
  }

  /** Offsets across the axis on the camera, m (+ right, + up). */
  offset(): { right: number; up: number } {
    const a = this.alignment();
    const f = this.frame();
    return { right: a.lateral.dot(f.right), up: a.lateral.dot(f.up) };
  }

  /** One tap: change a rate by `steps` of its step (clamped to its top). */
  nudge(axis: BerthAxis, steps: number): void {
    if (this._status !== "approach") return;
    const step = axis === "closing" ? MANUAL_BERTH.closingStepMs : MANUAL_BERTH.lateralStepMs;
    const max = axis === "closing" ? MANUAL_BERTH.closingMaxMs : MANUAL_BERTH.lateralMaxMs;
    const next = Math.max(-max, Math.min(max, Math.round((this.rate[axis] + steps * step) * 1000) / 1000));
    this.spentMs += Math.abs(next - this.rate[axis]);
    this.rate[axis] = next;
  }

  /** Null every rate (hold where it is). */
  hold(): void {
    for (const k of ["closing", "right", "up"] as const) this.nudge(k, -this.rate[k] / (k === "closing" ? MANUAL_BERTH.closingStepMs : MANUAL_BERTH.lateralStepMs));
  }

  /** Let `gameS` pass at the commanded rates; at contact the latches catch or it fails. */
  advance(gameS: number): void {
    let t = Math.max(0, gameS);
    while (t > 0 && this._status === "approach") {
      const dt = Math.min(STEP_S, t);
      t -= dt;
      const a0 = this.alignment();
      const v = this.velocity();
      // Never through the port face in one step.
      const k = this.rate.closing > 0 && a0.axialM - this.rate.closing * dt < 0 ? a0.axialM / (this.rate.closing * dt) : 1;
      this.craft.moveTo(this.craft.position.add(v.scale(dt * k)));
      if (this.alignment().axialM > 1e-6) continue;
      const j = judgeContact(this.alignment(), this.limits);
      if (!j.capture) {
        this._failures = j.failures;
        this._status = "failed";
        // The ship backs off a few metres, as after a missed capture.
        this.craft.moveTo(this.craft.position.add(this.target.port.normal.scale(5)));
        this.rate = { closing: 0, right: 0, up: 0 };
        return;
      }
      const pose = berthedPose(this.target, this.craftPort);
      this.craft.moveTo(pose.position, pose.orientation);
      this.craft.dockedTo = this.target.id;
      this._status = "docked";
    }
  }
}

/**
 * Leaving a station's port: the hooks open, springs push the ship off and it backs out along the port axis
 * to Waypoint 1, as a visiting vehicle departs (its departure burns take it out of the approach ellipsoid).
 * The speed is the docking assist's contact speed (game value inside the IDSS's 0,05–0,10 m/s).
 */
export class Unberthing {
  private _done = false;

  constructor(
    private readonly craft: KinematicCraft,
    readonly target: DockingTarget,
    private readonly craftPort: CraftPort,
  ) {
    craft.dockedTo = undefined;
  }

  get done(): boolean {
    return this._done;
  }
  get speedMs(): number {
    return this._done ? 0 : PROXIMITY.closingMs;
  }

  /** Distance from the port face out along the axis, m. */
  get outM(): number {
    return Math.max(0, this.craft.position.sub(berthedPose(this.target, this.craftPort).position).dot(this.target.port.normal));
  }
  /** Distance left to Waypoint 1, m. */
  get remainingM(): number {
    return Math.max(0, BERTH_STANDOFF_M - this.outM);
  }
  get remainingS(): number {
    return this.remainingM / PROXIMITY.closingMs;
  }

  advance(gameS: number): void {
    if (this._done) return;
    const step = Math.min(this.remainingM, PROXIMITY.closingMs * Math.max(0, gameS));
    this.craft.moveTo(this.craft.position.add(this.target.port.normal.scale(step)));
    if (this.remainingM <= 1e-6) this._done = true;
  }
}
