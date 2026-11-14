import { describe, expect, it } from "vitest";
import { CREW_ENERGY } from "@modules/life-support/domain/sustainability";
import { SPECIES } from "@modules/garden/data/species";
import { dayMenu } from "../domain/nutrition";
import { ITEMS } from "./items";
import { FOODS, portionNutrients } from "./nutrition";
import { PROCESSES } from "./processes";
import { RECIPES } from "./recipes";
import { LAUNCH_STOCK } from "./stores";

const CREW_KCAL = CREW_ENERGY.value(30, 58, 1.6);
const kcal = (id: string) => portionNutrients(RECIPES.find((r) => r.id === id)!).kcal;

describe("recipes and their nutrition", () => {
  it("every portion is made of foods with USDA data and every ingredient is a larder item", () => {
    const items = new Set(ITEMS.map((i) => i.id));
    for (const r of RECIPES) {
      for (const k of Object.keys(r.ingredients)) expect(items.has(k), `${r.id}: ${k}`).toBe(true);
      const n = portionNutrients(r);
      expect(n.kcal, r.id).toBeGreaterThan(100);
      expect(n.kcal, r.id).toBeLessThan(900);
    }
    for (const p of PROCESSES) for (const k of [...Object.keys(p.inputs), ...Object.keys(p.outputs)]) expect(items.has(k), `${p.id}: ${k}`).toBe(true);
    for (const f of Object.values(FOODS)) expect(f.source).toMatch(/^https:\/\/fdc\.nal\.usda\.gov\//);
    for (const s of SPECIES.filter((s) => !s.forCats)) expect(items.has(s.id), s.id).toBe(true);
  });

  it("peanuts are energy-dense, fruit is light: 50 g of roasted peanuts ≈ 290 kcal, a fruit bowl ≈ 200", () => {
    expect(kcal("cacahuetes-tostados")).toBeCloseTo(292.5, 0);
    expect(kcal("bol-fruta")).toBeGreaterThan(150);
    expect(kcal("bol-fruta")).toBeLessThan(250);
  });

  it("the new produce has its own dishes: nuts, fruit, a dessert and a full breakfast", () => {
    const uses = (item: string) => RECIPES.filter((r) => item in r.ingredients).map((r) => r.id);
    expect(uses("cacahuete-georgia-red").length).toBeGreaterThanOrEqual(3);
    expect(uses("fresa-seascape").length).toBeGreaterThanOrEqual(2);
    expect(uses("higo").length).toBeGreaterThanOrEqual(2);
    expect(RECIPES.some((r) => r.meal === "postre")).toBe(true);
    expect(RECIPES.filter((r) => r.meal === "desayuno").length).toBeGreaterThanOrEqual(2);
  });

  it("from the launch stock alone, a varied day of distinct dishes covers the crew's energy", () => {
    const has = (r: (typeof RECIPES)[number]) => Object.entries(r.ingredients).every(([k, n]) => (LAUNCH_STOCK[k] ?? 0) >= n);
    const cookable = RECIPES.filter(has);
    expect(cookable.length).toBeGreaterThanOrEqual(5);
    const day = dayMenu(cookable, (r) => portionNutrients(r).kcal, CREW_KCAL);
    expect(day.kcal).toBeGreaterThanOrEqual(CREW_KCAL);
    expect(new Set(day.dishes.map((r) => r.meal)).size).toBeGreaterThanOrEqual(2);
    expect(cookable.some((r) => r.meal === "desayuno")).toBe(true);
  });
});
