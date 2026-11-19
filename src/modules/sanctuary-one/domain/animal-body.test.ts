import { describe, expect, it } from "vitest";
import { MODELS } from "../data/catalog";
import { bodyPlan, gaitHz, jointAngle } from "./animal-body";

describe("animal bodies of jointed cubes", () => {
  const animals = MODELS.filter((m) => m.category === "animal");

  it("every animal model has a body plan with a trunk and moving joints", () => {
    expect(animals.length).toBeGreaterThan(0);
    for (const a of animals) {
      const plan = bodyPlan(a.shape, a.id);
      expect(plan, a.id).toBeDefined();
      expect(plan!.length, a.id).toBeGreaterThan(3);
      expect(plan!.some((p) => p.swing), a.id).toBe(true);
    }
  });

  it("joints swing fully while moving and only sway at rest", () => {
    const part = bodyPlan("cuadrupedo", "reno")!.find((p) => p.swing)!;
    const hz = gaitHz("cuadrupedo", 2);
    const max = (moving: boolean) => Math.max(...Array.from({ length: 200 }, (_, i) => Math.abs(jointAngle(part, i / 50, hz, moving))));
    expect(max(true)).toBeCloseTo(part.swing!.amp, 1);
    expect(max(false)).toBeLessThan(part.swing!.amp * 0.3);
  });

  it("small animals step faster than big ones; whales beat slowly", () => {
    expect(gaitHz("cuadrupedo", 0.6)).toBeGreaterThan(gaitHz("cuadrupedo", 2.5));
    expect(gaitHz("cetaceo", 8)).toBeLessThan(1);
  });
});
