import { describe, expect, it } from "vitest";
import { EMU } from "../data/suit";
import { Suit, WORKLOAD } from "./suit";

describe("Suit", () => {
  it("starts full and lasts the EMU's 8 h at the average metabolic rate", () => {
    const s = new Suit(EMU);
    expect(s.oxygen).toBe(1);
    expect(s.timeLeftS).toBeCloseTo(8 * 3600, 0);
    for (let i = 0; i < 8 * 60 - 1; i++) s.tick(60, 1);
    expect(s.status).not.toBe("agotado");
    expect(s.onSecondary).toBe(false);
  });

  it("hard work drains oxygen and the scrubber faster, not the battery", () => {
    const calm = new Suit(EMU);
    const busy = new Suit(EMU);
    calm.tick(3600, WORKLOAD.rest);
    busy.tick(3600, WORKLOAD.crawl);
    expect(busy.oxygen).toBeLessThan(calm.oxygen);
    expect(busy.co2Scrubber).toBeLessThan(calm.co2Scrubber);
    expect(busy.battery).toBeCloseTo(calm.battery, 9);
  });

  it("switches to the 30 min secondary oxygen and asks to head back", () => {
    const s = new Suit(EMU);
    s.tick(8 * 3600 + 1, 1);
    expect(s.onSecondary).toBe(true);
    expect(s.status).toBe("reserva");
    s.tick(31 * 60, 1);
    expect(s.status).toBe("agotado");
  });

  it("warns to head back with 30 min of margin left", () => {
    const s = new Suit(EMU);
    s.tick(7.6 * 3600, 1);
    expect(s.status).toBe("volver");
  });

  it("workload is capped at the suit's design maximum (580 W = 2× average)", () => {
    const a = new Suit(EMU);
    const b = new Suit(EMU);
    a.tick(600, 5);
    b.tick(600, 2);
    expect(a.oxygen).toBeCloseTo(b.oxygen, 9);
  });

  it("refills when she gets back aboard", () => {
    const s = new Suit(EMU);
    s.tick(3 * 3600, 1);
    s.recharge();
    expect(s.oxygen).toBe(1);
    expect(s.battery).toBe(1);
  });
});
