import { describe, expect, it } from "vitest";
import { skyAt } from "./day-night";

describe("día y noche del santuario 1 (Berón 2026-11-22)", () => {
  it("de día el sol está arriba y el cielo claro; de noche, abajo y el cielo oscuro", () => {
    const noon = skyAt(13);
    const midnight = skyAt(1);
    expect(noon.sun.y).toBeGreaterThan(0.8);
    expect(noon.day).toBe(1);
    expect(midnight.sun.y).toBeLessThan(-0.5);
    expect(midnight.day).toBe(0);
    const lum = (c: number) => ((c >> 16) & 255) + ((c >> 8) & 255) + (c & 255);
    expect(lum(midnight.sky)).toBeLessThan(lum(noon.sky) / 5);
  });

  it("al amanecer y al atardecer el sol está en el horizonte y el cielo se calienta", () => {
    for (const h of [6, 20]) {
      const s = skyAt(h);
      expect(Math.abs(s.sun.y), String(h)).toBeLessThan(0.1);
      expect(s.dusk, String(h)).toBeGreaterThan(0.5);
    }
    // It rises in the east and sets in the west.
    expect(skyAt(7).sun.x).toBeGreaterThan(0);
    expect(skyAt(19).sun.x).toBeLessThan(0);
  });
});
