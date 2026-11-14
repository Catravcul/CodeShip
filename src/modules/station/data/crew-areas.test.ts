import { describe, expect, it } from "vitest";
import { MACHINE_SCALE } from "@core/machine-scale";
import { spacingViolations, type Interactable } from "@core/spacing";
import { RailGraph } from "@modules/gravity/domain/handrails";
import { HopGraph } from "@modules/gravity/domain/hops";
import { StationInterior, scaleInteriorPlan, type StationInteriorPlan } from "../domain/interior";
import { stationHandrails, stationPortals } from "./handrails";
import { POLANA_INTERIOR, stationInteriorPlan } from "./interior";
import { MOD_FAB2, MOD_FARM, MOD_PLANT, startingOutfit } from "./outfit";

const PLAY = scaleInteriorPlan(POLANA_INTERIOR, MACHINE_SCALE);

/** Things one can use, with the bar she holds to get their button (docs/design/estacion-tripulacion.md). */
/** Two sides of one hatch are one door: only the one on her side can show its button. */
const sameHatch = (plan: StationInteriorPlan) => (v: { a: string; b: string }) => {
  const hatch = (id: string) => {
    const a = plan.fixtures.find((f) => f.id === id)?.action;
    return a?.kind === "puerta" ? a.hatch : undefined;
  };
  return !hatch(v.a) || hatch(v.a) !== hatch(v.b);
};

function interactables(plan: StationInteriorPlan): Interactable[] {
  const rails = stationHandrails(plan);
  return plan.fixtures.flatMap((f) => {
    const r = rails.find((x) => x.poi === f.id);
    return r ? [{ id: f.id, centre: f.at, anchor: r.a.add(r.b).scale(0.5) }] : [];
  });
}

describe("EST-20 the station's crew areas", () => {
  it("has its own galley, cabins, hygiene, exercise and yoga mat", () => {
    const areas = POLANA_INTERIOR.fixtures.flatMap((f) => (f.action.kind === "tripulacion" ? [f.action.area] : []));
    expect(new Set(areas)).toEqual(new Set(["cocina", "camarotes", "aseo", "ejercicio", "esterilla"]));
    for (const f of POLANA_INTERIOR.fixtures.filter((x) => x.action.kind === "tripulacion")) expect(f.source, f.id).toBeTruthy();
  });

  it("drawn at MACHINE_SCALE, every pair of interactables is at least 2 m apart (centres and grab bars)", () => {
    expect(spacingViolations(interactables(PLAY)).filter(sameHatch(PLAY))).toEqual([]);
  });

  it("the grown station keeps the 2 m too", () => {
    const o = startingOutfit();
    for (const spec of [MOD_FAB2, MOD_PLANT, MOD_FARM]) {
      o.claimModule(spec);
      o.completeModule(spec);
    }
    const plan = scaleInteriorPlan(stationInteriorPlan(o.layout, o), MACHINE_SCALE);
    expect(spacingViolations(interactables(plan)).filter(sameHatch(plan))).toEqual([]);
  });

  it("scaling keeps every landing point reachable from the lander's hatch (unsuited, outside the hangar)", () => {
    const inside = new StationInterior(PLAY);
    const g = new HopGraph(new RailGraph(stationHandrails(PLAY)), (p) => inside.fits(p, 0.3, false), stationPortals(PLAY));
    const reach = g.reachable(g.nearest(PLAY.entries.sonda.at)!);
    expect(reach.size).toBe(g.points.filter((p) => inside.volumeAt(p.body)?.kind !== "hangar").length);
    for (const f of PLAY.fixtures.filter((x) => x.action.kind === "tripulacion")) expect(g.poiPoint(f.id), f.id).toBeDefined();
  });
});

describe("EST-21 doors say where they lead", () => {
  const interior = new StationInterior(POLANA_INTERIOR);
  const doors = POLANA_INTERIOR.fixtures.filter((f) => f.action.kind === "puerta");

  it("every hatch between two areas is a door on each side, named after the other side", () => {
    const hatches = POLANA_INTERIOR.volumes.filter((v) => v.kind === "escotilla" && !v.id.startsWith("tunel"));
    expect(doors.length).toBe(2 * hatches.length);
    for (const d of doors) {
      const to = d.action.kind === "puerta" ? interior.volume(d.action.to)! : undefined;
      expect(d.label, d.id).toBe(`Escotilla · ${to!.label}`);
      expect(d.label).not.toMatch(/\?/);
    }
  });

  it("the airlock's hatches say why they are shut and what opens them", () => {
    const outer = doors.find((d) => d.action.kind === "puerta" && d.action.to === "hangar")!;
    const inner = doors.find((d) => d.action.kind === "puerta" && d.action.to === "fabrica" && d.volume === "esclusa")!;
    expect(interior.doorLock(outer, false)).toMatch(/traje/);
    expect(interior.doorLock(outer, true)).toBeUndefined();
    expect(interior.doorLock(inner, true)).toMatch(/Llénala/);
    expect(interior.doorLock(inner, false)).toBeUndefined();
  });

  it("each door has its grab point by the hatch", () => {
    const rails = stationHandrails(PLAY);
    for (const d of PLAY.fixtures.filter((f) => f.action.kind === "puerta")) expect(rails.some((r) => r.poi === d.id), d.id).toBe(true);
  });
});
