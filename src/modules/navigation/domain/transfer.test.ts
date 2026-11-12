import { describe, expect, it } from "vitest";
import { planTransfer, turnTimeS } from "./transfer";

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
