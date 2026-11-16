import { describe, expect, it } from "vitest";
import { ECLSS_MACHINES } from "../data/eclss-machines";
import { doseReduction, shelter } from "./radiation-shelter";
import { resupply } from "./resupply";

describe("SV-06 resupply for a crew-year", () => {
  it("four people eat 3,5 t of packaged food a year", () => {
    expect(resupply(4, 365, ECLSS_MACHINES).foodKg).toBeCloseTo(3489, -1);
  });

  it("with 98 % recovery a person loses about 28 kg of water a year; without the loop it would be 1,4 t", () => {
    const r = resupply(1, 365, ECLSS_MACHINES);
    expect(r.waterLossKg).toBeCloseTo(27.7, 0);
    expect(r.waterOpenLoopKg).toBeCloseTo(1387, -1);
  });

  it("gases: the leaks need about 4 kg of O₂ and 15 kg of N₂ per person and year", () => {
    const r = resupply(1, 365, ECLSS_MACHINES);
    expect(r.o2LeakKg).toBeCloseTo(4, 0);
    expect(r.n2LeakKg).toBeCloseTo(15.1, 0);
  });

  it("spares: every failure mode's spare, as many as expected in the time (at least one)", () => {
    const r = resupply(1, 365, ECLSS_MACHINES);
    expect(r.spares.find((s) => s.id === "lecho-zeolita")!.count).toBeGreaterThanOrEqual(1);
    expect(r.spares.length).toBe(ECLSS_MACHINES.flatMap((m) => m.failures).length);
  });
});

describe("SV-07 the water-bag radiation shelter", () => {
  it("RadWorks: about 10 g/cm² of water halves a solar storm's dose; 25,6 g/cm² takes 70 %", () => {
    expect(doseReduction(10.8)).toBeCloseTo(0.5, 2);
    expect(doseReduction(25.6)).toBeCloseTo(0.7, 2);
    expect(doseReduction(0)).toBe(0);
  });

  it("a crew quarter lined to 10,8 g/cm² needs about a tonne of water: the ship's drinking water is the shield", () => {
    const s = shelter(800);
    expect(s.neededKg).toBeGreaterThan(900);
    expect(s.neededKg).toBeLessThan(1400);
    expect(s.ready).toBe(false);
    expect(shelter(1500).ready).toBe(true);
    expect(shelter(1500).reduction).toBeCloseTo(0.5, 1);
  });
});
