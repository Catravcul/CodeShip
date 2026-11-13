import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { RailGraph } from "@modules/gravity/domain/handrails";
import { holdAt, ivaStep, startAt, type IvaState, type IvaWorld } from "@modules/gravity/domain/iva";
import { StationInterior } from "../domain/interior";
import { HopGraph } from "@modules/gravity/domain/hops";
import { stationHandrails, stationPortals } from "./handrails";
import { POLANA_INTERIOR, stationInteriorPlan } from "./interior";
import { MOD_FAB2, MOD_FARM, MOD_PLANT, startingOutfit } from "./outfit";

const interior = new StationInterior(POLANA_INTERIOR);
const rails = stationHandrails(POLANA_INTERIOR);
const graph = new RailGraph(rails);

describe("station handrails", () => {
  it("every module and the hangar has rails", () => {
    for (const v of POLANA_INTERIOR.volumes.filter((x) => x.kind !== "escotilla")) expect(rails.some((r) => r.id.startsWith(`${v.id}:`)), v.id).toBe(true);
  });

  it("she fits wherever she holds a rail", () => {
    for (const r of rails) {
      const b = holdAt(graph, r.id, 0.5).body;
      expect(interior.fits(b, 0.3, false) || interior.fits(b, 0.3, true), r.id).toBe(true);
    }
  });

  it("a row of bars down an aisle can be followed hand over hand", () => {
    const row = rails.filter((r) => r.id.startsWith("fabrica:ib"));
    expect(row.length).toBeGreaterThan(4);
    for (let i = 1; i < row.length; i++) expect(graph.neighbours(row[i - 1]!.id)).toContain(row[i]!.id);
  });

  it("coming in from the probe she takes a rail by the hatch, then can fly down node 2", () => {
    const world: IvaWorld = { graph, fits: (p) => interior.fits(p, 0.3, false) };
    let s: IvaState = startAt(graph, POLANA_INTERIOR.entries.sonda.at);
    expect(s.motion.kind === "sujeta" && s.motion.rail.startsWith("salir-sonda")).toBe(true);
    s = ivaStep(s, { push: { dir: new Vec3(0, 0, 1), strength: "suave" } }, world, 1 / 60).state;
    expect(s.motion.kind).toBe("impulso");
    for (let i = 0; i < 60 * 60 && s.motion.kind !== "sujeta"; i++) s = ivaStep(s, {}, world, 1 / 60).state;
    expect(s.motion.kind).toBe("sujeta");
    expect(s.position.z).toBeGreaterThan(POLANA_INTERIOR.entries.sonda.at.z + 1);
  });

  it("modules added as the station grows get their rails too", () => {
    const o = startingOutfit();
    for (const spec of [MOD_FAB2, MOD_PLANT, MOD_FARM]) {
      o.claimModule(spec);
      o.completeModule(spec);
    }
    const plan = stationInteriorPlan(o.layout, o);
    const grown = stationHandrails(plan);
    const corridors = plan.volumes.filter((v) => v.kind !== "escotilla" && v.kind !== "hangar");
    expect(corridors.length).toBeGreaterThan(POLANA_INTERIOR.volumes.filter((v) => v.kind !== "escotilla" && v.kind !== "hangar").length);
    for (const v of corridors) expect(grown.filter((r) => r.id.startsWith(`${v.id}:`)).length, v.id).toBeGreaterThanOrEqual(4);
  });

  it("each work station has its own bar, in front of it", () => {
    for (const f of POLANA_INTERIOR.fixtures.filter((x) => x.action.kind === "panel" && POLANA_INTERIOR.volumes.find((v) => v.id === x.volume)?.kind !== "hangar"))
      expect(rails.some((r) => r.id === `${f.id}:puesto`), f.id).toBe(true);
  });
});

describe("ING-03 hopping with the arrows through the station", () => {
  const hopsFor = (plan: typeof POLANA_INTERIOR, suited: boolean) => {
    const inside = new StationInterior(plan);
    return new HopGraph(new RailGraph(stationHandrails(plan)), (p) => inside.fits(p, 0.3, suited), stationPortals(plan));
  };

  it("unsuited, every landing point of the pressurised modules is reachable from the probe's hatch: nobody gets stranded", () => {
    const g = hopsFor(POLANA_INTERIOR, false);
    const start = g.nearest(POLANA_INTERIOR.entries.sonda.at)!;
    const reach = g.reachable(start);
    // The hangar is behind the airlock's outer hatch: only suited.
    expect(reach.size).toBe(g.points.filter((p) => !p.id.startsWith("hangar:")).length);
    // Through every CBM hatch: points in node 2, the habitat, node 1, fabrication and the airlock.
    for (const id of ["nodo-2", "habitat", "nodo-1", "fabrica", "esclusa"]) expect([...reach].some((r) => r.startsWith(`${id}:`)), id).toBe(true);
  });

  it("suited, the hangar is reachable from the airlock", () => {
    const g = hopsFor(POLANA_INTERIOR, true);
    const lock = g.points.find((p) => p.id.startsWith("esclusa:"))!;
    expect([...g.reachable(lock)].some((r) => r.startsWith("hangar:"))).toBe(true);
  });

  it("modules added as the station grows are reachable too", () => {
    const o = startingOutfit();
    for (const spec of [MOD_FAB2, MOD_PLANT, MOD_FARM]) {
      o.claimModule(spec);
      o.completeModule(spec);
    }
    const plan = stationInteriorPlan(o.layout, o);
    const g = hopsFor(plan, false);
    expect(g.reachable(g.nearest(plan.entries.sonda.at)!).size).toBe(g.points.filter((p) => !p.id.startsWith("hangar:")).length);
  });
});
