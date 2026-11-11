import { describe, expect, it } from "vitest";
import { Quat } from "./quat";
import { Vec3 } from "./vec3";

const close = (a: Vec3, b: Vec3) => {
  expect(a.x).toBeCloseTo(b.x, 9);
  expect(a.y).toBeCloseTo(b.y, 9);
  expect(a.z).toBeCloseTo(b.z, 9);
};

describe("Quat", () => {
  it("identity leaves vectors unchanged", () => {
    close(Quat.IDENTITY.rotate(new Vec3(1, 2, 3)), new Vec3(1, 2, 3));
  });

  it("rotates 90 degrees around Y: +X goes to -Z (right-handed)", () => {
    const q = Quat.fromAxisAngle(Vec3.Y, Math.PI / 2);
    close(q.rotate(Vec3.X), new Vec3(0, 0, -1));
  });

  it("composes rotations: multiply applies the right-hand one first", () => {
    const yaw = Quat.fromAxisAngle(Vec3.Y, Math.PI / 2);
    const pitch = Quat.fromAxisAngle(Vec3.X, Math.PI / 2);
    close(yaw.multiply(pitch).rotate(Vec3.Z), yaw.rotate(pitch.rotate(Vec3.Z)));
  });

  it("integrates angular velocity: 1 rad/s around Z for 1 s turns by 1 rad", () => {
    let q = Quat.IDENTITY;
    for (let i = 0; i < 1000; i++) q = q.integrate(new Vec3(0, 0, 1), 0.001);
    close(q.rotate(Vec3.X), new Vec3(Math.cos(1), Math.sin(1), 0));
  });

  it("stays normalized after many integration steps", () => {
    let q = Quat.IDENTITY;
    for (let i = 0; i < 10000; i++) q = q.integrate(new Vec3(0.3, -1.2, 2), 0.01);
    expect(Math.hypot(q.w, q.x, q.y, q.z)).toBeCloseTo(1, 12);
  });
});
