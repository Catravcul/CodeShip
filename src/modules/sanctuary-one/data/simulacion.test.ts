import { describe, expect, it } from "vitest";
import { FLOOR_PLANS } from "./floors";
import { MOTIONS, PROCEDURE_STEPS } from "./animaciones";
import { MICROCOSMOS, SIM_RETOS, SIM_SPOTS, SIM_TANK } from "./simulacion";
import { model } from "./catalog";
import { realism } from "./realismo";

describe("la máquina de simulación y los retos de área (Berón 2026-11-23)", () => {
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
  it("una sola gran pecera, la de Cold Sanctuary a lo grande: 9 m de lado, 4 m de agua, una máscara por plaza; su campo, ficción", () => {
    expect(SIM_TANK.half * 2).toBe(9);
    expect(SIM_TANK.water).toBe(4);
    expect(SIM_SPOTS).toHaveLength(SIM_TANK.places - 1);
    for (const s of SIM_SPOTS) expect(Math.hypot(s.x, s.z)).toBeLessThan(SIM_TANK.half - 1);
    const d = model("simulador");
    expect(d.reality).toBe("ficcion");
    expect(realism(d).score).toBeGreaterThanOrEqual(80);
    expect(realism(d).floating).toBe(0);
  });
  it("una sola máquina en todo el santuario, en Informática, y lleva a todos los microcosmos (Berón 2026-11-24)", () => {
    expect(MICROCOSMOS.map((m) => m.id)).toContain("academia-platon");
    const all = [...FLOOR_PLANS].flatMap(([id, p]) => p.items.filter((i) => i.model === "simulador").map(() => id));
    expect(all).toEqual(["informatica"]);
  });
});
