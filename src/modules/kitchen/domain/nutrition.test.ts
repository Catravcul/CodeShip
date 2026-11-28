import { describe, expect, it } from "vitest";
import { dayMenu, nutrientsOf } from "./nutrition";

const TABLE: Record<string, { kcal: number; proteinG: number; fatG: number; carbsG: number; fiberG: number }> = {
  a: { kcal: 100, proteinG: 10, fatG: 1, carbsG: 5, fiberG: 1 },
  b: { kcal: 500, proteinG: 20, fatG: 40, carbsG: 10, fiberG: 5 },
};

describe("nutrition", () => {
  it("adds foods by weight from a per-100 g table", () => {
    const n = nutrientsOf({ a: 50, b: 20 }, (f) => TABLE[f]);
    expect(n.kcal).toBeCloseTo(150);
    expect(n.proteinG).toBeCloseTo(9);
  });

  it("refuses foods it knows nothing about", () => {
    expect(() => nutrientsOf({ c: 10 }, (f) => TABLE[f])).toThrow();
  });

  it("builds a day's menu from distinct dishes, richest first", () => {
    const m = dayMenu([300, 700, 500, 200], (k) => k, 1400);
    expect(m.dishes).toEqual([700, 500, 300]);
    expect(m.kcal).toBe(1500);
    expect(dayMenu([100], (k) => k, 1400).kcal).toBe(100);
  });
});
