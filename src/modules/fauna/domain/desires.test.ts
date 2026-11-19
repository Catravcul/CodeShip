import { describe, expect, it } from "vitest";
import { choose, tickNeeds, type DesireContext } from "./desires";
import type { Traits } from "./predation";

const WOLF: Traits = { massKg: 45, strength: 0.5, armour: 0.1, agility: 0.6, armament: 0.25, packFactor: 0.8, diet: "carnivoro", medium: "tierra", runMs: 16, senseM: 50, huntSuccess: 0.15, hungerPerDay: 0.4, rangeM: 200 };
const HARE: Traits = { ...WOLF, massKg: 4.5, armament: 0, packFactor: 0, diet: "herbivoro", runMs: 18, hungerPerDay: 2 };
const ctx = (o: Partial<DesireContext>): DesireContext => ({ needs: { hunger: 0, fatigue: 0 }, traits: WOLF, threatened: false, young: false, motherFar: 0, homeFar: 0, ...o });

describe("what an animal wants", () => {
  it("keeps to its habits when fed and rested, hunts when hungry, rests when spent", () => {
    expect(choose(ctx({})).desire).toBe("habito");
    expect(choose(ctx({ needs: { hunger: 0.6, fatigue: 0 } })).desire).toBe("cazar");
    expect(choose(ctx({ needs: { hunger: 0.6, fatigue: 0.9 } })).desire).toBe("descansar");
    expect(choose(ctx({ traits: HARE, needs: { hunger: 0.6, fatigue: 0 } })).desire).toBe("comer");
  });

  it("flees a threat before anything, unless it has no strength left", () => {
    expect(choose(ctx({ threatened: true, needs: { hunger: 1, fatigue: 0.5 } })).desire).toBe("huir");
    expect(choose(ctx({ threatened: true, needs: { hunger: 0, fatigue: 1 } })).desire).toBe("descansar");
  });

  it("a young one keeps to its mother; far from home it goes back", () => {
    expect(choose(ctx({ young: true, needs: { hunger: 0.9, fatigue: 0 } })).desire).toBe("seguir");
    expect(choose(ctx({ homeFar: 0.8 })).desire).toBe("habito");
    expect(choose(ctx({ homeFar: 3 })).desire).toBe("volver");
  });

  it("gets hungry by the day, eats it away, tires in a sprint and rests it off", () => {
    let n = { hunger: 0, fatigue: 0 };
    n = tickNeeds(n, 0, 1, "habito", WOLF);
    expect(n.hunger).toBeCloseTo(0.4);
    n = tickNeeds(n, 0, 0.2, "devorar", WOLF);
    expect(n.hunger).toBeLessThan(0.4);
    n = tickNeeds(n, 30, 0, "cazar", WOLF);
    expect(n.fatigue).toBeCloseTo(0.5);
    n = tickNeeds(n, 60, 0, "descansar", WOLF);
    expect(n.fatigue).toBeCloseTo(0);
  });
});
