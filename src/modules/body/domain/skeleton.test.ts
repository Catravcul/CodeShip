import { describe, expect, it } from "vitest";
import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import { CUBE_FIGURE, JOINTS, forwardKinematics, lowestPoint, restBody, tipOf } from "./skeleton";

describe("Cube skeleton (Cold Sanctuary's CubeHumanoid hierarchy, Codeship's figure sizes)", () => {
  it("has Cold Sanctuary's 19 posed joints, each after its parent", () => {
    expect(JOINTS).toHaveLength(19);
    const seen = new Set<string>();
    for (const j of CUBE_FIGURE.joints) {
      if (j.parent) expect(seen.has(j.parent)).toBe(true);
      seen.add(j.id);
    }
    expect([...seen].sort()).toEqual([...JOINTS].sort());
  });

  it("standing at rest: pelvis at 0,95 m, soles on the floor, her left on +X", () => {
    const fk = forwardKinematics(CUBE_FIGURE, restBody(CUBE_FIGURE));
    expect(fk.Hips.p.y).toBeCloseTo(0.95, 6);
    expect(lowestPoint(CUBE_FIGURE, fk)).toBeCloseTo(0, 6);
    expect(fk.ShoulderLeft.p.x).toBeCloseTo(0.25, 6);
    expect(fk.ShoulderRight.p.x).toBeCloseTo(-0.25, 6);
    expect(fk.ShoulderLeft.p.y).toBeCloseTo(1.47, 6);
    expect(tipOf(CUBE_FIGURE, fk, "HandLeft").y).toBeCloseTo(1.47 - 0.58, 6);
    expect(fk.FootLeft.p.y).toBeCloseTo(0.03, 6);
  });

  it("turning a joint carries everything that hangs from it", () => {
    const body = restBody(CUBE_FIGURE);
    const bent = { ...body, rot: { ...body.rot, ShoulderLeft: Quat.fromAxisAngle(Vec3.X, -Math.PI / 2) } };
    const fk = forwardKinematics(CUBE_FIGURE, bent);
    // Arm raised forward to horizontal: elbow and hand in front of the shoulder, at its height.
    expect(fk.ForearmLeft.p.z).toBeCloseTo(0.3, 6);
    expect(tipOf(CUBE_FIGURE, fk, "HandLeft").z).toBeCloseTo(0.58, 6);
    expect(tipOf(CUBE_FIGURE, fk, "HandLeft").y).toBeCloseTo(1.47, 6);
  });
});
