import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { facing } from "./attitude";

describe("facing", () => {
  it("points the nose (−z) along the direction and keeps +y up", () => {
    for (const d of [new Vec3(1, 0, 0), new Vec3(-3, 2, 5), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(0, 1, 0.001)]) {
      const q = facing(d);
      const nose = q.rotate(new Vec3(0, 0, -1));
      expect(nose.dot(d.normalize())).toBeCloseTo(1, 9);
      if (Math.abs(d.normalize().y) < 0.9) expect(q.rotate(Vec3.Y).y).toBeGreaterThan(0);
    }
  });
});
