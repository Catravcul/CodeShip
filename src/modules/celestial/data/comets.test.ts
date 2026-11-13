import { describe, expect, it } from "vitest";
import { COMETS, COMET_MATERIAL, COMET_PLACEMENTS_M, cometComposition } from "./comets";
import { NUEVA_POLANA, POLANA_MEMBERS, POLANA_PLACEMENTS_M } from "./nueva-polana";

const mid = (v: [number, number]) => (v[0] + v[1]) / 2;

describe("comets", () => {
  it("67P's mass matches the GM measured by Rosetta's radio science", () => {
    const c = COMETS.find((x) => x.id === "67p")!;
    // GM = 662.2e-9 km³/s² (Pätzold et al. 2016) → 9.92e12 kg; a 3.4 km sphere at 533 kg/m³ is within 15 %.
    expect(c.massKg.value / (662.2 / 6.6743e-11)).toBeGreaterThan(0.85);
    expect(c.massKg.value / (662.2 / 6.6743e-11)).toBeLessThan(1.15);
  });

  it("a 67P-like nucleus is a quarter or less ice, mostly water, then CO2", () => {
    const comp = cometComposition();
    const ice = comp.filter((e) => /ice|Ammonia|volatiles/.test(e.material));
    const iceHi = ice.reduce((s, e) => s + e.massFraction.value[1], 0);
    const iceLo = ice.reduce((s, e) => s + e.massFraction.value[0], 0);
    expect(iceHi).toBeCloseTo(0.25, 5); // R = 3
    expect(iceLo).toBeCloseTo(1 / 7, 5); // R = 6
    const water = comp.find((e) => e.material === COMET_MATERIAL.waterIce)!;
    const co2 = comp.find((e) => e.material === COMET_MATERIAL.co2Ice)!;
    expect(mid(water.massFraction.value)).toBeGreaterThan(5 * mid(co2.massFraction.value));
    // Every range closes: low + high bounds of all entries bracket 1.
    expect(comp.reduce((s, e) => s + e.massFraction.value[0], 0)).toBeLessThanOrEqual(1);
    expect(comp.reduce((s, e) => s + e.massFraction.value[1], 0)).toBeGreaterThanOrEqual(1);
  });

  it("organics are 45 % of the dust (COSIMA)", () => {
    const comp = cometComposition();
    const org = comp.find((e) => e.material === COMET_MATERIAL.organics)!;
    const min = comp.find((e) => e.material === COMET_MATERIAL.minerals)!;
    expect(org.massFraction.value[0] / (org.massFraction.value[0] + min.massFraction.value[0])).toBeCloseTo(0.45, 5);
  });

  it("every comet is flagged, sourced and placed inside the flyable area, away from the asteroids", () => {
    for (const c of COMETS) {
      expect(c.kind).toBe("cometa");
      expect(c.meanRadiusM.source).toMatch(/^https:/);
      const p = COMET_PLACEMENTS_M[c.id]!;
      expect(p.length() + c.meanRadiusM.value).toBeLessThan(NUEVA_POLANA.boundaryRadiusM - NUEVA_POLANA.warningBandM);
      for (const m of POLANA_MEMBERS) expect(p.sub(POLANA_PLACEMENTS_M[m.id]!).length()).toBeGreaterThan(5000);
    }
  });

  it("Jupiter-family comets cross the region's distance from the Sun; 133P lives in the belt", () => {
    for (const c of COMETS) {
      const o = c.orbit.value;
      expect(o.qAU).toBeLessThan(2.7);
      expect(o.QAU).toBeGreaterThan(2.42);
    }
  });
});
