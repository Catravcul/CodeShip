import { describe, expect, it } from "vitest";
import { Plant } from "../domain/plant";
import { FIG_TREE, PEANUT_GEORGIA_RED, SPECIES, STRAWBERRY_SEASCAPE } from "./species";

/** A drip-watered bed grown in small steps, shaken when it flowers. */
function grow(p: Plant, days: number) {
  for (let t = 0; t < days; t += 0.25) {
    p.tick(0.25, { lit: true });
    if (p.flowering) p.shake();
  }
}

describe("crops on board", () => {
  it("every species carries real sources for its numbers", () => {
    for (const s of SPECIES) {
      for (const v of [s.harvestDays, s.needsShaking, s.toxicToCats, s.edibleYield, s.areaPerPlantM2]) if (v) expect(v.source, s.id).toMatch(/^https:\/\//);
      expect([...s.harvestDays.value].sort((a, b) => a - b), s.id).toEqual(s.harvestDays.value);
    }
  });

  it("a 15 m² peanut bed is ready 110 days after planting and gives the measured 588 g/m² of nuts", () => {
    const bed = new Plant("cac", PEANUT_GEORGIA_RED, 15, true);
    grow(bed, 109);
    expect(bed.readyToHarvest).toBe(false);
    grow(bed, 1.5);
    const h = bed.harvest();
    expect(h.portions * PEANUT_GEORGIA_RED.edibleYield!.value.portionG).toBeCloseTo(588 * 15, -2);
    expect(bed.finished).toBe(true);
  });

  it("strawberries fruit from day 65, again and again, once their flowers are shaken", () => {
    const bed = new Plant("fre", STRAWBERRY_SEASCAPE, 15, true);
    const still = new Plant("fre2", STRAWBERRY_SEASCAPE, 15, true);
    grow(bed, 66);
    for (let t = 0; t < 66; t += 0.25) still.tick(0.25, { lit: true });
    expect(still.harvest().portions).toBe(0);
    let grams = 0;
    while (!bed.finished) {
      if (bed.readyToHarvest) grams += bed.harvest().portions * STRAWBERRY_SEASCAPE.edibleYield!.value.portionG;
      else grow(bed, 1);
    }
    expect(STRAWBERRY_SEASCAPE.harvestDays.value).toHaveLength(7);
    // About 1 kg/m² over the season (SARE trial, Seascape's worst year).
    expect(grams / 15).toBeGreaterThan(800);
    expect(grams / 15).toBeLessThan(1200);
  });

  it("a fig tree in its planter fruits after about four months and gives ~6 kg a season", () => {
    const tree = new Plant("hig", FIG_TREE, FIG_TREE.areaPerPlantM2!.value, true);
    expect(tree.isTree).toBe(true);
    expect(tree.isBed).toBe(true);
    grow(tree, 119);
    expect(tree.readyToHarvest).toBe(false);
    let grams = 0;
    while (!tree.finished) {
      if (tree.readyToHarvest) grams += tree.harvest().portions * FIG_TREE.edibleYield!.value.portionG;
      else grow(tree, 1);
    }
    expect(grams).toBeGreaterThan(5500);
    expect(grams).toBeLessThan(7000);
  });
});
