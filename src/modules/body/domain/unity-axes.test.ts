import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { fromUnityEuler, fromUnityPoint } from "./unity-axes";

const close = (v: Vec3, x: number, y: number, z: number) => {
  expect(v.x).toBeCloseTo(x, 6);
  expect(v.y).toBeCloseTo(y, 6);
  expect(v.z).toBeCloseTo(z, 6);
};

// Unity: left-handed, X right, Y up, Z forward. Codeship's figure: right-handed, Y up, faces +Z, so its
// left is +X. The change of basis is the mirror x → −x (both have Y up and Z forward).
describe("Unity → Three axes (docs/design/esqueleto.md, «Ejes»)", () => {
  it("a point keeps height and depth and mirrors left/right", () => {
    close(fromUnityPoint([-0.17, 0.03, 0.22]), 0.17, 0.03, 0.22);
  });

  it("X+ still flexes forward: the spine's up turns to forward", () => {
    close(fromUnityEuler([90, 0, 0]).rotate(Vec3.Y), 0, 0, 1);
  });

  it("Y+ (in Unity, forward turns to its right) turns forward to the figure's right, −X here", () => {
    close(fromUnityEuler([0, 90, 0]).rotate(Vec3.Z), -1, 0, 0);
  });

  it("Z+ (in Unity, up tips to its left) tips up to the figure's left, +X here", () => {
    close(fromUnityEuler([0, 0, 90]).rotate(Vec3.Y), 1, 0, 0);
  });

  it("keeps Unity's Euler order (Z, then X, then Y)", () => {
    // Unity: Euler(90, 90, 0) · up = X turns up to forward, then Y turns forward to the right (+X in Unity).
    close(fromUnityEuler([90, 90, 0]).rotate(Vec3.Y), -1, 0, 0);
    // Euler(90, 0, 90) · up: Z first tips up to the left, then X leaves that axis alone.
    close(fromUnityEuler([90, 0, 90]).rotate(Vec3.Y), 1, 0, 0);
  });
});
