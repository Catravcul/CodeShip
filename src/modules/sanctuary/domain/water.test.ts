import { describe, expect, it } from "vitest";
import { boxVolumeM3, oxygenReserveHours, ringPoolVolumeM3, shieldGcm2, sphereVolumeM3, spinRpmForG, waterMassT } from "./water";

describe("water numbers", () => {
  it("one cubic metre of water is one tonne", () => {
    expect(waterMassT(1)).toBe(1);
  });

  it("the whole hangar (20 × 14 × 20 m) would hold 5 600 t", () => {
    expect(waterMassT(boxVolumeM3(20, 14, 20))).toBe(5600);
  });

  it("a 4 m sphere holds 33.5 t; a 6 m one, 113 t", () => {
    expect(sphereVolumeM3(4)).toBeCloseTo(33.51, 2);
    expect(sphereVolumeM3(6)).toBeCloseTo(113.1, 1);
  });

  it("a rotating pool 6 m in radius, 10 m long, with 1 m of water holds about 346 t", () => {
    expect(ringPoolVolumeM3(6, 1, 10)).toBeCloseTo(345.6, 1);
  });

  it("10 cm of water is 10 g/cm² of shield (RadWorks: ~9–21 g/cm² halves a solar storm dose)", () => {
    expect(shieldGcm2(0.1)).toBeCloseTo(10, 6);
  });

  it("0.1 g at 6 m needs about 3.9 rpm", () => {
    expect(spinRpmForG(0.1, 6)).toBeCloseTo(3.86, 2);
  });

  it("without aeration, 1 m³ at 8 mg/L feeds 10 kg of fish at 300 mg/kg·h for under 1 h above 5 mg/L", () => {
    // Usable oxygen = (8 − 5) mg/L × 1000 L = 3 g; demand = 3 g/h.
    expect(oxygenReserveHours({ volumeM3: 1, doMgL: 8, minDoMgL: 5, fishKg: 10, mgO2PerKgH: 300 })).toBeCloseTo(1, 6);
    expect(oxygenReserveHours({ volumeM3: 1, doMgL: 4, minDoMgL: 5, fishKg: 10, mgO2PerKgH: 300 })).toBe(0);
    expect(oxygenReserveHours({ volumeM3: 1, doMgL: 8, minDoMgL: 5, fishKg: 0, mgO2PerKgH: 300 })).toBe(Infinity);
  });
});
