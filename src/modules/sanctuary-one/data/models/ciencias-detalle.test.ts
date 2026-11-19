import { describe, expect, it } from "vitest";
import { ANALISIS, CULTIVO, INFORMATICA, MOLECULAR, SINTESIS } from "./ciencias";
import { CIENCIAS_DETAIL } from "./ciencias-detalle";

const BLOCKS = [...SINTESIS, ...ANALISIS, ...CULTIVO, ...MOLECULAR, ...INFORMATICA];

describe("Ciencias: forma de cada equipo", () => {
  it("ningún equipo queda como una caja", () => {
    expect(BLOCKS.filter((b) => !b[8] && !CIENCIAS_DETAIL[b[0]]).map((b) => b[0])).toEqual([]);
  });
  it("cada forma cabe en la huella y la altura del bloque", () => {
    for (const [id, parts] of Object.entries(CIENCIAS_DETAIL)) {
      const b = BLOCKS.find((x) => x[0] === id);
      expect(b, id).toBeDefined();
      const [, , w, d, h] = b!;
      for (const [cx, cy, cz, sx, sy, sz] of parts) {
        expect(Math.abs(cx) + sx / 2, id).toBeLessThanOrEqual(w / 2 + 0.03);
        expect(Math.abs(cz) + sz / 2, id).toBeLessThanOrEqual(d / 2 + 0.05);
        expect(cy + sy / 2, id).toBeLessThanOrEqual(h + 0.01);
      }
    }
  });
});
