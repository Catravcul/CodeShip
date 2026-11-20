import { describe, expect, it } from "vitest";
import { placeAt, step } from "@modules/aerial-sanctuary/domain/walk";
import { buildS1Layout } from "./layout";
import { WalkIndex } from "./walk-index";

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
      expect(idx.near(a.x, a.z, a.y).solids.length).toBeLessThan(L.world.solids.length / 4);
    }
    expect(checked).toBeGreaterThan(20);
  });
});
