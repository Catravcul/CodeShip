import { describe, expect, it } from "vitest";
import { ITEMS } from "./items";
import { portionNutrients } from "./nutrition";
import { ISS_FOOD, ISS_LAUNCH_STOCK } from "./iss-food";

describe("ISS-type food for the real ship", () => {
  it("every dish uses packaged larder items and USDA foods, with a sourced list of steps", () => {
    const items = new Set(ITEMS.map((i) => i.id));
    for (const r of ISS_FOOD) {
      for (const k of Object.keys(r.ingredients)) expect(items.has(k), `${r.id}: ${k}`).toBe(true);
      const kcal = portionNutrients(r).kcal;
      expect(kcal, r.id).toBeGreaterThan(200);
      expect(kcal, r.id).toBeLessThan(900);
      expect(r.steps.source).toMatch(/^https:\/\//);
    }
  });

  it("the launch stock cooks every dish (rehydrate and heat; no farm, no coop)", () => {
    for (const r of ISS_FOOD) for (const [k, n] of Object.entries(r.ingredients)) expect(ISS_LAUNCH_STOCK[k] ?? 0, `${r.id}: ${k}`).toBeGreaterThanOrEqual(n);
    expect(ISS_FOOD.map((r) => r.steps.value.join(" ")).join(" ")).toMatch(/dispensador/);
    expect(ISS_FOOD.map((r) => r.steps.value.join(" ")).join(" ")).toMatch(/calentador/);
  });
});
