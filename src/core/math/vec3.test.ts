import { describe, expect, it } from "vitest";
import { Vec3 } from "./vec3";

describe("Vec3", () => {
  it("adds, subtracts and scales without mutating", () => {
    const a = new Vec3(1, 2, 3);
    const b = new Vec3(4, 5, 6);
    expect(a.add(b)).toEqual(new Vec3(5, 7, 9));
    expect(b.sub(a)).toEqual(new Vec3(3, 3, 3));
    expect(a.scale(2)).toEqual(new Vec3(2, 4, 6));
    expect(a).toEqual(new Vec3(1, 2, 3));
  });

  it("computes dot, cross and length", () => {
    expect(Vec3.X.dot(Vec3.Y)).toBe(0);
    expect(Vec3.X.cross(Vec3.Y)).toEqual(Vec3.Z);
    expect(new Vec3(3, 4, 0).length()).toBe(5);
  });

  it("normalizes, keeping zero as zero", () => {
    expect(new Vec3(0, 0, 9).normalize()).toEqual(Vec3.Z);
    expect(Vec3.ZERO.normalize()).toEqual(Vec3.ZERO);
  });
});
