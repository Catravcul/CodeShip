import { describe, expect, it } from "vitest";
import { BIO_EQUIPMENT, BIO_KCAL_PER_KG, BIO_OUTPUT_USE, BIO_PROCESSES, CREW_NEEDS, LARDER_UNITS } from "./bio";
import { EQ_BIO_LAB } from "./bio-equipment";
import { BIO_MATERIALS } from "./bio-materials";
import { BIO_SRC } from "./bio-sources";
import { BIO_BLUEPRINTS, EQUIPMENT, EQ_CROPS, MOD_FARM } from "./outfit";
import { BLUEPRINTS, RECIPES } from "./blueprints";
import { MATERIALS, materialInfo } from "./materials";
import { STARTING_STOCK } from "./station";
import { LAUNCH_STOCK } from "@modules/kitchen/data/stores";

const byId = (id: string) => BIO_PROCESSES.find((p) => p.id === id)!;
const perDay = (id: string, m: string, side: "inputs" | "outputs" = "outputs") => (byId(id)[side][m] ?? 0) * 24;

describe("bio data: sources and invariants", () => {
  it("every source is a URL and every process cites one", () => {
    for (const [k, v] of Object.entries(BIO_SRC)) expect(v, k).toMatch(/^https:\/\//);
    for (const p of BIO_PROCESSES) {
      expect(p.basis.source, p.id).toMatch(/^https:\/\//);
      expect(p.steps.length, p.id).toBeGreaterThanOrEqual(2);
    }
    for (const e of BIO_EQUIPMENT) expect(e.basis.source, e.id).toMatch(/^https:\/\//);
  });

  it("every material a process takes or gives is in the catalogue, and the bio ones are «biologico»", () => {
    for (const p of BIO_PROCESSES) for (const id of [...Object.keys(p.inputs), ...Object.keys(p.outputs)]) expect(materialInfo(id), `${p.id}: ${id}`).toBeDefined();
    for (const m of BIO_MATERIALS) expect(MATERIALS.find((x) => x.id === m.id)?.stage).toBe("biologico");
    expect(new Set(MATERIALS.map((m) => m.id)).size).toBe(MATERIALS.length);
  });

  it("every process runs on catalogued equipment, every rate is positive, every main output has a destination", () => {
    const eq = new Set(EQUIPMENT.map((e) => e.id));
    for (const p of BIO_PROCESSES) {
      expect(eq.has(p.equipmentId), p.id).toBe(true);
      for (const n of [...Object.values(p.inputs), ...Object.values(p.outputs)]) expect(n).toBeGreaterThan(0);
      expect(BIO_OUTPUT_USE[Object.keys(p.outputs)[0]!], p.id).toBeDefined();
    }
  });

  it("only the crop fields start by themselves (they are sown when built)", () => {
    expect(BIO_PROCESSES.filter((p) => p.startsWhenBuilt).map((p) => p.id)).toEqual(["cultivo"]);
  });

  it("no lab protocols: steps are a maintenance round (revisa, ajusta, recoge…)", () => {
    for (const p of BIO_PROCESSES) {
      expect(p.steps[0], p.id).toMatch(/^revisa/);
      expect(p.steps.some((s) => /^ajusta el caudal/.test(s)), p.id).toBe(true);
      expect(p.steps.some((s) => /^recoge/.test(s)), p.id).toBe(true);
      expect(p.steps.join(" "), p.id).not.toMatch(/°C|siembra|esteriliza|µmol/);
    }
  });

  it("crops scale NASA's BPC to 60 m²: 1,35 kg O₂ and 0,49 kg edible a day", () => {
    expect(EQ_CROPS.cropAreaM2).toBe(60);
    expect(perDay("cultivo", "oxigeno")).toBeCloseTo((540 / 24000) * 60, 3);
    expect(perDay("cultivo", "grano")).toBeCloseTo((196 / 24000) * 60, 3);
    expect(perDay("cultivo", "co2", "inputs")).toBeCloseTo((739 / 24000) * 60, 3);
    // One crew member's oxygen (0,816 kg/day, BVAD) is covered.
    expect(perDay("cultivo", "oxigeno")).toBeGreaterThan(CREW_NEEDS.o2KgPerDay);
  });

  it("the open issue: the loop recovers about half of the crops' nitrogen (~0,75 of ~1,5 g N/h)", () => {
    const loopN = byId("bucle").outputs.fertilizante! * 1000;
    const cropN = byId("cultivo").inputs.fertilizante! * 1000;
    expect(loopN).toBeCloseTo(0.74, 1);
    expect(cropN).toBeCloseTo(1.5, 1);
    expect(loopN / cropN).toBeLessThan(0.6);
  });

  it("spirulina scales the MELiSSA pilot plant to 400 L; PHB gives resin and breathes oxygen", () => {
    expect(perDay("espirulina", "espirulina")).toBeCloseTo(0.58 * 0.4, 3);
    expect(perDay("espirulina", "oxigeno")).toBeCloseTo(1.19e-3 * 400 * 0.032 * 24, 3);
    const phb = byId("phb");
    expect(phb.outputs.resina! * 40).toBeCloseTo(0.62, 3);
    expect(phb.inputs.oxigeno! / phb.outputs.resina!).toBeCloseTo((12 * 32) / 86.09, 2);
  });

  it("every food has its kcal and a larder unit", () => {
    for (const id of Object.keys(BIO_KCAL_PER_KG)) expect(LARDER_UNITS.some((u) => u.material === id), id).toBe(true);
    for (const u of LARDER_UNITS) expect(u.item in LAUNCH_STOCK, u.item).toBe(true);
  });

  it("the station starts with imported fertiliser and resin", () => {
    expect(STARTING_STOCK.fertilizante).toBeGreaterThan(0);
    expect(STARTING_STOCK.resina).toBeGreaterThan(0);
  });
});

describe("bio blueprints", () => {
  it("the lab needs the agricultural module; every reactor needs the lab", () => {
    expect(BIO_BLUEPRINTS.length).toBe(BIO_EQUIPMENT.length);
    for (const bp of BIO_BLUEPRINTS) {
      const e = bp.product.kind === "equipment" ? bp.product.equipment : undefined;
      expect(e).toBeDefined();
      if (e === EQ_BIO_LAB) {
        expect(bp.requiresModule).toBe(MOD_FARM.id);
        expect(bp.requires).toBeUndefined();
      } else expect(bp.requires, bp.id).toBe(EQ_BIO_LAB.id);
      expect(BLUEPRINTS).toContain(bp);
    }
  });

  it("carbon fibre parts take PHB resin in the composites cell", () => {
    expect(RECIPES.fibra.resina).toBeGreaterThan(0);
    expect(BLUEPRINTS.some((b) => b.machine === "compuestos" && (b.inputs.resina ?? 0) > 0)).toBe(true);
  });
});
