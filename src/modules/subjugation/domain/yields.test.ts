import { describe, expect, it } from "vitest";
import { BENNU } from "@modules/celestial/data/bennu";
import { POLANA_MEMBERS } from "@modules/celestial/data/nueva-polana";
import type { AsteroidData } from "@modules/celestial/domain/asteroid";
import { extractionRateKgPerHour, FullExtraction, massScale, packageKg, shipPackage, stationPackage, YIELD_TUNING, yieldScale } from "./yields";

const big = POLANA_MEMBERS.find((m) => m.id === "242916")!;

describe("what a subjugated asteroid yields", () => {
  it("scales with the cube root of the mass: Bennu is the reference", () => {
    expect(massScale(BENNU.massKg.value)).toBeCloseTo(1, 3);
    expect(massScale(8 * BENNU.massKg.value)).toBeCloseTo(2, 3);
    // 242916 (2,44 km) yields about five times Bennu.
    expect(yieldScale(big) / yieldScale(BENNU)).toBeGreaterThan(4.5);
    expect(yieldScale(big) / yieldScale(BENNU)).toBeLessThan(5.5);
  });

  it("richer rock pays more; poor rock still pays something", () => {
    const poor: AsteroidData = { ...BENNU, composition: BENNU.composition.filter((c) => c.material.startsWith("Silicates")) };
    expect(yieldScale(poor)).toBeLessThan(yieldScale(BENNU));
    expect(yieldScale(poor)).toBeGreaterThan(0);
  });

  it("packages carry the asteroid's own composition; the station's are bigger than the ship's", () => {
    const s = shipPackage(BENNU);
    const st = stationPackage(BENNU);
    expect(packageKg(st)).toBeGreaterThan(packageKg(s));
    expect(packageKg(s)).toBeCloseTo(YIELD_TUNING.shipPackageKg * yieldScale(BENNU), 6);
    expect(s.map((c) => c.material)).toEqual(BENNU.composition.map((c) => c.material));
    const silicates = s.find((c) => c.material.startsWith("Silicates"))!;
    expect(silicates.kg / packageKg(s)).toBeGreaterThan(0.5);
  });

  it("a Bennu-sized package to the ship is worth more than half the lander's hold, every game day", () => {
    expect(packageKg(shipPackage(BENNU))).toBeGreaterThan(250);
  });

  it("full extraction hands over lots at its rate until the whole real mass is gone", () => {
    const small: AsteroidData = { ...BENNU, massKg: { ...BENNU.massKg, value: 5000 } };
    const x = new FullExtraction(small, 1000);
    expect(x.totalKg).toBe(5000);
    const perHour = extractionRateKgPerHour(small);
    // Nothing until a lot is free.
    expect(x.step((0.5 * 1000) / perHour)).toBeUndefined();
    const lot = x.step((0.6 * 1000) / perHour)!;
    expect(packageKg(lot)).toBeCloseTo(1100, 3);
    let guard = 0;
    while (!x.done && guard++ < 1000) x.step(1e4);
    expect(x.done).toBe(true);
    expect(x.takenKg).toBeCloseTo(5000, 6);
    expect(x.step(10)).toBeUndefined();
  });
});
