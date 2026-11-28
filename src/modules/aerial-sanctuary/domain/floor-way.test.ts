import { describe, expect, it } from "vitest";
import { floorWay } from "./floor-way";

const crosses = (a: { x: number; z: number }, b: { x: number; z: number }, t: { x0: number; x1: number; z0: number; z1: number }) => {
  for (let j = 0; j <= 200; j++) {
    const x = a.x + ((b.x - a.x) * j) / 200;
    const z = a.z + ((b.z - a.z) * j) / 200;
    if (x > t.x0 && x < t.x1 && z > t.z0 && z < t.z1) return true;
  }
  return false;
};

describe("una manera de cruzar un piso amueblado (floorWay)", () => {
  const floor = [{ x0: 0, x1: 20, z0: 0, z1: 20 }];
  it("en un piso vacío va recto", () => {
    const w = floorWay(floor, [], { x: 2, z: 2 }, { x: 18, z: 18 })!;
    expect(w).toEqual([{ x: 2, z: 2 }, { x: 18, z: 18 }]);
  });
  it("rodea un mueble sin atravesarlo y solo guarda las esquinas", () => {
    const sofa = { x0: 5, x1: 15, z0: 8, z1: 12 };
    const w = floorWay(floor, [sofa], { x: 10, z: 2 }, { x: 10, z: 18 })!;
    expect(w.length).toBeGreaterThan(2);
    expect(w.length).toBeLessThan(8);
    for (let i = 1; i < w.length; i++) expect(crosses(w[i - 1]!, w[i]!, sofa)).toBe(false);
    expect(w.at(-1)).toEqual({ x: 10, z: 18 });
  });
  it("si el destino es el mueble, acaba junto a él (near)", () => {
    const table = { x0: 9, x1: 11, z0: 9, z1: 11 };
    expect(floorWay(floor, [table], { x: 2, z: 2 }, { x: 10, z: 10 })).toBeUndefined();
    const w = floorWay(floor, [table], { x: 2, z: 2 }, { x: 10, z: 10 }, { near: 2 })!;
    const e = w.at(-1)!;
    expect(Math.hypot(e.x - 10, e.z - 10)).toBeLessThan(2);
    expect(e.x > 9 - 0.4 && e.x < 11 + 0.4 && e.z > 9 - 0.4 && e.z < 11 + 0.4).toBe(false);
  });
  it("pasa de un rectángulo a otro (un rellano) y no sale del piso", () => {
    const two = [...floor, { x0: 20, x1: 26, z0: 8, z1: 12 }];
    const w = floorWay(two, [], { x: 2, z: 2 }, { x: 25, z: 10 })!;
    expect(w.at(-1)).toEqual({ x: 25, z: 10 });
    expect(floorWay(floor, [], { x: 2, z: 2 }, { x: 25, z: 10 })).toBeUndefined();
  });
  it("sin camino (un muro de lado a lado), no hay manera", () => {
    expect(floorWay(floor, [{ x0: -1, x1: 21, z0: 9, z1: 11 }], { x: 10, z: 2 }, { x: 10, z: 18 })).toBeUndefined();
  });
});
