import { describe, expect, it } from "vitest";
import { MaterialStock } from "../domain/materials";
import { Hangar } from "../domain/hangar";
import { Station } from "../domain/station";
import { BLUEPRINTS } from "../data/blueprints";
import { POLANA_STATION, STARTING_STOCK } from "../data/station";
import { HANGAR_SIZE } from "../data/hangar-craft";
import { startingOutfit } from "../data/outfit";
import { catalogueMassOf, VEHICLE_CATALOGUE, vehicleById } from "../data/vehicle-catalogue";
import { VehicleYard } from "./vehicle-yard";

const yard = (parts: Record<string, number> = {}) => {
  const station = new Station(POLANA_STATION, new MaterialStock({ ...STARTING_STOCK }), new Hangar(parts), startingOutfit());
  return new VehicleYard(station, BLUEPRINTS, VEHICLE_CATALOGUE, catalogueMassOf, HANGAR_SIZE);
};

describe("EST-29 vehicle yard", () => {
  it("lists every entry with what is missing and where it would be assembled", () => {
    const rows = yard().rows();
    expect(rows).toHaveLength(VEHICLE_CATALOGUE.length);
    const dart = rows.find((r) => r.entry.id === "dart")!;
    expect(dart.canBuild).toBe(false);
    expect(dart.site).toBe("hangar");
    expect(dart.missing.map((l) => l.line.partId)).toEqual(["ionico-next-c", "rosa-diamond", "dart-cuerpo"]);
    expect(rows.find((r) => r.entry.id === "starship")!.site).toBe("dique");
    // At the start the big printer is not built: the Raptor blueprint is locked and says why.
    const raptor = rows.find((r) => r.entry.id === "starship")!.lines.find((l) => l.line.partId === "raptor-2")!;
    expect(raptor.blueprint).toBe("bloqueado");
    expect(raptor.locked).toMatch(/impresora/i);
  });

  it("builds a vehicle from the hangar's parts and keeps it there", () => {
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
