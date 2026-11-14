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

  it("a full workout raises fitness more than a yoga sequence, and calms less", () => {
    const a = new CrewMember("A");
    const b = new CrewMember("B");
    a.startle(0.5);
    b.startle(0.5);
    for (let i = 0; i < 4; i++) a.train(4);
    for (let i = 0; i < 4; i++) b.practice(4);
    expect(a.fitness).toBeGreaterThan(b.fitness);
    expect(a.stress).toBeGreaterThan(b.stress);
  });

  it("a full yoga sequence raises fitness and lowers stress", () => {
    const c = new CrewMember("Berón");
    c.startle(0.5);
    const before = { f: c.fitness, s: c.stress, h: c.wellbeing };
    for (let i = 0; i < 12; i++) c.practice(12);
    expect(c.fitness).toBeCloseTo(before.f + 0.25);
    expect(c.stress).toBeCloseTo(before.s - 0.3);
    expect(c.wellbeing).toBeGreaterThan(before.h);
  });

  it("loses a little more fitness in microgravity than in the ring, and counts the days", () => {
    const ring = new CrewMember("Doménica");
    const hub = new CrewMember("Doménica");
    ring.tick(1, undefined, 1);
    hub.tick(1, undefined, 0);
    expect(hub.fitness).toBeLessThan(ring.fitness);
    expect(ring.fitness - hub.fitness).toBeLessThan(0.1);
    expect(hub.microgravityDays).toBeCloseTo(1);
    expect(ring.microgravityDays).toBe(0);
  });

  it("without a gravity value (tests, old saves) nothing changes", () => {
    const a = new CrewMember("A");
    const b = new CrewMember("B");
    a.tick(0.5);
    b.tick(0.5, undefined, 1);
    expect(a.fitness).toBe(b.fitness);
  });
});
