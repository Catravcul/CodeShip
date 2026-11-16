import { describe, expect, it } from "vitest";
import { ALL_FAILURES, ECLSS_MACHINES, ECLSS_RACKS, ISPR } from "./eclss-machines";

describe("SV-09 the real machines and their racks (the placement interface)", () => {
  it("has the ISS's machines: OGA, Sabatier, CDRA, TCCS, UPA, WPA, BPA, coolant loops, fire, galley", () => {
    expect(ECLSS_MACHINES.map((m) => m.id).sort()).toEqual(["bpa", "cdra", "galeria", "incendios", "itcs", "oga", "sabatier", "tccs", "upa", "wpa"]);
    for (const m of ECLSS_MACHINES) {
      expect(m.rate.source, m.id).toMatch(/^https:\/\//);
      expect(m.powerW.source, m.id).toMatch(/^https:\/\//);
      expect(m.massKg.source, m.id).toMatch(/^https:\/\//);
      expect(m.realism).toBe("real");
    }
  });

  it("every failure has a spare, a procedure and a source; ids are unique", () => {
    expect(new Set(ALL_FAILURES.map((f) => f.id)).size).toBe(ALL_FAILURES.length);
    for (const f of ALL_FAILURES) {
      expect(f.steps.length, f.id).toBeGreaterThanOrEqual(4);
      expect(f.spare.id).toBeTruthy();
      expect(f.source).toMatch(/^https:\/\//);
      expect(f.check.wrong).not.toContain(f.check.value);
    }
  });

  it("every machine is in exactly one rack; racks are ISPR-sized at real scale (2,0 × 1,05 × 0,86 m)", () => {
    for (const m of ECLSS_MACHINES) expect(ECLSS_RACKS.filter((r) => r.machines.includes(m.id)).map((r) => r.kind), m.id).toEqual([m.rack]);
    expect(ISPR).toMatchObject({ w: 1.05, h: 2.0, d: 0.86 });
    for (const r of ECLSS_RACKS.filter((x) => x.bays > 0)) expect(r.size).toEqual({ w: ISPR.w * r.bays, h: ISPR.h, d: ISPR.d });
  });
});
