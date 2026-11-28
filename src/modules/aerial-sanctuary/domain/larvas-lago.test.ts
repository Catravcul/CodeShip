import { describe, expect, it } from "vitest";
import { LAKE_LARVAE } from "../data/larvas-lago";
import { cycleDays, larvaeCensus, larvaPose, stageAt, type LakeFrame } from "./larvas-lago";

const lake: LakeFrame = { x: 0, z: 0, floorY: 100, lakeTop: 104, r0: 40, r1: 90, keepOut: [{ x0: 30, x1: 60, z0: -15, z1: 15 }] };
const spec = (id: string) => LAKE_LARVAE.find((s) => s.id === id)!;

describe("las larvas del lago de la pirámide viven su ciclo real", () => {
  it("las libélulas y las efímeras sin pupa (incompleta); los tricópteros y los quironómidos con pupa (completa)", () => {
    for (const s of LAKE_LARVAE) {
      const stages = s.stages.map((x) => x.stage);
      expect(stages[0], s.id).toBe("huevo");
      expect(stages.at(-1), s.id).toBe("emergencia");
      expect(stages.includes("pupa"), s.id).toBe(s.metamorphosis === "completa");
      expect(stages.includes("ninfa"), s.id).toBe(s.metamorphosis === "incompleta");
      expect(s.source.length).toBeGreaterThan(40);
    }
    // The dragonfly's nymph grows in 38–65 days (its source); the mayfly's subimago is its own stage.
    const n = spec("libelula").stages.find((x) => x.stage === "ninfa")!.days;
    expect(n).toBeGreaterThanOrEqual(38);
    expect(n).toBeLessThanOrEqual(65);
    expect(spec("efimera").stages.some((x) => x.stage === "subimago")).toBe(true);
  });

  it("crece sin saltos dentro de su etapa y vuelve a empezar con un huevo", () => {
    const s = spec("tricoptero");
    let last = stageAt(s, 15.01).grown;
    for (let d = 15.01; d < 15 + 120 - 0.01; d += 0.5) {
      const g = stageAt(s, d).grown;
      expect(g).toBeGreaterThanOrEqual(last);
      last = g;
    }
    expect(stageAt(s, cycleDays(s) + 1).stage).toBe("huevo");
  });

  it("viven en el fondo, dentro del lago y lejos de lo que está en pie; al emerger suben a la superficie", () => {
    for (const s of LAKE_LARVAE)
      for (let i = 0; i < s.drawn; i++)
        for (const day of [0, 7, 30, 61, 100]) {
          const p = larvaPose(s, i, day, day * 3, lake, s.size.z * 400);
          const r = Math.hypot(p.x, p.z);
          expect(r, s.id).toBeLessThan(lake.r1 + s.size.z * 400 * 2);
          expect(p.x > 30 - 2 && p.x < 60 + 2 && Math.abs(p.z) < 17, `${s.id} bajo el tronco`).toBe(false);
          if (p.stage !== "emergencia" && p.stage !== "subimago" && !(s.id === "quironomido" && p.stage === "pupa")) expect(p.y).toBeLessThan(lake.floorY + 0.1);
        }
    const out = larvaPose(spec("libelula"), 0, 55.9, 0, lake, 10);
    expect(out.stage).toBe("emergencia");
    expect(out.y).toBeGreaterThan(lake.lakeTop);
  });

  it("todas las etapas se ven a la vez: las que se dibujan se reparten por el ciclo", () => {
    for (const s of LAKE_LARVAE) {
      const seen = new Set(Array.from({ length: s.drawn }, (_, i) => larvaPose(s, i, 0, 0, lake, 1).stage));
      expect(seen.size, s.id).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("larvaeCensus (the hall's census board: the lake's larvae by stage)", () => {
  it("counts every drawn larva of a species once, by its stage now, in the order of its cycle", () => {
    for (const s of LAKE_LARVAE) {
      const rows = larvaeCensus(s, 37);
      expect(rows.reduce((t, r) => t + r.n, 0)).toBe(s.drawn);
      const order = s.stages.map((x) => x.stage);
      expect(rows.map((r) => order.indexOf(r.stage))).toEqual([...rows.map((r) => order.indexOf(r.stage))].sort((a, b) => a - b));
      for (const r of rows) expect(r.n).toBeGreaterThan(0);
    }
  });
});
