import { describe, expect, it } from "vitest";
import { MACHINE_SCALE } from "@core/machine-scale";
import { RailGraph } from "@modules/gravity/domain/handrails";
import { HopGraph } from "@modules/gravity/domain/hops";
import { rackSpec } from "@modules/life-support/data/eclss-machines";
import { StationInterior, scaleInteriorPlan } from "../domain/interior";
import { stationHandrails, stationPortals } from "./handrails";
import { POLANA_INTERIOR } from "./interior";

const PLAY = scaleInteriorPlan(POLANA_INTERIOR, MACHINE_SCALE);
const racks = POLANA_INTERIOR.fixtures.filter((f) => f.action.kind === "soporte-vital");

describe("SV-11 the life-support racks in the station", () => {
  it("node 2 carries the air, oxygen, water and coolant racks, the laptop and the fire post", () => {
    expect(racks.map((f) => f.id).sort()).toEqual(["sv-ar", "sv-consola", "sv-incendios", "sv-itcs", "sv-ogs", "sv-wrs"]);
    for (const f of racks) expect(f.volume).toBe("nodo-2");
  });

  it("their fixtures are real size (an ISPR rack is 2,0 m high); the drawing scales them", () => {
    const ar = racks.find((f) => f.id === "sv-ar")!;
    expect(ar.size.y).toBe(rackSpec("ar").size.h);
    expect(PLAY.fixtures.find((f) => f.id === "sv-ar")!.size.y).toBeCloseTo(rackSpec("ar").size.h * MACHINE_SCALE);
  });

  it("each one has its grab bar and she can hop to it from the lander's hatch", () => {
    const inside = new StationInterior(PLAY);
    const g = new HopGraph(new RailGraph(stationHandrails(PLAY)), (p) => inside.fits(p, 0.3, false), stationPortals(PLAY));
    const reach = g.reachable(g.nearest(PLAY.entries.sonda.at)!);
    for (const f of racks) {
      const q = g.poiPoint(f.id);
      expect(q, f.id).toBeDefined();
      expect(reach.has(q!.id), f.id).toBe(true);
    }
  }, 30000);
});
