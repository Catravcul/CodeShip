import { describe, expect, it } from "vitest";
import { canHunt, effectivePower, fears, predatorPower, type Traits } from "./predation";

const base = { armour: 0.1, agility: 0.5, senseM: 40, huntSuccess: 0.2, hungerPerDay: 0.5, rangeM: 100 };
const WOLF: Traits = { ...base, massKg: 45, strength: 0.5, armament: 0.25, packFactor: 0.8, diet: "carnivoro", medium: "tierra", runMs: 16 };
const MUSKOX: Traits = { ...base, massKg: 300, strength: 0.9, armour: 0.8, armament: 0.3, packFactor: 0, diet: "herbivoro", medium: "tierra", runMs: 11 };
const HARE: Traits = { ...base, massKg: 4.5, strength: 0.1, armament: 0, packFactor: 0, diet: "herbivoro", medium: "tierra", runMs: 18 };
const ORCA: Traits = { ...base, massKg: 4000, strength: 1, armament: 0.5, packFactor: 0.8, diet: "carnivoro", medium: "agua", runMs: 15 };

describe("who hunts whom, by stats", () => {
  it("a lone wolf takes a hare but not a musk ox; a pack takes the musk ox", () => {
    const lone = predatorPower(WOLF);
    expect(canHunt(WOLF, lone, "ArcticHare", HARE, 1, "tierra")).toBe(true);
    expect(canHunt(WOLF, lone, "MuskOx", MUSKOX, 1, "tierra")).toBe(false);
    const pack = effectivePower(WOLF, 1, [{ traits: WOLF, scale: 1 }, { traits: WOLF, scale: 1 }]);
    expect(canHunt(WOLF, pack, "MuskOx", MUSKOX, 1, "tierra")).toBe(true);
  });

  it("hunts only in its medium, never its own kind, and herbivores never hunt", () => {
    expect(canHunt(ORCA, predatorPower(ORCA), "ArcticHare", HARE, 1, "tierra")).toBe(false);
    expect(canHunt(WOLF, 99, "Wolf", WOLF, 1, "tierra", "Wolf")).toBe(false);
    expect(canHunt(MUSKOX, 99, "ArcticHare", HARE, 1, "tierra")).toBe(false);
  });

  it("the hare fears the wolf; the orca fears no wolf", () => {
    expect(fears(HARE, 1, predatorPower(WOLF))).toBe(true);
    expect(fears(ORCA, 1, predatorPower(WOLF))).toBe(false);
  });

  it("a young one is weaker and easier prey", () => {
    expect(predatorPower(WOLF, 0.3)).toBeLessThan(predatorPower(WOLF));
    expect(canHunt(WOLF, predatorPower(WOLF), "MuskOx", MUSKOX, 0.4, "tierra")).toBe(true);
  });
});
