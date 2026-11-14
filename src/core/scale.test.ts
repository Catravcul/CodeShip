import { describe, expect, it } from "vitest";
import { MACHINE_SCALE, WORLD_SCALE, drawnSpacing, toReal, toWorld } from "./scale";
import { INTERACTABLE_SPACING } from "./spacing";

describe("ESC-01 one scale for interiors and machinery", () => {
  it("draws bigger than real, but not so big that a desk reaches her chest", () => {
    expect(WORLD_SCALE).toBeGreaterThanOrEqual(1);
    // A 0,75 m desk (real seated work surface) under 2× would be 1,5 m: chest height of a 1,65 m woman.
    expect(0.75 * WORLD_SCALE).toBeLessThan(1.2);
    expect(MACHINE_SCALE).toBe(WORLD_SCALE);
  });

  it("converts both ways and never shrinks the 2 m rule", () => {
    expect(toReal(toWorld(3.2))).toBeCloseTo(3.2, 9);
    expect(drawnSpacing(INTERACTABLE_SPACING.minM)).toBeGreaterThanOrEqual(INTERACTABLE_SPACING.minM);
  });
});
