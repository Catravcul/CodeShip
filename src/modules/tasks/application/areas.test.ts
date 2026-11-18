import { describe, expect, it } from "vitest";
import { StationInterior } from "@modules/station/domain/interior";
import { stationInteriorPlan } from "@modules/station/data/interior";
import { starshipInteriorPlan } from "@modules/mothership/data/starship-interior";
import { shipPointOf } from "./journey-world";
import { landerAreas, interiorAreas, starshipAreas } from "./areas";
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
});
