import { describe, expect, it } from "vitest";
import { extractToCargo, resourceRichness } from "./resources";
import { BENNU } from "../data/bennu";

describe("resources", () => {
  it("richness weighs water and metals more than carbon, capped at 1", () => {
    const water = resourceRichness([{ material: "Water (in hydrated minerals)", massFraction: { value: [0.05, 0.05], source: "" } }]);
    const carbon = resourceRichness([{ material: "Carbon", massFraction: { value: [0.05, 0.05], source: "" } }]);
    expect(water).toBeGreaterThan(carbon);
    expect(resourceRichness([{ material: "Iron-nickel", massFraction: { value: [0.9, 0.9], source: "" } }])).toBe(1);
  });

  it("Bennu is moderately rich", () => {
    const r = resourceRichness(BENNU.composition);
    expect(r).toBeGreaterThan(0.3);
    expect(r).toBeLessThan(0.8);
  });

  it("fills the cargo in proportion to the real composition", () => {
    const load = extractToCargo(BENNU.composition, 500);
    const total = load.reduce((s, l) => s + l.kg, 0);
    expect(total).toBeCloseTo(500, 6);
    const water = load.find((l) => l.material.startsWith("Water"))!.kg;
    const carbon = load.find((l) => l.material === "Carbon")!.kg;
    expect(water / carbon).toBeCloseTo(0.036 / 0.046, 6);
  });

  it("the hold is mostly rock: iron, nickel and silicates come with the water and carbon", () => {
    const load = extractToCargo(BENNU.composition, 500);
    const kg = (m: string) => load.find((l) => l.material.startsWith(m))!.kg;
    expect(kg("Silicates")).toBeGreaterThan(kg("Iron"));
    expect(kg("Iron") / kg("Nickel")).toBeCloseTo(0.1828 / 0.01065, 1);
  });

  it("bulk rock does not make an asteroid richer (Bennu's duel stays as hard as before)", () => {
    const resources = BENNU.composition.filter((e) => e.material === "Carbon" || e.material.startsWith("Water"));
    expect(resourceRichness(BENNU.composition)).toBeCloseTo(resourceRichness(resources), 9);
  });
});
