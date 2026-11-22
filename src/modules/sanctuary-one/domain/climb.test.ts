import { describe, expect, it } from "vitest";
import { climbTarget, jumpHeight, JUMP_V0_MS } from "./climb";

const ground = { id: "suelo", x0: -10, x1: 10, z0: -10, z1: 10, y: 0, area: "gym" };
const wall = { x0: -1, x1: 1, z0: -2, z1: -1, y0: 0, y1: 1.5 };
const w = { floors: [ground], waters: [], solids: [wall] };
const b = { x: 0, y: 0, z: -0.6, motion: "gravedad" as const, area: "gym" };

describe("trepar y saltar (Berón 2026-11-19)", () => {
  it("sube al muro que tiene delante y se queda de pie encima", () => {
    const c = climbTarget(w, b, 0)!;
    expect(c.y).toBe(1.5);
    expect(c.z).toBeLessThan(-1);
    expect(c.floor.y).toBe(1.5);
  });
  it("un muro fino se pasa por encima y se baja al otro lado", () => {
    const thin = { x0: -1, x1: 1, z0: -1.3, z1: -1, y0: 0, y1: 1.5 };
    const c = climbTarget({ ...w, solids: [thin] }, b, 0)!;
    expect(c.over).toBe(1.5);
    expect(c.y).toBe(0);
    expect(c.z).toBeLessThan(-1.3);
  });
  it("de espaldas al muro no trepa; tampoco a lo que pasa de 2,6 m", () => {
    expect(climbTarget(w, b, Math.PI)).toBeUndefined();
    expect(climbTarget({ ...w, solids: [{ ...wall, y1: 4 }] }, b, 0)).toBeUndefined();
  });
  it("por una escalera de mano sube más alto: a la litera de arriba, solo desde la escalera (Berón 2026-11-22)", () => {
    const deck = { id: "litera", x0: -1.8, x1: 1.8, z0: -3.2, z1: -1.1, y: 3.4, area: "gym", ladder: { x0: -0.25, x1: 0.25, z0: -1.1, z1: -1.0 } };
    const c = climbTarget({ ...w, solids: [], floors: [ground, deck] }, b, 0)!;
    expect(c.y).toBe(3.4);
    expect(c.floor).toBe(deck);
    // Beside the bed, away from its ladder, it is too high.
    expect(climbTarget({ ...w, solids: [], floors: [ground, deck] }, { ...b, x: 1.4 }, 0)).toBeUndefined();
  });
  it("un salto de pie sube unos 45 cm y vuelve al suelo", () => {
    const top = JUMP_V0_MS / 9.81;
    expect(jumpHeight(JUMP_V0_MS, top)).toBeCloseTo(0.5, 2);
    expect(jumpHeight(JUMP_V0_MS, 2 * top + 0.01)).toBe(0);
  });
});
