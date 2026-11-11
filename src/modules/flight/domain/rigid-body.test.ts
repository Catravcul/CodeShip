import { describe, expect, it } from "vitest";
import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import { RigidBodyState, stepRigidBody } from "./rigid-body";

const I = new Vec3(100, 200, 300);
const at = (s: RigidBodyState, n: number, f: (s: RigidBodyState) => Parameters<typeof stepRigidBody>[1], dt = 0.01) => {
  for (let i = 0; i < n; i++) s = stepRigidBody(s, f(s), dt);
  return s;
};

describe("rigid body (6DOF, Newtonian)", () => {
  it("keeps constant velocity with no force (first law)", () => {
    const s = at(RigidBodyState.at(Vec3.ZERO).withVelocity(new Vec3(1, 2, 3)), 100, () => ({ massKg: 10, inertia: I, forceWorld: Vec3.ZERO, torqueBody: Vec3.ZERO }));
    expect(s.position.x).toBeCloseTo(1, 9);
    expect(s.position.z).toBeCloseTo(3, 9);
  });

  it("a = F/m: 10 N on 10 kg for 2 s gives 2 m/s and ~2 m", () => {
    const s = at(RigidBodyState.at(Vec3.ZERO), 200, () => ({ massKg: 10, inertia: I, forceWorld: new Vec3(10, 0, 0), torqueBody: Vec3.ZERO }));
    expect(s.velocity.x).toBeCloseTo(2, 9);
    expect(s.position.x).toBeCloseTo(2, 1);
  });

  it("α = τ/I around a principal axis", () => {
    const s = at(RigidBodyState.at(Vec3.ZERO), 100, () => ({ massKg: 10, inertia: I, forceWorld: Vec3.ZERO, torqueBody: new Vec3(0, 0, 30) }));
    expect(s.angularVelocityBody.z).toBeCloseTo(0.1, 9);
  });

  it("torque-free tumbling conserves rotational energy (gyroscopic term)", () => {
    const start = RigidBodyState.at(Vec3.ZERO).withAngularVelocity(new Vec3(0.1, 0.02, 0.05));
    const energy = (w: Vec3) => 0.5 * (I.x * w.x ** 2 + I.y * w.y ** 2 + I.z * w.z ** 2);
    const s = at(start, 10_000, () => ({ massKg: 10, inertia: I, forceWorld: Vec3.ZERO, torqueBody: Vec3.ZERO }), 0.001);
    expect(energy(s.angularVelocityBody) / energy(start.angularVelocityBody)).toBeCloseTo(1, 3);
    expect(s.angularVelocityBody.y).not.toBeCloseTo(0.02, 4); // intermediate-axis coupling really happens
  });

  it("converts body-frame vectors to world frame with its orientation", () => {
    const s = new RigidBodyState(Vec3.ZERO, Vec3.ZERO, Quat.fromAxisAngle(Vec3.Y, Math.PI / 2), Vec3.ZERO);
    const fwd = s.toWorld(new Vec3(0, 0, -1));
    expect(fwd.x).toBeCloseTo(-1, 9);
  });
});
