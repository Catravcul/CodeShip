import { describe, expect, it } from "vitest";
import { Hangar } from "./hangar";
import { assemble, assemblySite, canBuild, componentMass, lineStatus, missingParts, type CatalogueInventory, type VehicleEntry } from "./vehicle-catalogue";

const entry: VehicleEntry = {
  id: "prueba",
  name: "Sonda de prueba",
  kind: "sonda",
  status: "volado",
  statusNote: "Prueba",
  programme: "Ninguno",
  launch: "2021",
  specs: { massKg: { value: 500, source: "https://example.org", note: "seca" }, sizeM: [2, 2, 3], crew: "Sin tripulación", gravity: "Ninguna", propulsion: "Iónica" },
  lines: [
    { partId: "motor", count: 1, role: "propulsión" },
    { partId: "ala", count: 2, role: "energía" },
    { partId: "cuerpo", count: 1, role: "resto" },
  ],
  sources: ["https://example.org"],
  gameplay: { gains: "", losses: "" },
};

const MASS: Readonly<Record<string, number>> = { motor: 14, ala: 36, cuerpo: 414 };
const massOf = (id: string) => MASS[id];

function inventory(parts: Record<string, number>, blueprints: Record<string, string | undefined> = { motor: undefined, ala: undefined, cuerpo: "Necesita la impresora grande" }): CatalogueInventory {
  const h = new Hangar(parts);
  return {
    count: (id) => h.count(id),
    blueprint: (id) => (id in blueprints ? { id: `plano-${id}`, ...(blueprints[id] ? { locked: blueprints[id] } : {}) } : undefined),
  };
}

describe("EST-28 vehicle catalogue", () => {
  it("says, line by line, how many are in the hangar and whether the blueprint exists or is locked", () => {
    const s = lineStatus(entry, inventory({ ala: 1 }, { motor: undefined, ala: undefined }));
    expect(s.map((l) => [l.line.partId, l.have, l.missing, l.blueprint])).toEqual([
      ["motor", 0, 1, "disponible"],
      ["ala", 1, 1, "disponible"],
      ["cuerpo", 0, 1, "sin-plano"],
    ]);
    const locked = lineStatus(entry, inventory({}))[2]!;
    expect(locked.blueprint).toBe("bloqueado");
    expect(locked.locked).toBe("Necesita la impresora grande");
    expect(locked.blueprintId).toBe("plano-cuerpo");
  });

  it("can be built only when every part is in the hangar", () => {
    expect(canBuild(entry, inventory({ motor: 1, ala: 1, cuerpo: 1 }))).toBe(false);
    expect(missingParts(entry, inventory({ motor: 1, ala: 1, cuerpo: 1 })).map((l) => l.line.partId)).toEqual(["ala"]);
    expect(canBuild(entry, inventory({ motor: 1, ala: 2, cuerpo: 1 }))).toBe(true);
    expect(missingParts(entry, inventory({ motor: 1, ala: 2, cuerpo: 1 }))).toEqual([]);
  });

  it("an entry without a published breakdown cannot be built", () => {
    expect(canBuild({ ...entry, lines: [] }, inventory({}))).toBe(false);
  });

  it("adds up the mass of its components and compares it with the real one", () => {
    const m = componentMass(entry, massOf);
    expect(m.kg).toBe(14 + 2 * 36 + 414);
    expect(m.unknown).toEqual([]);
    expect(m.coverage).toBeCloseTo(1, 6);
    const partial = componentMass({ ...entry, lines: [...entry.lines, { partId: "x", count: 1, role: "?" }] }, massOf);
    expect(partial.unknown).toEqual(["x"]);
  });

  it("is assembled in the hangar when it fits, otherwise in the dry dock", () => {
    const hangar = { x: 20, y: 14, z: 20 };
    expect(assemblySite([2, 2, 3], hangar)).toBe("hangar");
    expect(assemblySite([9.4, 7.04, 9.4], hangar)).toBe("hangar"); // any orientation
    expect(assemblySite([52.1, 9, 9], hangar)).toBe("dique");
    expect(assemblySite(undefined, hangar)).toBe("dique");
  });

  it("assembling takes the parts from the hangar and leaves the craft there", () => {
    const h = new Hangar({ motor: 1, ala: 3, cuerpo: 1 });
    const inv: CatalogueInventory = { count: (id) => h.count(id), blueprint: (id) => ({ id: `plano-${id}` }) };
    const craft = assemble(entry, h, inv, massOf);
    expect(craft).toMatchObject({ id: "prueba", name: "Sonda de prueba", kind: "sonda", massKg: 500, docked: true });
    expect(h.count("ala")).toBe(1);
    expect(h.count("motor")).toBe(0);
    expect(() => assemble(entry, h, inv, massOf)).toThrow(/motor/);
  });
});
