import { describe, expect, it } from "vitest";
import { LIFE_CYCLES } from "./ciclos-de-vida";
import { SPECIES_MODEL } from "./site";

describe("the life cycles of sanctuary 1's species", () => {
  it("has one, with a source, for every species that lives there", () => {
    for (const s of Object.keys(SPECIES_MODEL)) {
      const c = LIFE_CYCLES[s];
      expect(c, s).toBeDefined();
      expect(c!.source.length, s).toBeGreaterThan(20);
      expect(c!.birthSize, s).toBeGreaterThan(0.05);
      expect(c!.birthSize, s).toBeLessThan(0.6);
      expect(c!.birthMonth, s).toBeGreaterThanOrEqual(1);
      expect(c!.birthMonth, s).toBeLessThanOrEqual(12);
      expect(c!.intervalMonths, s).toBeGreaterThanOrEqual(c!.gestationMonths);
    }
  });
});
