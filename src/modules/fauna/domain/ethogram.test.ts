import { describe, expect, it } from "vitest";
import { actAt, type SpeciesEthogram } from "./ethogram";

const E: SpeciesEthogram = {
  acts: [
    { verb: "descansa", mode: "quieto", weight: 0.6, seconds: 90, source: "x" },
    { verb: "pasea", mode: "pasear", weight: 0.4, seconds: 20, source: "x" },
  ],
  young: { verb: "sigue a su madre", mode: "seguir", weight: 1, seconds: 60, source: "x" },
};

describe("what an animal does", () => {
  it("draws its species' activities by weight, the same on every load, each for its time", () => {
    const seen = new Set<string>();
    for (let t = 0; t < 2000; t += 5) seen.add(actAt(E, 7, t, "adulto").verb);
    expect(seen).toEqual(new Set(["descansa", "pasea"]));
    expect(actAt(E, 7, 300, "adulto")).toBe(actAt(E, 7, 300, "adulto"));
    expect(actAt(E, 7, 30, "adulto")).toBe(actAt(E, 7, 31, "adulto"));
  });

  it("has its young keep to their mother", () => {
    expect(actAt(E, 7, 0, "cria").mode).toBe("seguir");
  });
});
