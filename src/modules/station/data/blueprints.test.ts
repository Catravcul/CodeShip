import { describe, expect, it } from "vitest";
import { ALL_PARTS } from "@modules/ship/data/parts";
import { isEmptyPart } from "@modules/ship/domain/refit";
import { ELECTRIC_THRUSTERS, X3 } from "@modules/mothership/data/thrusters";
import { BENNU } from "@modules/celestial/data/bennu";
import { extractToCargo } from "@modules/celestial/domain/resources";
import { BLUEPRINTS, PROBE_BLUEPRINT, RCS_SET_SIZE, blueprintForPart } from "./blueprints";
import { REFINE_PROCESSES } from "./processes";
import { MATERIALS, cargoMaterial } from "./materials";
import { STARTING_STOCK } from "./station";
import { STATION_TUNING } from "../domain/blueprint";
import { MaterialStock } from "../domain/materials";

const metalKg = (inputs: Readonly<Record<string, number>>) => Object.entries(inputs).reduce((s, [id, n]) => s + (id === "kit" ? 0 : n), 0);

describe("blueprints", () => {
  it("every part of the ship's catalog has one, plus the probe", () => {
    for (const p of ALL_PARTS.filter((x) => !isEmptyPart(x))) expect(blueprintForPart(p.id), p.id).toBeDefined();
    expect(BLUEPRINTS).toContain(PROBE_BLUEPRINT);
  });

  it("every thruster of the mothership has one: the head is printed, its power unit comes in kits", () => {
    for (const t of ELECTRIC_THRUSTERS) {
      const bp = blueprintForPart(t.id)!;
      expect(bp, t.id).toBeDefined();
      expect(bp.massKg).toBe(t.thrusterMassKg);
      expect(metalKg(bp.inputs)).toBeCloseTo(t.thrusterMassKg / STATION_TUNING.fabricationYield, 1);
      expect(bp.inputs.kit).toBeGreaterThanOrEqual(3);
    }
    // A 230 kg X3 needs far more metal than the station starts with.
    expect(new MaterialStock(STARTING_STOCK).has(blueprintForPart(X3.id)!.inputs)).toBe(false);
  });

  it("feedstock is the finished mass over the yield, and an RCS set is the whole set", () => {
    const tank = blueprintForPart("tanque-n2h4-40")!;
    expect(metalKg(tank.inputs)).toBeCloseTo(5 / STATION_TUNING.fabricationYield, 1);
    const rcs = blueprintForPart("aerojet-mr-111g")!;
    expect(rcs.massKg).toBeCloseTo(0.37 * RCS_SET_SIZE, 2);
    expect(rcs.inputs.kit).toBe(4);
  });

  it("every blueprint and process names only known materials and carries a source", () => {
    const known = new Set(MATERIALS.map((m) => m.id));
    for (const b of BLUEPRINTS) {
      for (const id of Object.keys(b.inputs)) expect(known.has(id), `${b.id}: ${id}`).toBe(true);
      expect(b.process.source).toMatch(/^https:\/\//);
      expect(b.steps.length).toBeGreaterThanOrEqual(3);
    }
    for (const p of REFINE_PROCESSES) {
      for (const id of [...Object.keys(p.inputs), ...Object.keys(p.outputs)]) expect(known.has(id), `${p.id}: ${id}`).toBe(true);
      expect(p.process.source).toMatch(/^https:\/\//);
    }
  });

  it("every material of Bennu's hold has a place in the store", () => {
    for (const c of extractToCargo(BENNU.composition, 500)) expect(cargoMaterial(c.material), c.material).toBeDefined();
  });

  it("refining never makes mass: what comes out weighs no more than what goes in", () => {
    for (const p of REFINE_PROCESSES) expect(metalKg(p.outputs)).toBeLessThanOrEqual(metalKg(p.inputs));
  });

  it("at the start a tank and the MR-104H can be built but not the big RCS set; one load of Bennu makes it possible", () => {
    const stock = new MaterialStock(STARTING_STOCK);
    expect(stock.has(blueprintForPart("tanque-n2h4-80")!.inputs)).toBe(true);
    expect(stock.has(blueprintForPart("aerojet-mr-104h")!.inputs)).toBe(true);
    const big = blueprintForPart("aerojet-mr-107t")!;
    expect(stock.has(big.inputs)).toBe(false);
    // Unload Bennu and run the carbonyl and MRE batches once.
    for (const c of extractToCargo(BENNU.composition, 500)) stock.add({ [cargoMaterial(c.material)!]: c.kg });
    for (const id of ["carbonilo", "mre"]) {
      const p = REFINE_PROCESSES.find((x) => x.id === id)!;
      stock.take(p.inputs);
      stock.add(p.outputs);
    }
    expect(stock.missing(big.inputs)).toEqual({});
  });
});
