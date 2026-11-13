import { describe, expect, it } from "vitest";
import { BENNU } from "@modules/celestial/data/bennu";
import { POLANA_MEMBERS, POLANA_NEIGHBOURS } from "@modules/celestial/data/nueva-polana";
import { CERES, DA_1986, EROS, PSYCHE } from "../data/reference-bodies";
import { powerOf, reaches, TIERS } from "./power";
import { COMETS } from "@modules/celestial/data/comets";

describe("asteroid power from real data", () => {
  it("Bennu, a 490 m rubble pile, throws rocks (tier 1) and can only reach the probe", () => {
    const p = powerOf(BENNU);
    expect(p.tier).toBe(1);
    expect(p.diameterM).toBeCloseTo(490, 0);
    // Real escape speed of Bennu is about 0,2 m/s.
    expect(p.escapeSpeedMs).toBeGreaterThan(0.15);
    expect(p.escapeSpeedMs).toBeLessThan(0.25);
    expect(reaches(1, "sonda")).toBe(true);
    expect(reaches(1, "aterrizador")).toBe(false);
  });

  it("the six New Polana members (1,2–2,4 km, Bennu-like rock with ~8 % water and carbon) make explosives (tier 3)", () => {
    for (const m of POLANA_MEMBERS) {
      const p = powerOf(m);
      expect(p.volatileFraction).toBeCloseTo(0.082, 2);
      expect(p.tier).toBe(3);
    }
  });

  it("142 Polana, 55 km with no composition, is tier 3 by its B type (volatiles assumed)", () => {
    const p = powerOf(POLANA_NEIGHBOURS[0]!.data);
    expect(p.volatilesAssumed).toBe(true);
    expect(p.tier).toBe(3);
  });

  it("a big dry S-type (Eros) is tier 2, a metallic one (1986 DA) tier 4, and Psyche and Ceres tier 5 by their escape speed", () => {
    expect(powerOf(EROS).tier).toBe(2);
    expect(powerOf(DA_1986).tier).toBe(4);
    expect(powerOf(DA_1986).metalFraction).toBeCloseTo(0.85, 2);
    expect(powerOf(PSYCHE).tier).toBe(5);
    expect(powerOf(CERES).escapeSpeedMs).toBeGreaterThan(500);
    expect(powerOf(CERES).tier).toBe(5);
  });

  it("each tier reaches at least what the one below reaches, and only tiers 4 and 5 reach the station", () => {
    for (const t of [2, 3, 4, 5] as const) for (const k of TIERS[(t - 1) as 1 | 2 | 3 | 4].reaches) expect(reaches(t, k)).toBe(true);
    expect([1, 2, 3, 4, 5].filter((t) => reaches(t as 1, "estacion"))).toEqual([4, 5]);
    expect([1, 2, 3, 4, 5].filter((t) => reaches(t as 1, "nodriza"))).toEqual([3, 4, 5]);
  });

  it("comets keep the tier of their size and ice and add outgassing jets", () => {
    for (const c of COMETS) {
      const p = powerOf(c);
      expect(p.comet).toBe(true);
      expect(p.spec.weapons).toContain("chorro");
      expect(p.volatileFraction).toBeGreaterThan(0.05);
      expect(p.tier).toBe(3);
    }
    expect(powerOf(BENNU).spec.weapons).not.toContain("chorro");
  });
});
