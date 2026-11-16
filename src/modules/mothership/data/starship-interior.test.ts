import { describe, expect, it } from "vitest";
import { INTERACTABLE_SPACING } from "@core/spacing";
import { StationInterior } from "@modules/station/domain/interior";
import { planMinSpacing, presentInteriorPlan, spreadInteriorPlan } from "@modules/station/domain/presentation";
import { HopGraph } from "@modules/gravity/domain/hops";
import { RailGraph } from "@modules/gravity/domain/handrails";
import { stationHandrails, stationPortals } from "@modules/station/data/handrails";
import { HULL_INNER_RADIUS_M, starshipDeckVolumeM3, starshipInteriorPlan } from "./starship-interior";

describe("HAB-23 Starship's interior, «distribución nuestra», at true size", () => {
  const plan = starshipInteriorPlan();

  it("fits inside the real 614 m³ and the 9 m hull: three decks and the flight deck", () => {
    expect(starshipDeckVolumeM3()).toBeLessThanOrEqual(614);
    expect(starshipDeckVolumeM3()).toBeGreaterThan(400);
    for (const v of plan.volumes.filter((x) => x.kind !== "escotilla")) {
      // The aisle and a 0,86 m rack on each wall fit in the round deck.
      expect(Math.hypot(v.half.x + 0.86, v.half.z)).toBeLessThanOrEqual(HULL_INNER_RADIUS_M + 1e-9);
    }
  });

  it("has what a long crewed flight needs: galley, four ~2 m³ quarters, hygiene, T2, ARED, CEVIS, work, stowage, airlock", () => {
    const ids = plan.fixtures.map((f) => f.id);
    for (const id of ["cocina", "camarotes", "aseo", "t2", "ared", "cevis", "puesto-trabajo", "almacen", "esclusa", "esterilla"]) expect(ids).toContain(id);
    const cq = plan.fixtures.find((f) => f.id === "camarotes")!;
    const each = (cq.size.x * cq.size.y * cq.size.z) / 4;
    expect(each).toBeGreaterThan(1.8);
    expect(each).toBeLessThan(2.4);
  });

  it("connects the decks through hatches and the docking hatches lead to the lander and the station", () => {
    const interior = new StationInterior(plan);
    expect(plan.fixtures.filter((f) => f.action.kind === "puerta")).toHaveLength(4);
    expect(plan.fixtures.filter((f) => f.action.kind === "salir").map((f) => (f.action as { to: string }).to).sort()).toEqual(["nodriza", "sonda"]);
    for (const e of Object.values(plan.entries)) expect(interior.volumeAt(e.at)?.kind).toBe("habitat");
  });

  it("at true size a 2,6 m deck brings floor and ceiling within reach; «Separación: Amplia» spreads it to 2 m at any scale", () => {
    expect(planMinSpacing(plan)).toBeLessThan(INTERACTABLE_SPACING.minM);
    expect(planMinSpacing(plan)).toBeGreaterThan(1);
    for (const scale of [1, 1.5]) {
      const shown = presentInteriorPlan(plan, { scale, spreadM: INTERACTABLE_SPACING.minM });
      expect(planMinSpacing(shown)).toBeGreaterThanOrEqual(INTERACTABLE_SPACING.minM - 1e-9);
    }
  });

  it("the spacing spreads a crowded plan generically: rooms longer, machines their true size", () => {
    const crowded = { ...plan, fixtures: plan.fixtures.map((f) => (f.id === "esterilla" ? { ...f, at: f.at.add(f.at.sub(plan.fixtures.find((x) => x.id === "cocina")!.at).scale(-0.7)) } : f)) };
    expect(planMinSpacing(crowded)).toBeLessThan(2);
    const spread = spreadInteriorPlan(crowded, 2);
    expect(planMinSpacing(spread)).toBeGreaterThanOrEqual(2 - 1e-9);
    const deck = (p: typeof plan) => p.volumes.find((v) => v.id === "cubierta-1")!.half.x;
    expect(deck(spread)).toBeGreaterThan(deck(crowded));
    expect(spread.fixtures.find((f) => f.id === "cocina")!.size).toEqual(crowded.fixtures.find((f) => f.id === "cocina")!.size);
  });

  it("every machine and hatch is reached by hops between the handholds, deck to deck through the floor hatches, at every presentation", () => {
    for (const scale of [1, 1.5])
      for (const spreadM of [0, INTERACTABLE_SPACING.minM]) {
        const shown = presentInteriorPlan(plan, { scale, spreadM });
        const room = new StationInterior(shown);
        const g = new HopGraph(new RailGraph(stationHandrails(shown)), (q) => room.fits(q, 0.3, false), stationPortals(shown));
        const from = g.poiPoint("salir-modulo")!;
        const reach = g.reachable(from);
        const missing = g.pois().filter((p) => !reach.has(p.id)).map((p) => p.poi);
        expect(missing, `${scale}× ${spreadM} m`).toEqual([]);
        expect(g.route(from, g.poiPoint("cocina")!.id)?.some((e) => e.hatch)).toBe(true);
      }
  });
});
