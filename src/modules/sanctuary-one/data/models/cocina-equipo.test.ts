import { describe, expect, it } from "vitest";
import { model } from "../catalog";
import { KITCHEN_BLOCKS } from "./servicios";

describe("the restaurant's real equipment", () => {
  it("every wall block is real machinery inside Cold Sanctuary's footprint, not one box", () => {
    const off: string[] = [];
    for (const [id, , w, d] of KITCHEN_BLOCKS) {
      const m = model(`cocina-${id}`);
      expect(m.shape, id).toBe("piezas");
      expect(m.parts!.length, id).toBeGreaterThan(8);
      if (Math.abs(m.size.x - w) > 1e-6 || Math.abs(m.size.z - d) > 1e-6) off.push(`${id}: ${m.size.x.toFixed(2)} × ${m.size.z.toFixed(2)} ≠ ${w} × ${d}`);
    }
    expect(off).toEqual([]);
  });
});
