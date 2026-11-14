import type { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import { facing } from "@modules/navigation/domain/attitude";
import { alignment, approachSpeed, judgeContact, type Alignment, type CraftPort, type DockingLimits, type DockingTarget } from "../domain/docking";

/** A big craft moved as a whole between poses (the mothership on its trips), not flown by the 120 Hz loop. */
export interface KinematicCraft {
  readonly position: Vec3;
  readonly orientation: Quat;
  /** Its thrust over its mass now, m/s². */
  readonly accelerationMs2: number;
  moveTo(position: Vec3, orientation?: Quat): void;
  dockedTo: string | undefined;
}

/** Game value: where the mothership stops on the port axis before the last approach, m. */
export const BERTH_STANDOFF_M = 80;
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
 * Use case: the mothership docks to a station's port. It is too big for the probe's 120 Hz loop, so
 * it is moved along the port axis with the same braking profile as the probe's docking assist and
 * the contact is judged with the same IDSS limits. Starts wherever the craft is (normally the
 * standoff point after a trip).
 */
export class Berthing {
  private _status: BerthingStatus = "approach";
  private _failures: readonly string[] = [];
  private speed = 0;

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
      this.speed = approachSpeed(a0.axialM, this.craft.accelerationMs2);
      const v = n.scale(-this.speed);
      const step = Math.min(this.speed * dt, Math.max(0, a0.axialM));
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
