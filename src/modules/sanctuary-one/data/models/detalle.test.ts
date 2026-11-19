import { describe, expect, it } from "vitest";
import { MODELS } from "../catalog";
import { DETAIL } from "./detalle";
import { GYM_DETAIL } from "./gimnasio-detalle";

describe("Formas de los modelos que eran una caja", () => {
  it("cada forma corresponde a un modelo y cabe en su tamaño", () => {
    for (const [id, parts] of [...Object.entries(DETAIL), ...Object.entries(GYM_DETAIL)]) {
      const d = MODELS.find((x) => x.id === id);
      expect(d?.shape, id).toBe("piezas");
      const { x, y, z } = d!.size;
      for (const [cx, cy, cz, sx, sy, sz] of parts) {
        expect(Math.abs(cx) + sx / 2, id).toBeLessThanOrEqual(x / 2 + 0.03);
        expect(Math.abs(cz) + sz / 2, id).toBeLessThanOrEqual(z / 2 + 0.05);
        expect(cy + sy / 2, id).toBeLessThanOrEqual(y + 0.01);
      }
    }
  });
});
