import { describe, expect, it } from "vitest";
import { canHunt, effectivePower, fears, predatorPower } from "@modules/fauna/domain/predation";
import { SPECIES_MODEL } from "./site";
import { NAMES, TRAITS } from "./rasgos";

const T = (s: string) => TRAITS[s]!;
const can = (h: string, p: string, scale = 1, inWater = false, allies = 0) => canHunt(T(h), effectivePower(T(h), 1, Array.from({ length: allies }, () => ({ traits: T(h), scale: 1 }))), p, T(p), scale, inWater ? "agua" : "tierra", h);

describe("sanctuary 1's food chain, by stats", () => {
  it("has traits and a name for every species, with a source", () => {
    for (const s of Object.keys(SPECIES_MODEL)) {
      expect(TRAITS[s], s).toBeDefined();
      expect(TRAITS[s]!.source.length).toBeGreaterThan(10);
      expect(NAMES[s], s).toBeDefined();
    }
  });

  it("gives the real relations", () => {
    expect(can("Wolf", "ArcticHare")).toBe(true);
    expect(can("Wolf", "MuskOx")).toBe(false);
    expect(can("Wolf", "MuskOx", 1, false, 2)).toBe(true);
    expect(can("Wolf", "Reindeer")).toBe(true);
    expect(can("Bear", "Seal", 1, true)).toBe(true);
    expect(can("Bear", "Walrus", 0.5, true)).toBe(true);
    expect(can("Orca", "Seal", 1, true)).toBe(true);
    expect(can("Orca", "Penguin", 1, true)).toBe(true);
    expect(can("Orca", "Penguin", 1, false)).toBe(false);
    expect(can("Orca", "Whale", 1, true, 3)).toBe(false);
    expect(can("ArcticFox", "ArcticHare", 0.3)).toBe(true);
    expect(can("Seal", "Penguin", 1, true)).toBe(false);
    expect(can("Walrus", "Seal", 1, true)).toBe(false);
  });

  it("the timid fear Doménica; the bear, the wolf pack and the orca do not", () => {
    const her = predatorPower(T("Humano"));
    expect(fears(T("ArcticHare"), 1, her)).toBe(true);
    expect(fears(T("Reindeer"), 1, her)).toBe(false); // ours: by stats a reindeer stands; the fox, curious, too (arctic foxes come close to people)
    expect(fears(T("Bear"), 1, her)).toBe(false);
    expect(fears(T("Orca"), 1, her)).toBe(false);
  });
});
