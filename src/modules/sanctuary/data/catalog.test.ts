import { describe, expect, it } from "vitest";
import { EQUIPMENT, MODULES } from "@modules/station/data/outfit";
import { HUB_AREA_ID, missingRequirements, waterHandling } from "../domain/area";
import { fit, loopStatus } from "../domain/fauna";
import { waterMassT } from "../domain/water";
import { SANCTUARY_AREAS } from "./areas";
import { SANCTUARY_SPECIES, speciesById } from "./fauna";

const stationIds = new Set([...EQUIPMENT.map((e) => e.id), ...MODULES.map((m) => m.id)]);

describe("fauna catalogue", () => {
  it("every species cites a source", () => {
    for (const s of SANCTUARY_SPECIES) expect(s.source, s.id).toMatch(/^https:\/\//);
  });

  it("ids are unique", () => {
    expect(new Set(SANCTUARY_SPECIES.map((s) => s.id)).size).toBe(SANCTUARY_SPECIES.length);
  });
});

describe("sanctuary areas", () => {
  it("there is exactly one hub, the ring garden", () => {
    expect(SANCTUARY_AREAS.filter((a) => a.hub).map((a) => a.id)).toEqual([HUB_AREA_ID]);
  });

  it("can be built in the listed order: each one only needs earlier areas and real station pieces", () => {
    const built = new Set<string>(stationIds);
    for (const a of SANCTUARY_AREAS) {
      for (const id of a.requires.station) expect(stationIds.has(id), `${a.id} → ${id}`).toBe(true);
      expect(missingRequirements(a, built), a.id).toEqual([]);
      built.add(a.id);
    }
  });

  it("every resident fits its area and every loop is closed", () => {
    for (const a of SANCTUARY_AREAS) {
      for (const id of a.residents) {
        const s = speciesById(id);
        expect(s, `${a.id}: ${id}`).toBeDefined();
        expect(fit(s!, a), `${id} en ${a.id}`).toEqual({ ok: true, reasons: [] });
      }
      expect(loopStatus(a, SANCTUARY_SPECIES), a.id).toEqual({ closed: true, missing: [] });
    }
  });

  it("the deep-sea grenadier fits no planned area; the honeybee only the ring garden", () => {
    const where = (id: string) => SANCTUARY_AREAS.filter((a) => fit(speciesById(id)!, a).ok).map((a) => a.id);
    expect(where("granadero")).toEqual([]);
    expect(where("abeja")).toEqual([HUB_AREA_ID]);
  });

  it("the blind cave fish lives only in the ring's cave", () => {
    const s = speciesById("pez-ciego")!;
    expect(SANCTUARY_AREAS.filter((a) => fit(s, a).ok).map((a) => a.id)).toEqual(["cueva-anillo"]);
  });

  it("the 0 g sphere needs membrane aeration and a sealed volume; the hangar river (0.1 g) has a free surface", () => {
    const sphere = SANCTUARY_AREAS.find((a) => a.id === "esfera-de-agua")!;
    const river = SANCTUARY_AREAS.find((a) => a.id === "rio-del-hangar")!;
    expect(waterHandling(sphere)).toMatchObject({ aeration: "membrana", containment: "cerrado" });
    expect(waterHandling(river)).toMatchObject({ aeration: "burbujas", containment: "superficie-libre" });
  });

  it("water masses: 1 t in the ring aquarium, 33.5 t in the sphere, ~346 t in the hangar river", () => {
    const t = Object.fromEntries(SANCTUARY_AREAS.map((a) => [a.id, waterMassT(a.waterM3)]));
    expect(t).toMatchObject({ "acuario-anillo": 1, "esfera-de-agua": 33.5, "rio-del-hangar": 345.6 });
  });
});
