import { describe, expect, it } from "vitest";
import { StationInterior } from "@modules/station/domain/interior";
import { stationInteriorPlan } from "@modules/station/data/interior";
import { starshipInteriorPlan } from "@modules/mothership/data/starship-interior";
import { shipPointOf } from "./journey-world";
import { landerAreas, placeNodes, interiorAreas, starshipAreas, type AreaMap } from "./areas";
import { stationPointOf } from "./journey-world";

const overlap = (a: { left: number; top: number; width: number; height: number }, b: typeof a) => a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;

describe("Áreas: the schematic of a vehicle (HAB-42)", () => {
  const st = new StationInterior(stationInteriorPlan());
  const map = interiorAreas("estacion", st, "estacion", (id) => !!stationPointOf(st, id));
  it("HAB-42 every node of the station is a compartment with a place of the journey graph, joined by its hatches", () => {
    expect(map.nodes.length).toBeGreaterThan(5);
    for (const n of map.nodes) expect(n.goal).toBe(`estacion:${n.fixture}`);
    expect(map.nodes.map((n) => n.label).join(" ")).toMatch(/Harmony/);
    expect(map.links.length).toBeGreaterThanOrEqual(map.nodes.length - 1);
    for (const [a, b] of map.links) expect(map.nodes.some((n) => n.id === a) && map.nodes.some((n) => n.id === b)).toBe(true);
  });
  it("HAB-42 Starship: its three decks top to bottom and the flight deck above them, through the ceiling hatch", () => {
    const ship = new StationInterior(starshipInteriorPlan());
    const m = starshipAreas(ship, (id) => !!shipPointOf(ship, id));
    expect(m.nodes[0]).toMatchObject({ id: "cubierta-vuelo", goal: "puente:nav" });
    const decks = m.nodes.filter((n) => /Cubierta \d/.test(n.label));
    expect(decks.length).toBe(3);
    expect([...decks].sort((a, b) => a.y - b.y).map((n) => n.label.match(/Cubierta \d/)![0])).toEqual(["Cubierta 1", "Cubierta 2", "Cubierta 3"]);
    for (const n of m.nodes.slice(1)) expect(n.goal).toBe(`nave:${n.fixture}`);
    expect(m.links.some(([a]) => a === "cubierta-vuelo")).toBe(true);
  });
  it("HAB-42 the LM's stations are its areas, each a few steps from the docking hatch", () => {
    const lm = landerAreas([
      { id: "asiento", label: "Puesto del comandante", stand: { x: -0.6, z: 0.2 } },
      { id: "acople", label: "Escotilla de acople", stand: { x: 0, z: 0.7 } },
      { id: "ecs", label: "Panel del ECS", stand: { x: -0.6, z: 1.2 } },
    ]);
    expect(lm.nodes.map((n) => n.goal)).toEqual(["modulo:asiento", "modulo:acople", "modulo:ecs"]);
    expect(lm.links).toEqual([
      ["acople", "asiento"],
      ["acople", "ecs"],
    ]);
  });
  it("HAB-42 in pixels every node is a 44 px target and none covers another, on a phone's 320 px", () => {
    const ship = new StationInterior(starshipInteriorPlan());
    for (const m of [map, starshipAreas(ship, (id) => !!shipPointOf(ship, id))] as AreaMap[]) {
      const { nodes, height } = placeNodes(m, 320, 300);
      for (const n of nodes) {
        expect(n.width).toBeGreaterThanOrEqual(44);
        expect(n.height).toBeGreaterThanOrEqual(44);
        expect(n.left).toBeGreaterThanOrEqual(0);
        expect(n.left + n.width).toBeLessThanOrEqual(320.001);
        expect(n.top + n.height).toBeLessThanOrEqual(height + 0.001);
      }
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) expect(overlap(nodes[i]!, nodes[j]!), `${nodes[i]!.node.id} / ${nodes[j]!.node.id}`).toBe(false);
    }
  });
});
