import { describe, expect, it } from "vitest";
import { CREW_TUNING, CrewMember, mealPortions } from "./crew-member";
import { BOARD_DAY_REAL_S } from "@core/board-time";

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

describe("VID-20 ritmo de los días: el hambre vuelve dos veces por día de a bordo", () => {
  /** Days of life eating a meal (half of her day) each time she gets hungry; returns the hunger onsets per day. */
  const onsetsPerDay = (days: number, mealKcal?: (c: CrewMember) => number): number => {
    const c = new CrewMember("Doménica");
    const dt = 1 / 2000;
    let onsets = 0;
    let was = c.hungry;
    for (let t = 0; t < days; t += dt) {
      c.tick(dt);
      if (c.hungry && !was) onsets++;
      was = c.hungry;
      if (c.hungry) {
        c.eatKcal(mealKcal ? mealKcal(c) : c.mealKcal);
        was = c.hungry;
      }
    }
    return onsets / days;
  };

  it("eating a real meal each time (half of her daily energy), she is hungry twice a day (Berón: «las comidas serán 2 al día»)", () => {
    expect(CREW_TUNING.mealShareOfDay).toBe(1 / 2);
    expect(onsetsPerDay(10)).toBeGreaterThanOrEqual(1.9);
    expect(onsetsPerDay(10)).toBeLessThanOrEqual(2.1);
  });

  it("a day on board lasts 24 real minutes: hungry every ~12 real minutes, not every 13 s as with the 40 s day", () => {
    expect(BOARD_DAY_REAL_S).toBe(1440);
    const realMinutesBetweenMeals = BOARD_DAY_REAL_S / 60 / onsetsPerDay(10);
    expect(realMinutesBetweenMeals).toBeGreaterThan(11);
    expect(realMinutesBetweenMeals).toBeLessThan(13);
  });

  it("a meal is the portions that make about half of her day: two big plates or two small ones, never more than the dish", () => {
    const meal = new CrewMember("Doménica").mealKcal;
    expect(meal).toBeGreaterThan(1050);
    expect(mealPortions(618, 2, meal)).toBe(2);
    expect(mealPortions(618, 4, meal)).toBe(2);
    expect(mealPortions(360, 2, meal)).toBe(2);
    expect(mealPortions(113, 2, meal)).toBe(2);
    expect(mealPortions(187, 1, meal)).toBe(1);
  });

  it("a light meal (one small portion) brings hunger back sooner", () => {
    expect(onsetsPerDay(10, () => 190)).toBeGreaterThan(8);
  });
});
