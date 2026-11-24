import { describe, expect, it } from "vitest";
import { FLOOR_PLANS } from "./floors";
import { TOWERS } from "./site";
import { MOTIONS, PROCEDURE_STEPS } from "./animaciones";
import { MICROCOSMOS, SIM_RETOS, SIM_TANK } from "./simulacion";
import { model } from "./catalog";
import { realism } from "./realismo";

describe("la máquina de simulación y los retos de área (Berón 2026-11-23)", () => {
  const furnished = new Set(TOWERS.flatMap((t) => t.floors.map((f) => f.furnish)));
  it("cada piso con retos de área tiene su máquina, y la asamblea la suya (la puerta al microcosmos)", () => {
    for (const id of [...Object.keys(SIM_RETOS), "asambleas-guardia"]) {
      expect(furnished.has(id), id).toBe(true);
      expect(FLOOR_PLANS.get(id)!.items.filter((i) => i.model === "simulador"), id).toHaveLength(1);
    }
  });
  it("cada papel tiene dónde estar: su objeto en el piso, tantos como papeles lo piden; y el de ella también", () => {
    for (const [floor, list] of Object.entries(SIM_RETOS))
      for (const sr of list) {
        const items = FLOOR_PLANS.get(floor)!.items;
        expect(items.some((i) => i.model === sr.player), `${floor}: ${sr.player}`).toBe(true);
        const need = new Map<string, number>();
        for (const r of sr.roles) if (r.model) need.set(r.model, (need.get(r.model) ?? 0) + 1);
        for (const [m, n] of need) expect(items.filter((i) => i.model === m).length, `${floor}: ${m}`).toBeGreaterThanOrEqual(n);
        for (const r of sr.roles) expect(!!r.model !== !!r.front, r.label).toBe(true);
      }
  });
  it("cada paso de ella tiene su animación y cada papel la suya, del catálogo", () => {
    for (const list of Object.values(SIM_RETOS))
      for (const sr of list) {
        expect(PROCEDURE_STEPS[sr.procedure.id]?.length, sr.procedure.id).toBe(sr.procedure.steps.length);
        for (const r of sr.roles) expect(Object.keys(MOTIONS), r.label).toContain(r.motion);
        expect(sr.procedure.source.length).toBeGreaterThan(10);
      }
  });
  it("la máquina es la de Cold Sanctuary: 1,8 m de lado, 2,4 m de agua, zócalo de 0,25 m; su campo, marcado como ficción", () => {
    expect(SIM_TANK.half * 2).toBeCloseTo(1.8);
    expect(SIM_TANK.water).toBe(2.4);
    expect(SIM_TANK.base).toBe(0.25);
    const d = model("simulador");
    expect(d.reality).toBe("ficcion");
    expect(realism(d).score).toBeGreaterThanOrEqual(80);
    expect(realism(d).floating).toBe(0);
  });
  it("every machine takes her to every microcosm, and every floor has its machine (Berón 2026-11-24)", () => {
    expect(MICROCOSMOS.map((m) => m.id)).toContain("academia-platon");
    for (const [id, p] of FLOOR_PLANS) expect(p.items.filter((i) => i.model === "simulador").length, id).toBe(1);
  });
});
