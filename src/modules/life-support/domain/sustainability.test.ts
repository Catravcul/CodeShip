import { describe, expect, it } from "vitest";
import { CREW_ENERGY, selfSufficiency } from "./sustainability";

describe("self-sufficiency", () => {
  it("NASA's equation gives about 2,280 kcal for a 30-year-old woman of 58 kg and 1.60 m who exercises", () => {
    expect(Math.round(CREW_ENERGY.value(30, 58, 1.6))).toBe(2277);
  });

  it("one person alone needs 45 m²; animals add area in proportion to their energy", () => {
    const crew = 2277;
    expect(selfSufficiency(45, [{ name: "D", kcal: crew }], crew).ratio).toBeCloseTo(1);
    const withHens = selfSufficiency(45, [{ name: "D", kcal: crew }, { name: "gallinas", kcal: crew / 2 }], crew);
    expect(withHens.neededM2).toBeCloseTo(67.5);
    expect(withHens.ratio).toBeLessThan(1);
  });
});
