import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { generateRockField, type FieldParams } from "./asteroid-field";

const params: FieldParams = {
  seed: 7,
  count: 300,
  radiusM: 10_000,
  minDiameterM: 5,
  maxDiameterM: 150,
  slope: 2.5,
  clustered: 0.3,
  clusterCentres: [new Vec3(4000, 0, 0)],
  clusterShellM: [1200, 4000],
  keepClear: [{ centre: Vec3.ZERO, radiusM: 800 }],
};

describe("procedural rock field", () => {
  const rocks = generateRockField(params);

  it("is deterministic", () => {
    expect(generateRockField(params)).toEqual(rocks);
  });

  it("fills the requested count inside the sphere and outside the clear zones", () => {
    expect(rocks).toHaveLength(300);
    for (const r of rocks) {
      expect(r.position.length() + r.radiusM).toBeLessThanOrEqual(10_000);
      expect(r.position.length()).toBeGreaterThan(800);
    }
  });

  it("has many small rocks and few big ones (power law)", () => {
    const small = rocks.filter((r) => r.radiusM * 2 < 15).length;
    const big = rocks.filter((r) => r.radiusM * 2 > 60).length;
    expect(small).toBeGreaterThan(big * 5);
    for (const r of rocks) expect(r.radiusM * 2).toBeLessThanOrEqual(150);
  });

  it("is mostly dark carbonaceous rock", () => {
    const dark = rocks.filter((r) => r.spectralType !== "S").length;
    expect(dark / rocks.length).toBeGreaterThan(0.8);
  });
});
