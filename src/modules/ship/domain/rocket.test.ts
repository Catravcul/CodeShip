import { describe, expect, it } from "vitest";
import { deltaV, massFlow } from "./rocket";

describe("rocket equation", () => {
  it("Tsiolkovsky: Isp 312 s from 1000 kg to 500 kg gives Isp*g0*ln 2", () => {
    expect(deltaV(312, 1000, 500)).toBeCloseTo(312 * 9.80665 * Math.LN2, 6);
  });

  it("no propellant means no delta-v", () => {
    expect(deltaV(312, 800, 800)).toBe(0);
  });

  it("mass flow = thrust / (Isp * g0)", () => {
    expect(massFlow(490, 312)).toBeCloseTo(490 / (312 * 9.80665), 9);
  });

  it("rejects impossible masses", () => {
    expect(() => deltaV(300, 100, 200)).toThrow();
    expect(() => deltaV(300, 100, 0)).toThrow();
  });
});
