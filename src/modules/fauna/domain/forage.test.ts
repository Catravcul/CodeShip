import { describe, expect, it } from "vitest";
import { daylightHours, eppley, graze, grow, rateFor, seasonFactor, takeable, yearMean } from "./forage";

describe("fauna/forage: plants as countable food", () => {
  it("daylight at 54°S: long in December, short in June (Forsythe's CBM model)", () => {
    const dec = daylightHours(-54.3, 355);
    const jun = daylightHours(-54.3, 172);
    expect(dec).toBeGreaterThan(17);
    expect(dec).toBeLessThan(18.5);
    expect(jun).toBeGreaterThan(6.5);
    expect(jun).toBeLessThan(7.6);
    expect(daylightHours(0, 80)).toBeCloseTo(12.1, 0);
  });

  it("Eppley: 0.59 per day at 0 °C, faster when warmer", () => {
    expect(eppley(0)).toBeCloseTo(0.59, 3);
    expect(eppley(4)).toBeGreaterThan(eppley(0));
  });

  it("no growth in the cold or the dark; full with light and warmth", () => {
    expect(seasonFactor(7, -2, 0)).toBe(0);
    expect(seasonFactor(0, 10, 0)).toBe(0);
    expect(seasonFactor(18, 8, 0)).toBe(1);
  });

  it("logistic growth never passes the stock the place holds, and nothing grows from nothing", () => {
    let kg = 10;
    for (let i = 0; i < 1000; i++) kg = grow(kg, 100, 0.5, 1, 1);
    expect(kg).toBeLessThanOrEqual(100);
    expect(kg).toBeGreaterThan(99);
    expect(grow(0, 100, 0.5, 1, 1)).toBe(0);
    expect(grow(50, 100, 0.5, 0, 10)).toBe(50);
  });

  it("rateFor gives the P/B asked at half the stock", () => {
    const r = rateFor(1.2, 0.5);
    const B = 50;
    const perDay = r * 0.5 * B * (1 - B / 100);
    expect((perDay * 365) / B).toBeCloseTo(1.2, 5);
  });

  it("grazing shares what can be found, never below the refuge", () => {
    const { fed, left } = graze(100, 20, 1000, 1);
    expect(fed).toBeLessThan(1);
    expect(left).toBeGreaterThanOrEqual(20);
    expect(graze(100, 20, 1, 1)).toEqual({ fed: 1, left: 99 });
    expect(takeable(10, 20, 1)).toBe(0);
  });

  it("yearMean averages over the year", () => {
    expect(yearMean(() => 0.4)).toBeCloseTo(0.4, 6);
  });
});
