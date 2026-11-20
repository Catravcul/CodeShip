import { describe, expect, it } from "vitest";
import { continuousBurnDistance, planContinuousBurn, planTransfer, turnTimeS } from "./transfer";

describe("planTransfer", () => {
  it("burn, coast and brake add up to the distance, and the time is d/v + v/a", () => {
    const p = planTransfer({ distanceM: 9000, accelMS2: 0.72, deltaVAvailableMS: 930 });
    expect(p.cruiseMS).toBe(25);
    expect(p.burnS).toBeCloseTo(25 / 0.72, 9);
    expect(2 * p.burnDistanceM + p.coastDistanceM).toBeCloseTo(9000, 6);
    expect(p.totalS).toBeCloseTo(9000 / 25 + 25 / 0.72, 6);
    expect(p.deltaVMS).toBe(50);
    expect(p.feasible).toBe(true);
  });

  it("short hops cruise slower: they must reach cruise and stop again", () => {
    const p = planTransfer({ distanceM: 400, accelMS2: 0.72, deltaVAvailableMS: 930 });
    expect(p.cruiseMS).toBe(Math.floor(Math.sqrt(0.72 * 400)));
    expect(p.coastDistanceM).toBeGreaterThanOrEqual(0);
  });

  it("the Δv budget caps the cruise speed, and an empty engine can't plan", () => {
    expect(planTransfer({ distanceM: 9000, accelMS2: 0.72, deltaVAvailableMS: 40 }).cruiseMS).toBe(10);
    expect(planTransfer({ distanceM: 9000, accelMS2: 0.72, deltaVAvailableMS: 0 }).feasible).toBe(false);
  });
});

describe("turnTimeS", () => {
  it("is 2√(θ/α) without a rate cap and θ/ω + ω/α with one", () => {
    expect(turnTimeS(Math.PI, 0.01, 10)).toBeCloseTo(2 * Math.sqrt(Math.PI / 0.01), 9);
    expect(turnTimeS(Math.PI, 0.1, 0.15)).toBeCloseTo(Math.PI / 0.15 + 0.15 / 0.1, 9);
  });
});

describe("planContinuousBurn", () => {
  it("accelerates half way and brakes the other half: t = 2√(d/a), Δv = 2√(d·a)", () => {
    const p = planContinuousBurn(9000, 6.5e-5);
    expect(p.totalS).toBeCloseTo(2 * Math.sqrt(9000 / 6.5e-5), 6);
    expect(p.deltaVMS).toBeCloseTo(2 * Math.sqrt(9000 * 6.5e-5), 9);
    expect(continuousBurnDistance(p, p.totalS / 2)).toBeCloseTo(4500, 6);
    expect(continuousBurnDistance(p, p.totalS)).toBe(9000);
  });
});

describe("NAV-09 a chemical mothership's hop: burn to the cruise speed, coast, brake", () => {
  it("caps the speed at the cruise: Δv 2·v, time 2·v/a + (d − v²/a)/v, and the distance runs continuously to the end", () => {
    const a = 4.7;
    const v = 500;
    const d = 10_000_000;
    const p = planContinuousBurn(d, a, v);
    expect(p.peakMS).toBe(v);
    expect(p.deltaVMS).toBe(2 * v);
    expect(p.coastS).toBeCloseTo((d - (v * v) / a) / v, 6);
    expect(p.totalS).toBeCloseTo((2 * v) / a + p.coastS!, 6);
    expect(continuousBurnDistance(p, v / a)).toBeCloseTo((v * v) / (2 * a), 3);
    expect(continuousBurnDistance(p, p.totalS / 2)).toBeCloseTo(d / 2, 3);
    expect(continuousBurnDistance(p, p.totalS)).toBe(d);
  });

  it("a short hop never reaches the cruise and pushes all the way, like the electric ship", () => {
    expect(planContinuousBurn(1000, 4.7, 500)).toEqual(planContinuousBurn(1000, 4.7));
    expect(planContinuousBurn(1000, 4.7, 500).coastS).toBeUndefined();
  });
});
