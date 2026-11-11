import { describe, expect, it } from "vitest";
import { CrewMember } from "./crew-member";

describe("CrewMember", () => {
  it("gets hungry and stressed without meals; eating restores", () => {
    const c = new CrewMember("Berón");
    c.tick(1);
    expect(c.satiety).toBe(0);
    expect(c.stress).toBeGreaterThan(0.2);
    c.eat();
    expect(c.satiety).toBeCloseTo(0.45);
  });

  it("a full yoga sequence raises fitness and lowers stress", () => {
    const c = new CrewMember("Berón");
    c.startle(0.5);
    const before = { f: c.fitness, s: c.stress, h: c.health };
    for (let i = 0; i < 12; i++) c.practice(12);
    expect(c.fitness).toBeCloseTo(before.f + 0.25);
    expect(c.stress).toBeCloseTo(before.s - 0.3);
    expect(c.health).toBeGreaterThan(before.h);
  });
});
