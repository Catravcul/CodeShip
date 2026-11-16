import { describe, expect, it } from "vitest";
import { MaterialStock } from "../domain/materials";
import { Hangar } from "../domain/hangar";
import { Station } from "../domain/station";
import { BLUEPRINTS } from "../data/blueprints";
import { POLANA_STATION, STARTING_STOCK } from "../data/station";
import { ASSEMBLY_LIMITS } from "../data/iss";
import { startingOutfit } from "../data/outfit";
import { catalogueMassOf, VEHICLE_CATALOGUE, vehicleById } from "../data/vehicle-catalogue";
import { VehicleYard } from "./vehicle-yard";

const yard = (parts: Record<string, number> = {}) => {
  const station = new Station(POLANA_STATION, new MaterialStock({ ...STARTING_STOCK }), new Hangar(parts), startingOutfit());
  return new VehicleYard(station, BLUEPRINTS, VEHICLE_CATALOGUE, catalogueMassOf, ASSEMBLY_LIMITS);
};

describe("EST-29 vehicle yard", () => {
  it("lists every entry with what is missing and where it would be assembled", () => {
    const rows = yard().rows();
    expect(rows).toHaveLength(VEHICLE_CATALOGUE.length);
    const dart = rows.find((r) => r.entry.id === "dart")!;
    expect(dart.canBuild).toBe(false);
    // DART (500 kg, 1,8 × 1,9 × 2,6 m) is too big for the Bishop and a JEM-EF port: the arm holds it on a CBM.
    expect(dart.site).toBe("brazo-cbm");
    expect(dart.missing.map((l) => l.line.partId)).toEqual(["ionico-next-c", "rosa-diamond", "dart-cuerpo"]);
    expect(rows.find((r) => r.entry.id === "starship")!.site).toBe("dique");
    // At the start the big printer is not built: the Raptor blueprint is locked and says why.
    const raptor = rows.find((r) => r.entry.id === "starship")!.lines.find((l) => l.line.partId === "raptor-2")!;
    expect(raptor.blueprint).toBe("bloqueado");
    expect(raptor.locked).toMatch(/impresora/i);
  });

  it("CAT-02 the LM is berthed by the arm, Juventas goes through the Bishop, Starship needs the dry dock (licence)", () => {
    const rows = yard().rows();
    const site = (id: string) => rows.find((r) => r.entry.id === id)!.plan;
    expect(site("apollo-lm")).toMatchObject({ site: "brazo-cbm", reality: "real" });
    expect(site("juventas")).toMatchObject({ site: "bishop", reality: "real" });
    expect(site("starship")).toMatchObject({ site: "dique", reality: "licencia" });
    expect(site("philae").site).toBe("jem-ef");
  });

  it("CAT-03 a built Juventas waits in the Bishop until it is deployed; then it is free", () => {
    const j = vehicleById("juventas")!;
    const y = yard(Object.fromEntries(j.lines.map((l) => [l.partId, l.count])));
    const craft = y.build("juventas");
    expect(craft.site).toBe("bishop");
    expect(y.rows().find((r) => r.entry.id === "juventas")!.waiting.map((c) => c.id)).toEqual([craft.id]);
    const { steps } = y.release(craft.id);
    expect(steps[0]).toContain("Bishop");
    expect(y.waiting("juventas")).toEqual([]);
    expect(() => y.release(craft.id)).toThrow();
  });

  it("builds a vehicle from the station's parts and keeps it at its site", () => {
    const dart = vehicleById("dart")!;
    const y = yard(Object.fromEntries(dart.lines.map((l) => [l.partId, l.count])));
    expect(y.rows().find((r) => r.entry.id === "dart")!.canBuild).toBe(true);
    const craft = y.build("dart");
    expect(craft.kind).toBe("sonda");
    expect(craft.massKg).toBe(500);
    expect(y.station.hangar.crafts.some((c) => c.id === "dart")).toBe(true);
    expect(y.station.hangar.count("rosa-diamond")).toBe(0);
    expect(() => y.build("dart")).toThrow();
  });
});
