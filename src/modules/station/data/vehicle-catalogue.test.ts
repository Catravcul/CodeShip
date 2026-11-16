import { describe, expect, it } from "vitest";
import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import { Ship } from "@modules/ship/domain/ship";
import { explorerDesign } from "@modules/ship/data/explorer";
import { lunarModuleDesign } from "@modules/ship/data/apollo-lm";
import { probeDesign } from "@modules/ship/data/probe";
import { Mothership } from "@modules/mothership/domain/mothership";
import { NODRIZA } from "@modules/mothership/data/mothership";
import { Hangar } from "../domain/hangar";
import { canBuild, componentMass, lineStatus, type CatalogueInventory } from "../domain/vehicle-catalogue";
import { BLUEPRINTS, blueprintForPart } from "./blueprints";
import { CATALOGUE_COMPONENTS } from "./catalogue-components";
import { catalogueMassOf, CREW_DAILY, VEHICLE_CATALOGUE, vehicleById } from "./vehicle-catalogue";

const everything: CatalogueInventory = { count: () => 0, blueprint: (id) => blueprintForPart(id) };

describe("EST-28 vehicle catalogue data", () => {
  it("every entry has a status, a date, sources and a programme", () => {
    expect(VEHICLE_CATALOGUE.length).toBeGreaterThanOrEqual(15);
    expect(new Set(VEHICLE_CATALOGUE.map((v) => v.id)).size).toBe(VEHICLE_CATALOGUE.length);
    for (const v of VEHICLE_CATALOGUE) {
      expect(v.sources.length, v.id).toBeGreaterThan(0);
      for (const s of v.sources) expect(s, v.id).toMatch(/^https:\/\//);
      expect(v.launch, v.id).not.toBe("");
      expect(v.statusNote, v.id).not.toBe("");
    }
  });

  it("every part of every recipe has a blueprint at the station", () => {
    for (const v of VEHICLE_CATALOGUE) for (const l of lineStatus(v, everything)) expect(l.blueprint, `${v.id}: ${l.line.partId}`).not.toBe("sin-plano");
  });

  it("new components carry a source and a positive mass, and each one has its blueprint in Planos", () => {
    for (const c of CATALOGUE_COMPONENTS) {
      expect(c.massKg.value, c.id).toBeGreaterThan(0);
      expect(c.massKg.source, c.id).toMatch(/^https:\/\//);
      expect(BLUEPRINTS.some((b) => b.product.kind === "part" && b.product.partId === c.id), c.id).toBe(true);
    }
  });

  it("the recipe adds up to the real mass (within 3 %) wherever a mass is published (our licensed additions aside)", () => {
    // The LM's IDSS adapter is our adaptation (it used a probe and drogue): its 340 kg are on top of the real 4280 kg.
    const licensed = new Set(["adaptador-idss-lm"]);
    for (const v of VEHICLE_CATALOGUE) {
      if (!v.lines.length || !v.specs.massKg) continue;
      const m = componentMass({ ...v, lines: v.lines.filter((l) => !licensed.has(l.partId)) }, catalogueMassOf);
      expect(m.unknown, v.id).toEqual([]);
      expect(m.coverage!, v.id).toBeGreaterThan(0.97);
      expect(m.coverage!, v.id).toBeLessThan(1.03);
    }
  });

  it("the game's own craft are classed as invented, and their recipes weigh what the game says", () => {
    for (const id of ["codeship-nodriza", "codeship-explorer"]) expect(vehicleById(id)!.status).toBe("inventado");
    expect(componentMass(vehicleById("codeship-explorer")!, catalogueMassOf).kg).toBeCloseTo(Ship.create(explorerDesign()).dryMassKg, 3);
    expect(componentMass(vehicleById("codeship-nodriza")!, catalogueMassOf).kg).toBeCloseTo(new Mothership(NODRIZA, Vec3.ZERO, Quat.IDENTITY).dryMassKg, 0);
  });

  it("CAT-04 the player's lander is the Apollo LM and the probe is Juventas: their recipes weigh what they fly with", () => {
    expect(vehicleById("codeship-sonda")).toBeUndefined();
    const lm = vehicleById("apollo-lm")!;
    expect(lm.playerCraft).toBe("modulo");
    expect(lm.status).toBe("volado");
    expect(componentMass(lm, catalogueMassOf).kg).toBeCloseTo(Ship.create(lunarModuleDesign()).dryMassKg, 3);
    const j = vehicleById("juventas")!;
    expect(j.playerCraft).toBe("sonda");
    expect(componentMass(j, catalogueMassOf).kg).toBeCloseTo(Ship.create(probeDesign()).dryMassKg, 3);
    expect(lm.adaptations!.some((a) => a.reality === "licencia" && /IDSS/.test(a.what))).toBe(true);
    expect(j.adaptations!.some((a) => /anclas/.test(a.what))).toBe(true);
  });

  it("EST-30 no real vehicle, flown or in development, has artificial gravity: only concepts and the game's own", () => {
    for (const v of VEHICLE_CATALOGUE) {
      const spins = !/^Ninguna/.test(v.specs.gravity);
      if (spins) expect(["concepto", "inventado"], v.id).toContain(v.status);
    }
  });

  it("offers at least one option of each kind for the mothership (A, B, C)", () => {
    for (const o of ["A", "B", "C"] as const) expect(VEHICLE_CATALOGUE.some((v) => v.mothershipOption === o && v.replaces === "nodriza"), o).toBe(true);
  });

  it("DART can be built from the NEXT-C and ROSA blueprints the station already had, plus its body", () => {
    const dart = vehicleById("dart")!;
    expect(dart.status).toBe("volado");
    expect(dart.lines.map((l) => l.partId)).toEqual(expect.arrayContaining(["ionico-next-c", "rosa-diamond"]));
    const h = new Hangar(Object.fromEntries(dart.lines.map((l) => [l.partId, l.count])));
    expect(canBuild(dart, { count: (id) => h.count(id), blueprint: (id) => blueprintForPart(id) })).toBe(true);
  });
});

describe("EST-30 vehicle catalogue: looks and life support", () => {
  it("every mothership option and every station says what it looks like outside and inside, with pictures", () => {
    for (const v of VEHICLE_CATALOGUE.filter((x) => x.replaces === "nodriza" || x.kind === "estacion")) {
      expect(v.look, v.id).toBeDefined();
      expect(v.look!.images.length, v.id).toBeGreaterThan(0);
      for (const t of [v.look!.exterior, v.look!.interior, v.look!.lifeSupport]) expect(t.length, v.id).toBeGreaterThan(5);
    }
  });

  it("the ISS life support quotes its real figures", () => {
    expect(vehicleById("iss")!.look!.lifeSupport).toMatch(/98 %/);
    expect(CREW_DAILY.waterRecovered!.value).toBe(0.98);
    for (const v of Object.values(CREW_DAILY)) expect(v.source).toMatch(/^https:\/\//);
  });
});
