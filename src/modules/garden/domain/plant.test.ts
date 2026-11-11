import { describe, expect, it } from "vitest";
import { CHILE_ESPANOLA, LETTUCE_OUTREDGEOUS } from "../data/species";
import { Plant, PLANT_TUNING } from "./plant";

const LIT = { lit: true };

/** Tick in small steps, watering every `waterEvery` days (0 = never). */
function grow(p: Plant, days: number, waterEvery = 1, env = LIT) {
  const dt = 0.25;
  let sinceWater = 0;
  for (let t = 0; t < days; t += dt) {
    p.tick(dt, env);
    sinceWater += dt;
    if (waterEvery > 0 && sinceWater >= waterEvery) {
      p.waterIt();
      sinceWater = 0;
    }
  }
}

describe("Plant", () => {
  it("a well-kept lettuce is ready at the real Veggie harvest day (33 days)", () => {
    const p = new Plant("l1", LETTUCE_OUTREDGEOUS);
    grow(p, 32);
    expect(p.readyToHarvest).toBe(false);
    grow(p, 1.5);
    expect(p.readyToHarvest).toBe(true);
    expect(p.harvest().portions).toBe(2);
    expect(p.finished).toBe(true);
  });

  it("is new for the first days after planting", () => {
    const p = new Plant("l1", LETTUCE_OUTREDGEOUS);
    expect(p.isNew).toBe(true);
    grow(p, PLANT_TUNING.newForDays + 0.5);
    expect(p.isNew).toBe(false);
  });

  it("without water it dries out, stops growing and dies", () => {
    const p = new Plant("l1", LETTUCE_OUTREDGEOUS);
    grow(p, 10, 0);
    expect(p.alive).toBe(false);
    const dev = p.developmentDays;
    grow(p, 5, 0);
    expect(p.developmentDays).toBe(dev);
  });

  it("does not grow with the lights off", () => {
    const p = new Plant("l1", LETTUCE_OUTREDGEOUS);
    grow(p, 5, 1, { lit: false });
    expect(p.developmentDays).toBe(0);
  });

  it("chile gives two harvests (days 100 and 120) and needs shaking to set fruit", () => {
    const shaken = new Plant("c1", CHILE_ESPANOLA);
    const still = new Plant("c2", CHILE_ESPANOLA);
    shaken.shake();
    for (const p of [shaken, still]) {
      for (let d = 0; d < 101; d++) {
        grow(p, 1);
      }
    }
    expect(shaken.harvest().portions).toBeGreaterThan(0);
    expect(still.harvest().portions).toBe(0);
    expect(shaken.finished).toBe(false);
  });

  it("chile flowers halfway to its first harvest; lettuce never asks to be shaken", () => {
    const c = new Plant("c", CHILE_ESPANOLA);
    grow(c, 49);
    expect(c.flowering).toBe(false);
    grow(c, 2);
    expect(c.flowering).toBe(true);
    const l = new Plant("l", LETTUCE_OUTREDGEOUS);
    grow(l, 30);
    expect(l.flowering).toBe(false);
  });

  it("damage hurts it, tending heals it, and harvesting early throws", () => {
    const p = new Plant("l1", LETTUCE_OUTREDGEOUS);
    p.damage(0.7);
    expect(p.health).toBeCloseTo(0.3);
    p.tend();
    expect(p.health).toBeCloseTo(0.7);
    expect(() => p.harvest()).toThrow();
  });
});
