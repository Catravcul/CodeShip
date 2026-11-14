import { describe, expect, it } from "vitest";
import { HANGAR_SIZE, LANDER_ENVELOPE, MOTHERSHIP_ENVELOPE } from "../data/hangar-craft";
import { LanderBerth, fitsInHangar, overHangar } from "./hangar-berth";

describe("EST-22 what goes in the hangar", () => {
  it("the hangar is 20 × 14 × 20 m", () => {
    expect(HANGAR_SIZE).toEqual({ x: 20, y: 14, z: 20 });
  });

  it("the lander fits with a metre all round; the mothership is more than 7 times too long and docks outside", () => {
    expect(fitsInHangar(LANDER_ENVELOPE, HANGAR_SIZE)).toBe(true);
    expect(fitsInHangar(MOTHERSHIP_ENVELOPE, HANGAR_SIZE)).toBe(false);
    expect(overHangar(MOTHERSHIP_ENVELOPE, HANGAR_SIZE)).toBeGreaterThan(7);
    expect(MOTHERSHIP_ENVELOPE.massKg / LANDER_ENVELOPE.massKg).toBeGreaterThan(1000);
  });

  it("the arm takes the lander in only from its port, and back out", () => {
    const b = new LanderBerth();
    expect(b.moveIn(false)).toMatch(/acóplalo/);
    expect(b.inHangar).toBe(false);
    expect(b.moveIn(true)).toBeUndefined();
    expect(b.inHangar).toBe(true);
    expect(b.moveIn(true)).toMatch(/ya está/);
    expect(b.moveOut()).toBeUndefined();
    expect(b.place).toBe("puerto");
  });
});
