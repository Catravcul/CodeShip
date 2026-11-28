import { describe, expect, it } from "vitest";
import { placeAt, step } from "@modules/aerial-sanctuary/domain/walk";
import { buildS1Layout } from "./layout";
import { WALK_CACHE_MAX, WalkIndex } from "./walk-index";

describe("rejilla del mundo de paseo", () => {
  const L = buildS1Layout(1);
  const idx = new WalkIndex(L.world);

  it("andar con la rejilla da lo mismo que con el mundo entero, y mira muchas menos piezas", () => {
    let checked = 0;
    for (const a of L.areas.filter((q) => q.entry).slice(0, 40)) {
      let full = placeAt(L.world, a.entry!.x, a.y + 0.01, a.entry!.z)!;
      let fast = placeAt(idx.near(a.entry!.x, a.entry!.z), a.entry!.x, a.y + 0.01, a.entry!.z)!;
      expect(fast).toEqual(full);
      for (let i = 0; i < 60; i++) {
        const d = { dx: Math.sin(i * 0.7) * 0.2, dz: Math.cos(i * 0.3) * 0.2 };
        full = step(L.world, full, d);
        fast = step(idx.near(fast.x, fast.z, fast.y), fast, d);
        expect(fast).toEqual(full);
      }
      checked++;
      // A third at most: since 2026-11-21 the sanctuary has half the floors, so the whole is smaller and a busy tree's
      // three levels round her (Servicios: kitchen, hospital, vet) are a bigger share of it.
      expect(idx.near(a.x, a.z, a.y).solids.length, a.id).toBeLessThan(L.world.solids.length / 3);
    }
    expect(checked).toBeGreaterThan(20);
  });
});

describe("la rejilla no crece sin fin (memoria del móvil, PX-51)", () => {
  it("andando por miles de celdas y alturas, su caché se queda acotada", () => {
    const idx = new WalkIndex({ floors: [{ id: "suelo", area: "a", x0: -5000, x1: 5000, z0: -5000, z1: 5000, y: 0 }], waters: [], solids: [] });
    for (let i = 0; i < 4000; i++) idx.near((i % 70) * 40, Math.floor(i / 70) * 40, (i % 9) * 12);
    expect(idx.cached).toBeLessThanOrEqual(WALK_CACHE_MAX);
  });
});
