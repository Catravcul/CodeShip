import { describe, expect, it } from "vitest";
import { MACHINE_SCALE, WORLD_SCALE, drawnSpacing, toReal, toWorld } from "./scale";
import { INTERACTABLE_SPACING } from "./spacing";

describe("HAB-12 one scale for interiors and machinery", () => {
  it("is the measured 1,5×: bigger than real, under the 2× that puts a console's screen out of reach", () => {
    expect(WORLD_SCALE).toBe(1.5);
    expect(MACHINE_SCALE).toBe(WORLD_SCALE);
  });

  it("converts both ways and never shrinks the 2 m rule", () => {
    expect(toReal(toWorld(3.2))).toBeCloseTo(3.2, 9);
    expect(drawnSpacing(INTERACTABLE_SPACING.minM)).toBeGreaterThanOrEqual(INTERACTABLE_SPACING.minM);
  });
});
