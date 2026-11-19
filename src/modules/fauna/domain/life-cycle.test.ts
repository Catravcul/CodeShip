import { describe, expect, it } from "vitest";
import { ageInGroup, ageLabel, lifeAt, monthOf, sizeAt, stageOf, type LifeCycle } from "./life-cycle";

const SEAL: LifeCycle = { childDays: 45, teenDays: 365, adultDays: 6000, birthSize: 0.5, gestationMonths: 10.5, intervalMonths: 12, birthMonth: 10 };

describe("an animal's life cycle", () => {
  it("goes cría → joven → adulto → anciano by its stages' real durations", () => {
    expect(stageOf(10, SEAL)).toBe("cria");
    expect(stageOf(100, SEAL)).toBe("joven");
    expect(stageOf(2000, SEAL)).toBe("adulto");
    expect(stageOf(45 + 365 + 6000 * 0.8, SEAL)).toBe("anciano");
  });

  it("is born at its real size fraction and is nearly grown when it comes of age", () => {
    expect(sizeAt(0, SEAL)).toBeCloseTo(0.5);
    expect(sizeAt(45 + 365, SEAL)).toBeGreaterThan(0.95);
    expect(sizeAt(5000, SEAL)).toBeLessThanOrEqual(1);
    expect(sizeAt(30, SEAL)).toBeGreaterThan(sizeAt(10, SEAL));
  });

  it("gives a family mixed ages: births only in its season, at least one adult per two", () => {
    const ages = Array.from({ length: 8 }, (_, i) => ageInGroup(i, 8, SEAL));
    expect(ages.filter((a) => stageOf(a, SEAL) === "adulto" || stageOf(a, SEAL) === "anciano").length).toBeGreaterThanOrEqual(4);
    expect(ages.some((a) => stageOf(a, SEAL) !== "adulto")).toBe(true);
    for (const a of ages) expect(a).toBeLessThan(45 + 365 + 6000);
    expect(ageInGroup(3, 8, SEAL)).toBe(ageInGroup(3, 8, SEAL));
  });
});

describe("the cycle lived day by day", () => {
  const SHORT: LifeCycle = { childDays: 10, teenDays: 20, adultDays: 100, birthSize: 0.2, gestationMonths: 1, intervalMonths: 12, birthMonth: 3 };

  it("knows each game day's month from the year day of the start", () => {
    expect(monthOf(0, 0)).toBe(1);
    expect(monthOf(31, 0)).toBe(2);
    expect(monthOf(10, 360)).toBe(1);
    expect(monthOf(0, 334)).toBe(12);
  });

  it("is the same animal until it dies of old age; then its place waits for the next birth season", () => {
    expect(lifeAt(-50, 0, SHORT, 0)).toEqual({ born: -50, alive: true, generation: 0 });
    // Dies on day 80 (born −50, lives 130); March starts on year day 59, so next March is day 365 + 59.
    const gap = lifeAt(-50, 100, SHORT, 0);
    expect(gap.alive).toBe(false);
    expect(gap.born).toBe(365 + 59);
    const next = lifeAt(-50, 365 + 60, SHORT, 0);
    expect(next).toEqual({ born: 365 + 59, alive: true, generation: 1 });
    expect(monthOf(next.born, 0)).toBe(3);
  });

  it("names the age", () => {
    expect(ageLabel(3, SHORT)).toBe("cría de 3 días");
    expect(ageLabel(400, SEAL)).toBe("joven de 13 meses");
    expect(ageLabel(3000, SEAL)).toBe("adulto de 8 años");
  });
});
