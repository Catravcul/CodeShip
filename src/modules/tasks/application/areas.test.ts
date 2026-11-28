import { describe, expect, it } from "vitest";
import { StationInterior } from "@modules/station/domain/interior";
import { stationInteriorPlan } from "@modules/station/data/interior";
import { starshipInteriorPlan } from "@modules/mothership/data/starship-interior";
import { shipPointOf } from "./journey-world";
import { landerAreas, interiorAreas, scopeOfNode, starshipAreas } from "./areas";
import { stationPointOf } from "./journey-world";

describe("Áreas: the schematic of a vehicle (HAB-42)", () => {
  const st = new StationInterior(stationInteriorPlan());
  const map = interiorAreas("estacion", st, "estacion", (id) => !!stationPointOf(st, id));
  it("HAB-42 every node of the station is a compartment with a place of the journey graph, joined by its hatches", () => {
    expect(map.nodes.length).toBeGreaterThan(5);
    for (const n of map.nodes) expect(n.goal).toBe(`estacion:${n.fixture}`);
    expect(map.nodes.map((n) => n.label).join(" ")).toMatch(/Harmony/);
    // Each a box of the real plan, with a line on what is there, for the 3D map and the list under it.
    for (const n of map.nodes) {
      expect(n.desc.length).toBeGreaterThan(3);
      expect(n.half.x > 0 && n.half.y > 0 && n.half.z > 0).toBe(true);
    }
    expect(map.links.length).toBeGreaterThanOrEqual(map.nodes.length - 1);
    for (const [a, b] of map.links) expect(map.nodes.some((n) => n.id === a) && map.nodes.some((n) => n.id === b)).toBe(true);
  });
  it("HAB-42 Starship: its three decks top to bottom and the flight deck above them, through the ceiling hatch", () => {
    const ship = new StationInterior(starshipInteriorPlan());
    const m = starshipAreas(ship, (id) => !!shipPointOf(ship, id));
    expect(m.nodes[0]).toMatchObject({ id: "cubierta-vuelo", goal: "puente:nav" });
    const decks = m.nodes.filter((n) => /Cubierta \d/.test(n.label));
    expect(decks.length).toBe(3);
    expect([...decks].sort((a, b) => b.centre.y - a.centre.y).map((n) => n.label.match(/Cubierta \d/)![0])).toEqual(["Cubierta 1", "Cubierta 2", "Cubierta 3"]);
    for (const n of m.nodes.slice(1)) expect(n.goal).toBe(`nave:${n.fixture}`);
    expect(m.nodes[0]!.centre.y).toBeGreaterThan(Math.max(...decks.map((n) => n.centre.y + n.half.y)));
    expect(m.links.some(([a]) => a === "cubierta-vuelo")).toBe(true);
  });
  it("HAB-42 the LM's stations are its areas, each a few steps from the docking hatch", () => {
    const lm = landerAreas([
      { id: "asiento", label: "Puesto del comandante", what: "Pilotar", stand: { x: -0.6, z: 0.2 } },
      { id: "acople", label: "Escotilla de acople", what: "Desacoplar", stand: { x: 0, z: 0.7 } },
      { id: "ecs", label: "Panel del ECS", what: "O₂ y CO₂", stand: { x: -0.6, z: 1.2 } },
    ]);
    expect(lm.nodes.map((n) => n.goal)).toEqual(["modulo:asiento", "modulo:acople", "modulo:ecs"]);
    expect(lm.nodes[2]).toMatchObject({ desc: "O₂ y CO₂", centre: { x: -0.6, z: 1.2 } });
    expect(lm.links).toEqual([
      ["acople", "asiento"],
      ["acople", "ecs"],
    ]);
  });
  it("HAB-42 the shared scope (Berón 2026-11-19): the station's compartments belong to the module they open onto", () => {
    expect(map.scopes?.map((g) => g.kind)).toEqual(["modulo"]);
    const of = (id: string) => map.nodes.find((n) => n.id === id)?.scope?.modulo;
    expect(of("nodo-2")).toBe("nodo-2");
    expect(of("camarote-1")).toBe("nodo-2");
    const opts = map.scopes![0]!.options.map((o) => o.id);
    expect(opts).toContain("nodo-2");
    expect(opts).not.toContain("camarote-1");
    // «Automático»: the module of the compartment she is in.
    expect(scopeOfNode(map, "camarote-1")).toEqual({ kind: "modulo", id: "nodo-2" });
    expect(scopeOfNode(map, "nada")).toBeUndefined();
  });
  it("HAB-42 Starship: vehicle → deck → compartment; the cabins are on deck 2, the flight deck its own", () => {
    const ship = new StationInterior(starshipInteriorPlan());
    const m = starshipAreas(ship, (id) => !!shipPointOf(ship, id));
    expect(m.scopes?.[0]).toMatchObject({ kind: "cubierta", label: "Cubiertas" });
    expect(m.scopes![0]!.options.map((o) => o.id)).toEqual(["cubierta-vuelo", "cubierta-1", "cubierta-2", "cubierta-3"]);
    for (const n of m.nodes.filter((q) => q.id.startsWith("camarote"))) expect(n.scope?.cubierta).toBe("cubierta-2");
    expect(m.nodes.find((n) => n.id === "cubierta-vuelo")?.scope?.cubierta).toBe("cubierta-vuelo");
  });
});
