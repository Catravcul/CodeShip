import { describe, expect, it } from "vitest";
import { MACHINE_SCALE } from "@core/machine-scale";
import { RailGraph } from "@modules/gravity/domain/handrails";
import { HopGraph } from "@modules/gravity/domain/hops";
import { starshipInteriorPlan } from "@modules/mothership/data/starship-interior";
import { presentInteriorPlan } from "../domain/presentation";
import { StationInterior, scaleInteriorPlan, type StationInteriorPlan } from "../domain/interior";
import { crewQuarterVolumeM3, OWN_BUNK } from "./compartments";
import { stationHandrails, stationPortals } from "./handrails";
import { POLANA_INTERIOR } from "./interior";
import { issModule } from "./iss";

/** Fixtures that are a hatch, a door or a port (their id or what they do). */
const isDoor = (id: string, kind: string) => kind === "puerta" || kind === "salir" || /^(escotilla|esclusa-kibo|cbm-|pma|puerto-)/.test(id);

const reachable = (plan: StationInteriorPlan, from: string) => {
  const inside = new StationInterior(plan);
  const g = new HopGraph(new RailGraph(stationHandrails(plan)), (p) => inside.fits(p, 0.3, false), stationPortals(plan));
  const start = g.poiPoint(from)!;
  const reach = g.reachable(start);
  return { g, inside, reach, start };
};

describe("EST-51 every real compartment of the station is a room she floats into; doors only give passage", () => {
  const plan = POLANA_INTERIOR;

  it("the four crew quarters of Harmony (2,1 m³ each, one per face), the Cupola and the Bishop are rooms with an opening", () => {
    const rooms = plan.volumes.filter((v) => v.kind === "compartimento");
    expect(rooms.map((v) => v.id)).toEqual(["camarote-1", "camarote-2", "camarote-3", "camarote-4", "cupola", "bishop"]);
    expect(crewQuarterVolumeM3()).toBeCloseTo(2.1, 6);
    for (const v of rooms) {
      expect(plan.volumes.find((x) => x.id === `paso-${v.id}`)?.kind, v.id).toBe("escotilla");
      expect(v.source, v.id).toMatch(/https?:\/\//);
    }
    const cq = rooms.filter((v) => v.id.startsWith("camarote"));
    for (const v of cq) expect(8 * v.half.x * v.half.y * v.half.z).toBeCloseTo(2.1, 6);
    // Inside the Cupola's 2,95 m circle and 1,5 m height.
    const cup = rooms.find((v) => v.id === "cupola")!;
    expect(2 * Math.hypot(cup.half.x, cup.half.z)).toBeLessThanOrEqual(issModule("cupula").diameterM + 1e-9);
    expect(2 * cup.half.y).toBeLessThanOrEqual(issModule("cupula").lengthM + 1e-9);
    // The Bishop's box fits in its 3,99 m³.
    const b = rooms.find((v) => v.id === "bishop")!;
    expect(8 * b.half.x * b.half.y * b.half.z).toBeLessThan(issModule("bishop").volumeM3);
  });

  it("no door, hatch or port opens anything but a way through (or says why it is shut)", () => {
    for (const f of plan.fixtures.filter((x) => isDoor(x.id, x.action.kind))) expect(["puerta", "salir", "info"], f.id).toContain(f.action.kind);
    // The old door-modals are gone: the crew quarters, the bay, the Bishop, the Cupola and the JEM-EF list.
    expect(plan.fixtures.find((f) => f.id === "camarotes")).toBeUndefined();
    expect(plan.fixtures.find((f) => f.id === "esclusa-kibo")!.action.kind).toBe("info");
  });

  it("management windows open from consoles in their compartment: the RWS in the Cupola, the bay laptop in Unity, the JEMRMS console and the species laptop in Kibo", () => {
    const at = (id: string) => plan.fixtures.find((f) => f.id === id)!;
    expect(at("cupula")).toMatchObject({ volume: "cupola", action: { kind: "brazo" } });
    expect(at("consola-bahia")).toMatchObject({ volume: "nodo-1", face: "babor", action: { kind: "bahia" } });
    expect(at("consola-jemrms")).toMatchObject({ volume: "kibo", action: { kind: "panel", panel: "hangar" } });
    expect(at("rack-catalogo")).toMatchObject({ volume: "kibo", action: { kind: "consola", id: "catalogo" } });
    expect(at("bishop")).toMatchObject({ volume: "bishop", action: { kind: "bishop" } });
  });

  it("EST-52 every window of the station's screen has its own console (the screen has no tab bar): imports at Unity's cargo laptop", () => {
    const inside = new StationInterior(plan);
    for (const w of ["materiales", "planos", "fabricacion", "hangar", "importar", "propelente"] as const) expect(inside.fixturesFor(w).length, w).toBeGreaterThan(0);
    expect(inside.fixturesFor("importar").map((f) => f.id)).toEqual(["consola-bahia"]);
    expect(inside.fixturesFor("hangar").map((f) => f.id)).toEqual(["consola-jemrms"]);
  });

  it("each crew quarter has its sleeping bag inside; hers is the first", () => {
    for (const i of [1, 2, 3, 4]) expect(plan.fixtures.find((f) => f.id === `saco-${i}`)).toMatchObject({ volume: `camarote-${i}`, action: { kind: "tripulacion", area: "camarotes" } });
    expect(OWN_BUNK).toBe("saco-1");
  });

  it("from the lander's hatch she hops into every compartment through its opening, at the played scale", () => {
    const shown = scaleInteriorPlan(plan, MACHINE_SCALE);
    const { g, reach, start } = reachable(shown, "salir-sonda");
    for (const id of ["saco-1", "saco-2", "saco-3", "saco-4", "cupula", "bishop"]) {
      expect(reach.has(g.poiPoint(id)!.id), id).toBe(true);
      expect(g.route(start, g.poiPoint(id)!.id)?.some((e) => e.hatch), id).toBe(true);
    }
  }, 20000);
});

describe("HAB-28 Starship's crew quarters are rooms too («distribución nuestra»)", () => {
  it("four 2,1 m³ quarters on deck 2, each with its bag, reached by hops at every presentation", () => {
    const plan = starshipInteriorPlan();
    const rooms = plan.volumes.filter((v) => v.kind === "compartimento");
    expect(rooms).toHaveLength(4);
    for (const v of rooms) expect(v.basis).toMatch(/[Dd]istribución nuestra/);
    for (const spreadM of [0, 2]) {
      const shown = presentInteriorPlan(plan, { scale: 1.5, spreadM });
      const { g, reach } = reachable(shown, "salir-modulo");
      for (const i of [1, 2, 3, 4]) expect(reach.has(g.poiPoint(`saco-${i}`)!.id), `saco-${i} ${spreadM}`).toBe(true);
    }
    for (const f of plan.fixtures.filter((x) => isDoor(x.id, x.action.kind))) expect(["puerta", "salir", "info"], f.id).toContain(f.action.kind);
  }, 20000);
});
