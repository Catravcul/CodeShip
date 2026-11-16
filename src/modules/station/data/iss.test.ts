import { describe, expect, it } from "vitest";
import { ECLSS_RACKS } from "@modules/life-support/data/eclss-machines";
import { POLANA_LAYOUT } from "./structure";
import { POLANA_INTERIOR } from "./interior";
import { BISHOP, EXPOSED_FACILITY, GROWTH_OPTIONS, ISS_FABRICATION, ISS_MODULES, ISS_OUTSIDE, issVolumeM3 } from "./iss";

describe("EST-42 the station is the ISS's US segment, at its real size", () => {
  it("every module has its real size, mass, volume and a source; derived volumes are the hull's", () => {
    expect(ISS_MODULES.map((m) => m.id)).toEqual(["nodo-1", "destiny", "nodo-2", "nodo-3", "cupula", "columbus", "kibo", "quest", "bishop"]);
    for (const m of ISS_MODULES) {
      expect(m.source, m.id).toMatch(/^https:\/\//);
      expect(m.status, m.id).toBe("real");
      if (m.volumeIs === "derivado") expect(m.volumeM3, m.id).toBeCloseTo(Math.PI * (m.diameterM / 2) ** 2 * m.lengthM, 0);
    }
    expect(ISS_MODULES.find((m) => m.id === "destiny")!.volumeM3).toBe(106);
    expect(ISS_MODULES.find((m) => m.id === "nodo-2")!.volumeM3).toBe(70);
    expect(BISHOP.massKg).toBe(1059);
    // The US segment rebuilt is under the whole ISS's 1005 m³ (which counts the Russian segment).
    expect(issVolumeM3()).toBeLessThan(1005);
  });

  it("the layout uses those modules where they are on the ISS", () => {
    const at = (id: string) => POLANA_LAYOUT.modules.find((m) => m.id === id)!;
    const len = (id: string) => at(id).to.sub(at(id).from).length();
    for (const m of ISS_MODULES) expect(len(m.id), m.id).toBeCloseTo(m.lengthM, 3);
    // Destiny forward of Unity, Harmony forward of Destiny; Tranquility port of Unity, Quest starboard.
    expect(at("destiny").to.z).toBeLessThan(at("nodo-1").to.z);
    expect(at("nodo-2").to.z).toBeLessThan(at("destiny").to.z);
    expect(at("nodo-3").to.x).toBeLessThan(0);
    expect(at("quest").to.x).toBeGreaterThan(0);
    // Kibo port and Columbus starboard of Harmony; the Cupola nadir of Tranquility.
    expect(at("kibo").to.x).toBeLessThan(0);
    expect(at("columbus").to.x).toBeGreaterThan(0);
    expect(at("cupula").to.y).toBeLessThan(0);
    expect(POLANA_LAYOUT.parts.filter((p) => p.kind === "solar").length).toBe(8);
    expect(2 * POLANA_LAYOUT.parts.find((p) => p.id === "celosia")!.half.x).toBeCloseTo(ISS_OUTSIDE.trussLengthM, 6);
    expect(EXPOSED_FACILITY.ports).toBe(12);
  });

  it("crew areas and life support are where they are on the ISS: galley in Unity, cabins in Harmony, hygiene, exercise and the racks in Tranquility", () => {
    const vol = (id: string) => POLANA_INTERIOR.fixtures.find((f) => f.id === id)?.volume;
    expect(vol("cocina")).toBe("nodo-1");
    expect(vol("camarotes")).toBe("nodo-2");
    for (const id of ["aseo", "ejercicio", "cupula", "bishop", "sv-wrs", "sv-ogs", "sv-ar", "sv-incendios"]) expect(vol(id), id).toBe("nodo-3");
    expect(vol("trajes")).toBe("quest");
    // The species catalogue's rack slots: the Aquatic Habitat flew in Kibo, the catalogue laptop beside it.
    expect(vol("rack-acuatico")).toBe("kibo");
    expect(POLANA_INTERIOR.fixtures.find((f) => f.id === "rack-catalogo")).toMatchObject({ volume: "kibo", action: { kind: "consola", id: "catalogo" } });
    // Each eclss-real rack placed is one of its kit, and the galley is its galley.
    const kinds = new Set(ECLSS_RACKS.map((r) => r.kind));
    for (const f of POLANA_INTERIOR.fixtures.filter((x) => x.rack)) expect(kinds.has(f.rack as never), f.id).toBe(true);
    expect(POLANA_INTERIOR.fixtures.find((f) => f.id === "cocina")!.rack).toBe("galeria");
  });

  it("fabrication is the ISS's own (printers since 2014) and growth is Haven-2 and Axiom, in development", () => {
    expect(ISS_FABRICATION.filter((f) => f.status === "real").length).toBeGreaterThanOrEqual(4);
    for (const f of ISS_FABRICATION) expect(f.source, f.id).toMatch(/^https:\/\//);
    expect(GROWTH_OPTIONS.haven2.source).toMatch(/^https:\/\//);
    expect(GROWTH_OPTIONS.axiomHab1.source).toMatch(/^https:\/\//);
  });
});
