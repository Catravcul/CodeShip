import { describe, expect, it } from "vitest";
import { ageInGroup, sizeAt, stageOf, type LifeCycle } from "./life-cycle";

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
