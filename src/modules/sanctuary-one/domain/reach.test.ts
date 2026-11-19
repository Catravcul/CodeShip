import { describe, expect, it } from "vitest";
import { footprintDistance, nearest } from "./reach";

describe("lo que tiene a mano (botón naranja)", () => {
  it("distancia a la huella girada", () => {
    expect(footprintDistance(0, 0, 0, 0, 0, 2, 4)).toBe(0);
    expect(footprintDistance(2, 0, 0, 0, 0, 2, 4)).toBeCloseTo(1);
    // Turned a quarter: the long side lies along x.
    expect(footprintDistance(2, 0, 0, 0, Math.PI / 2, 2, 4)).toBeCloseTo(0);
  });

  it("la máquina antes que el suelo sobre el que está, y solo en su nivel", () => {
    const suelo = { id: "suelo", x: 0, y: 0, z: 0, rot: 0, sx: 30, sz: 20, sy: 0.05 };
    const cinta = { id: "cinta", x: 3, y: 0, z: 0, rot: 0, sx: 0.9, sz: 2, sy: 1.5 };
    expect(nearest(2, 0, 0, [suelo, cinta], 1)?.id).toBe("cinta");
    expect(nearest(-8, 0, 0, [suelo, cinta], 1)?.id).toBe("suelo");
    expect(nearest(2, 22, 0, [suelo, cinta], 1)).toBeUndefined();
  });
});
