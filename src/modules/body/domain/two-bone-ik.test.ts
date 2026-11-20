import { describe, expect, it } from "vitest";
import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import { twoBoneIk } from "./two-bone-ik";

// An arm hanging straight down from the origin: upper arm 0,3 m, forearm 0,28 m.
const a = Vec3.ZERO;
const b = new Vec3(0, -0.3, 0);
const c = new Vec3(0, -0.58, 0);
const solve = (target: Vec3, pole: Vec3, weight = 1) => twoBoneIk({ a, b, c, rootWorld: Quat.IDENTITY, midWorld: Quat.IDENTITY, target, pole, weight });
// Where the chain ends after the solve, rotating the rest offsets by the new world rotations.
const ends = (r: ReturnType<typeof solve>) => {
  const elbow = a.add(r.rootWorld.rotate(b.sub(a)));
  return { elbow, hand: elbow.add(r.midWorld.rotate(c.sub(b))) };
};

describe("Two-bone IK (Cold Sanctuary's TwoBoneIK, law of cosines)", () => {
  it("puts the hand on a target within reach, bending the elbow toward the pole", () => {
    const target = new Vec3(0, -0.3, 0.3);
    const { elbow, hand } = ends(solve(target, new Vec3(1, -0.3, 0)));
    expect(hand.sub(target).length()).toBeLessThan(1e-4);
    expect(elbow.length()).toBeCloseTo(0.3, 6);
    expect(hand.sub(elbow).length()).toBeCloseTo(0.28, 6);
    expect(elbow.x).toBeGreaterThan(0.05); // toward the pole (+X)
  });

  it("stretches straight toward a target out of reach", () => {
    const { hand } = ends(solve(new Vec3(0, 0, 2), new Vec3(1, 0, 0)));
    expect(hand.z).toBeCloseTo(0.58, 2);
    expect(Math.abs(hand.y)).toBeLessThan(0.01);
  });

  it("weight 0 leaves the arm as it was; ½ goes part of the way", () => {
    const target = new Vec3(0, -0.2, 0.35);
    expect(ends(solve(target, new Vec3(1, 0, 0), 0)).hand.sub(c).length()).toBeLessThan(1e-9);
    const half = ends(solve(target, new Vec3(1, 0, 0), 0.5)).hand;
    expect(half.sub(target).length()).toBeGreaterThan(0.01);
    expect(half.sub(target).length()).toBeLessThan(c.sub(target).length());
  });
});
