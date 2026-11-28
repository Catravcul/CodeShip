import { describe, expect, it } from "vitest";
import { GEAR, GEAR_SRC } from "./gear";

describe("The real crew equipment (docs/design/equipos.md; reglas.md §1.1, §4.5)", () => {
  it("every machine has a size with its source and a label (real, licencia or en desarrollo)", () => {
    for (const g of Object.values(GEAR)) {
      expect(g.size.source, g.kind).toMatch(/https:\/\//);
      expect(["real", "licencia", "en-desarrollo"]).toContain(g.label);
      for (const v of [g.size.value.w, g.size.value.h, g.size.value.d]) expect(v, g.kind).toBeGreaterThan(0);
    }
    for (const s of Object.values(GEAR_SRC)) expect(s).toMatch(/https:\/\//);
  });

  it("the AQH's chambers are JAXA's (about 15 × 7 × 7 cm, 0.7 L)", () => {
    const { w, h, d } = GEAR.aqh.size.value;
    expect(w * h * d * 1e6).toBeGreaterThan(600);
    expect(w * h * d * 1e6).toBeLessThan(800);
  });

  it("the storm shelter is labelled en desarrollo, with RadWorks' water walls as its source", () => {
    expect(GEAR.refugio.label).toBe("en-desarrollo");
    expect(GEAR.refugio.size.source).toMatch(/ntrs\.nasa\.gov/);
  });
});
