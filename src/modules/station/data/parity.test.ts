import { describe, expect, it } from "vitest";
import { starshipInteriorPlan } from "@modules/mothership/data/starship-interior";
import type { Fixture, StationInteriorPlan } from "../domain/interior";
import { POLANA_INTERIOR } from "./interior";

/**
 * Starship and the station have the same facilities, and each works in both (reglas.md §6.0; docs/design/equipos.md,
 * «Paridad»): the galley, the mat (settings and yoga), the three exercise machines, the crew quarters, the toilet,
 * the life-support racks, the AQH and the species catalogue. Same fixture ids where the code routes by id (the
 * machines), same action and the same real equipment model.
 */
const ship = starshipInteriorPlan();
const iss = POLANA_INTERIOR;

const crewAreas = (p: StationInteriorPlan) => new Set(p.fixtures.flatMap((f) => (f.action.kind === "tripulacion" ? [f.action.area] : [])));
const racks = (p: StationInteriorPlan) => new Set(p.fixtures.flatMap((f) => (f.action.kind === "soporte-vital" ? [f.action.rack] : [])));
const consoles = (p: StationInteriorPlan) => new Set(p.fixtures.flatMap((f) => (f.action.kind === "consola" ? [f.action.id] : [])));
const byGear = (p: StationInteriorPlan, gear: Fixture["gear"]) => p.fixtures.filter((f) => f.gear === gear);

describe("Parity of the facilities: Starship and the station (reglas.md §6.0)", () => {
  it("the same crew areas in both: galley, mat, exercise, quarters, toilet", () => {
    expect([...crewAreas(ship)].sort()).toEqual(["aseo", "camarotes", "cocina", "ejercicio", "esterilla"]);
    expect([...crewAreas(iss)].sort()).toEqual([...crewAreas(ship)].sort());
  });

  it("the three ISS machines under the same ids, each with its own model, in both", () => {
    for (const p of [ship, iss])
      for (const id of ["t2", "cevis", "ared"] as const) {
        const f = p.fixtures.find((x) => x.id === id);
        expect(f?.gear, `${id}`).toBe(id);
        expect(f?.action).toEqual({ kind: "tripulacion", area: "ejercicio" });
      }
  });

  it("the same real models for the mat, the toilet and the AQH", () => {
    for (const gear of ["esterilla", "whc", "aqh"] as const) {
      expect(byGear(ship, gear).length, gear).toBe(1);
      expect(byGear(iss, gear).length, gear).toBe(1);
      expect(byGear(iss, gear)[0]!.action.kind, gear).toBe(byGear(ship, gear)[0]!.action.kind);
    }
  });

  it("the AQH and the catalogue work in both (none is a mere sign)", () => {
    for (const p of [ship, iss]) {
      expect(consoles(p).has("acuatico")).toBe(true);
      expect(consoles(p).has("catalogo")).toBe(true);
      expect(byGear(p, "aqh")[0]!.action).toEqual({ kind: "consola", id: "acuatico" });
    }
  });

  it("four crew quarters each and the same life-support racks (repairs in both)", () => {
    for (const p of [ship, iss]) expect(p.fixtures.filter((f) => f.action.kind === "tripulacion" && f.action.area === "camarotes").length).toBe(4);
    const shared = ["ar", "consola", "incendios", "itcs", "ogs", "wrs"];
    expect([...racks(iss)].sort()).toEqual(shared);
    // Starship adds its water-wall storm shelter (en desarrollo): the ISS has no dedicated one.
    expect([...racks(ship)].sort()).toEqual([...shared, "refugio"].sort());
  });
});
