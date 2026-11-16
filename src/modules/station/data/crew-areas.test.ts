import { describe, expect, it } from "vitest";
import { MACHINE_SCALE } from "@core/machine-scale";
import { spacingViolations } from "@core/spacing";
import { RailGraph } from "@modules/gravity/domain/handrails";
import { HopGraph } from "@modules/gravity/domain/hops";
import { StationInterior, scaleInteriorPlan } from "../domain/interior";
import { stationHandrails, stationPortals } from "./handrails";
import { POLANA_INTERIOR, stationInteriorPlan } from "./interior";
import { MOD_AXIOM_HAB, MOD_HAVEN2, startingOutfit } from "./outfit";
import { stationInteractables, stationPlayScale } from "./presentation";

const PLAY = scaleInteriorPlan(POLANA_INTERIOR, MACHINE_SCALE);

describe("EST-20 the station's crew areas", () => {
  it("has its own galley, cabins, hygiene, exercise and yoga mat", () => {
    const areas = POLANA_INTERIOR.fixtures.flatMap((f) => (f.action.kind === "tripulacion" ? [f.action.area] : []));
    expect(new Set(areas)).toEqual(new Set(["cocina", "camarotes", "aseo", "ejercicio", "esterilla"]));
    for (const f of POLANA_INTERIOR.fixtures.filter((x) => x.action.kind === "tripulacion")) expect(f.source, f.id).toBeTruthy();
  });

  it("drawn at MACHINE_SCALE, every pair of interactables is at least 2 m apart (centres and grab bars; a door is one thing from both sides)", () => {
    expect(spacingViolations(stationInteractables(PLAY))).toEqual([]);
  });

  it("the grown station (Haven-2 and Axiom's module on Tranquility) keeps the 2 m too", () => {
    const o = startingOutfit();
    for (const spec of [MOD_HAVEN2, MOD_AXIOM_HAB]) {
      o.claimModule(spec);
      o.completeModule(spec);
    }
    const plan = scaleInteriorPlan(stationInteriorPlan(o.layout, o), MACHINE_SCALE);
    expect(spacingViolations(stationInteractables(plan))).toEqual([]);
  });

  it("EST-20 the ISS stays true to size in the data; «Amplia» spreads it as a whole only when it needs to", () => {
    // At 1,5× it needs no spreading; drawn 1:1 («Real») with «Amplia», it is drawn bigger until the 2 m hold.
    expect(stationPlayScale(POLANA_INTERIOR, 1.5, true)).toBe(1.5);
    const k = stationPlayScale(POLANA_INTERIOR, 1, true);
    expect(k).toBeGreaterThan(1);
    expect(spacingViolations(stationInteractables(scaleInteriorPlan(POLANA_INTERIOR, k)))).toEqual([]);
    expect(stationPlayScale(POLANA_INTERIOR, 1, false)).toBe(1);
  });

  it("scaling keeps every landing point reachable from the lander's hatch (unsuited)", () => {
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

  it("Quest's hatch to Unity says why it is shut while the airlock is empty, and what opens it", () => {
    const inner = doors.find((d) => d.action.kind === "puerta" && d.action.to === "nodo-1" && d.volume === "quest")!;
    expect(interior.doorLock(inner, true)).toMatch(/Llénala/);
    expect(interior.doorLock(inner, false)).toBeUndefined();
    // No hangar behind an outer hatch any more: the EVA hatch is information (EVA is in docs/pendientes.md).
    expect(doors.some((d) => d.action.kind === "puerta" && d.action.to === "hangar")).toBe(false);
  });

  it("each door has its grab point by the hatch", () => {
    const rails = stationHandrails(PLAY);
    for (const d of PLAY.fixtures.filter((f) => f.action.kind === "puerta")) expect(rails.some((r) => r.poi === d.id), d.id).toBe(true);
  });
});
