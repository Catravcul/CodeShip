import { describe, expect, it } from "vitest";
import { departureFromLeoMs, earthToRegion, hohmann, synodicDays } from "./transfer";
import { leoKgPerKgDelivered, massRatio } from "./rocket";
import { importQuote } from "./quote";

describe("Earth to the belt", () => {
  it("Earth–Mars Hohmann takes about 259 days (the textbook value)", () => {
    expect(hohmann(1, 1.524).days).toBeGreaterThan(255);
    expect(hohmann(1, 1.524).days).toBeLessThan(262);
  });

  it("leaving LEO for Mars costs about 3,6 km/s (Oberth effect)", () => {
    const h = hohmann(1, 1.524);
    expect(departureFromLeoMs(h.dv1HelioMs)).toBeGreaterThan(3500);
    expect(departureFromLeoMs(h.dv1HelioMs)).toBeLessThan(3700);
  });

  it("to the inner belt at 2,42 AU: ~4,6 km/s out of LEO, ~4,5 km/s to match, ~1,1 years", () => {
    const t = earthToRegion(2.42);
    expect(t.departMs / 1000).toBeCloseTo(4.56, 1);
    expect(t.arriveMs / 1000).toBeCloseTo(4.5, 1);
    expect(t.days / 365.25).toBeCloseTo(1.12, 1);
    // A window every ~1,36 years.
    expect(synodicDays(2.42) / 365.25).toBeCloseTo(1.36, 1);
  });

  it("the rocket equation multiplies the mass: one stage cannot do 9 km/s with 10 % tanks, two can", () => {
    expect(massRatio(3727, 380)).toBeCloseTo(Math.E, 2);
    expect(() => leoKgPerKgDelivered([9060], 380, 0.1)).toThrow();
    const m = leoKgPerKgDelivered([4560, 4500], 380, 0.1);
    expect(m).toBeGreaterThan(19);
    expect(m).toBeLessThan(20.5);
  });

  it("an import is priced as mass × multiplier × launch price, in créditos of 1 000 US$", () => {
    const q = importQuote(25, 3246, 2.42, { ispS: 380, tankage: 0.1 }, 1);
    expect(q.leoKg).toBeCloseTo(25 * q.leoKgPerKg, 6);
    expect(q.usd).toBeCloseTo(q.leoKg * 3246, 3);
    expect(q.credits).toBe(Math.ceil(q.usd / 1000));
    expect(q.gameHours).toBeCloseTo(q.transitDays, 6);
    // A 25 kg kit on a Falcon 9 costs more than a million and a half dollars.
    expect(q.usd).toBeGreaterThan(1.5e6);
  });
});
