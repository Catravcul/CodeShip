import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";

/** Immutable kinematic state. Angular velocity is in the body frame (what gyroscopes on board read). */
export class RigidBodyState {
  constructor(
    readonly position: Vec3,
    readonly velocity: Vec3,
    readonly orientation: Quat,
    readonly angularVelocityBody: Vec3,
  ) {}

  static at(position: Vec3): RigidBodyState {
    return new RigidBodyState(position, Vec3.ZERO, Quat.IDENTITY, Vec3.ZERO);
  }
  withVelocity(v: Vec3): RigidBodyState {
    return new RigidBodyState(this.position, v, this.orientation, this.angularVelocityBody);
  }
  withAngularVelocity(w: Vec3): RigidBodyState {
    return new RigidBodyState(this.position, this.velocity, this.orientation, w);
  }
  withOrientation(q: Quat): RigidBodyState {
    return new RigidBodyState(this.position, this.velocity, q, this.angularVelocityBody);
  }
  toWorld(vBody: Vec3): Vec3 {
    return this.orientation.rotate(vBody);
  }
  toBody(vWorld: Vec3): Vec3 {
    return this.orientation.conjugate().rotate(vWorld);
  }
}

export interface Loads {
  readonly massKg: number;
  /** Principal moments of inertia (body axes), kg·m². */
  readonly inertia: Vec3;
  readonly forceWorld: Vec3;
  readonly torqueBody: Vec3;
}

/**
 * One semi-implicit Euler step. Linear: a = F/m. Angular: Euler's equations
 * I·dω/dt = τ − ω × (I·ω), so free tumbling behaves like a real body.
 */
export function stepRigidBody(s: RigidBodyState, loads: Loads, dt: number): RigidBodyState {
  const velocity = s.velocity.add(loads.forceWorld.scale(dt / loads.massKg));
  const position = s.position.add(velocity.scale(dt));

  const w = s.angularVelocityBody;
  const gyro = w.cross(loads.inertia.mul(w));
  const alpha = loads.torqueBody.sub(gyro).div(loads.inertia);
  const angularVelocityBody = w.add(alpha.scale(dt));
  const orientation = s.orientation.integrate(angularVelocityBody, dt);

  return new RigidBodyState(position, velocity, orientation, angularVelocityBody);
}
