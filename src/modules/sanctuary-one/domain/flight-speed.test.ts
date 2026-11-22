import { describe, expect, it } from "vitest";
import { CARPET_RIDE, flightSpeed, route } from "./motion";

describe("la alfombra acelera y frena como un coche (Berón 2026-11-22)", () => {
  // Up 20 m, across 300 m, down 20 m: two right-angle turns.
  const r = route([
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 20, z: 0, fly: true },
    { x: 300, y: 20, z: 0, fly: true },
    { x: 300, y: 0, z: 0, fly: true },
  ]);

  it("va al doble que antes en crucero (12 m/s)", () => {
    expect(CARPET_RIDE.cruise).toBe(12);
    expect(flightSpeed(r, 170)).toBeCloseTo(12);
  });

  it("sale despacio y acelera, sin saltos", () => {
    expect(flightSpeed(r, 0)).toBeLessThan(3);
    let last = flightSpeed(r, 0);
    for (let s = 0.5; s < 150; s += 0.5) {
      const v = flightSpeed(r, s);
      // A car's: the speed changes little from one half metre to the next.
      expect(Math.abs(v - last), String(s)).toBeLessThan(2);
      last = v;
    }
  });

  it("frena antes de cada giro y al llegar", () => {
    expect(flightSpeed(r, 19.9)).toBeLessThan(CARPET_RIDE.turn + 2);
    expect(flightSpeed(r, 339.5)).toBeLessThan(3);
    expect(flightSpeed(r, 319.5)).toBeLessThan(CARPET_RIDE.turn + 2);
    expect(flightSpeed(r, 318)).toBeLessThan(flightSpeed(r, 310));
  });
});
