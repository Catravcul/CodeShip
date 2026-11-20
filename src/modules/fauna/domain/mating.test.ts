import { describe, expect, it } from "vitest";
import { inEstrus, matingMonth, sexOf } from "./mating";
import type { LifeCycle } from "./life-cycle";

const BEAR: LifeCycle = { childDays: 180, teenDays: 900, adultDays: 7300, gestationMonths: 8, intervalMonths: 36, birthSize: 0.13, birthMonth: 12 };
const SEAL: LifeCycle = { childDays: 45, teenDays: 365, adultDays: 6000, gestationMonths: 10.5, intervalMonths: 12, birthSize: 0.5, birthMonth: 10 };

describe("estrus by the real calendar", () => {
  it("mates a gestation before its births", () => {
    expect(matingMonth(BEAR)).toBe(4); // April–May for December births (delayed implantation)
    expect(matingMonth(SEAL)).toBe(11); // Weddell seals mate in the austral early summer, after pupping
  });

  it("only adults, only in the season", () => {
    // Game day 0 is 1 April (year day 90).
    expect(inEstrus(5, BEAR, 90, "adulto")).toBe(true);
    expect(inEstrus(5, BEAR, 90, "joven")).toBe(false);
    expect(inEstrus(60, BEAR, 90, "adulto")).toBe(false);
  });

  it("gives each one a fixed sex, both kinds about as often", () => {
    expect(sexOf(5)).toBe(sexOf(5));
    const f = Array.from({ length: 200 }, (_, i) => sexOf(i)).filter((s) => s === "hembra").length;
    expect(f).toBeGreaterThan(70);
    expect(f).toBeLessThan(130);
  });
});
