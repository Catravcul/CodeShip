import { describe, expect, it } from "vitest";
import { JET, jetInterceptFraction, jetOnTarget } from "./jet";

describe("comet jets (Rosetta outbursts)", () => {
  it("a small target far away catches a tiny share of the cone", () => {
    // 1 km away, 10° half-angle: cone radius 176 m; a 3 m lander gets (3/176)² ≈ 2,9e-4.
    expect(jetInterceptFraction(1000, 3)).toBeCloseTo((3 / (1000 * Math.tan(Math.PI / 18))) ** 2, 8);
    expect(jetInterceptFraction(1, 50)).toBe(1);
  });

  it("dust mass scales with the anger between 60 and 260 kg/s", () => {
    const calm = jetOnTarget(100, 100, 0, JET.minDustSpeedMs);
    const furious = jetOnTarget(100, 100, 1, JET.minDustSpeedMs);
    expect(calm.interceptedKg).toBeCloseTo(60 * JET.durationS, 6);
    expect(furious.interceptedKg).toBeCloseTo(260 * JET.durationS, 6);
  });

  it("dust never flies slower than the 13 m/s Rosetta measured; momentum and energy follow m·v and ½m·v²", () => {
    const h = jetOnTarget(500, 3, 1, 2);
    expect(h.momentumKgMs).toBeCloseTo(h.interceptedKg * 13, 9);
    expect(h.energyJ).toBeCloseTo(0.5 * h.interceptedKg * 169, 9);
  });
});
