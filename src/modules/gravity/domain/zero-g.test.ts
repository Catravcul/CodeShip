import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { FLOAT_TUNING, floatStep } from "./zero-g";

const open = () => true;
const at = (x: number, y: number, z: number) => ({ position: new Vec3(x, y, z), velocity: Vec3.ZERO });

describe("floatStep", () => {
  it("pushing from the rails speeds her up, never past the top drift speed", () => {
    let s = at(0, 0, 0);
    for (let i = 0; i < 600; i++) s = floatStep(s, new Vec3(0, 0, -FLOAT_TUNING.push), Vec3.ZERO, 1 / 60, open);
    expect(s.velocity.length()).toBeCloseTo(FLOAT_TUNING.maxSpeed, 6);
    expect(s.position.z).toBeLessThan(-5);
  });

  it("letting go, the drift fades by the damping rate", () => {
    const s = floatStep({ position: Vec3.ZERO, velocity: new Vec3(1, 0, 0) }, Vec3.ZERO, Vec3.ZERO, 1, open);
    expect(s.velocity.x).toBeCloseTo(Math.exp(-FLOAT_TUNING.damping), 6);
  });

  it("does not damp while she is pushing", () => {
    const s = floatStep({ position: Vec3.ZERO, velocity: new Vec3(1, 0, 0) }, new Vec3(0.1, 0, 0), Vec3.ZERO, 1, open);
    expect(s.velocity.x).toBeCloseTo(1.1, 6);
  });

  it("an outside acceleration (the hub's spin) adds to the push", () => {
    const s = floatStep(at(0, 0, 0), new Vec3(0.5, 0, 0), new Vec3(0, -0.2, 0), 1, open);
    expect(s.velocity.y).toBeCloseTo(-0.2, 6);
  });

  it("bounces gently back off a wall by default", () => {
    const wall = (p: Vec3) => p.x < 1;
    const s = floatStep({ position: new Vec3(0.99, 0, 0), velocity: new Vec3(1, 0, 0) }, new Vec3(0.1, 0, 0), Vec3.ZERO, 0.1, wall);
    expect(s.position.x).toBe(0.99);
    expect(s.velocity.x).toBeLessThan(0);
  });

  it("can slide along a wall instead, keeping the motion that fits", () => {
    const wall = (p: Vec3) => p.x < 1;
    const s = floatStep({ position: new Vec3(0.99, 0, 0), velocity: new Vec3(1, 0, -1) }, new Vec3(0.1, 0, -0.1), Vec3.ZERO, 0.1, wall, { collide: "slide" });
    expect(s.position.x).toBe(0.99);
    expect(s.position.z).toBeLessThan(0);
    expect(s.velocity.x).toBe(0);
    expect(s.velocity.z).toBeLessThan(0);
  });
});
