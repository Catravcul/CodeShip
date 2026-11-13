import { describe, expect, it } from "vitest";
import { PROPELLANT_PROCESSES } from "./propellant-processes";
import { MATERIALS, cargoMaterial, materialInfo } from "./materials";
import { POLANA_STATION, STARTING_STOCK } from "./station";
import { isCorrect, type Answer, type Exercise } from "@modules/mind-duel/domain/exercise";
import { MaterialStock } from "../domain/materials";
import { Hangar } from "../domain/hangar";
import { Station } from "../domain/station";
import { StationOps } from "../application/station-ops";
import { REFINE_PROCESSES } from "./processes";

const sum = (a: Readonly<Record<string, number>>) => Object.values(a).reduce((s, n) => s + n, 0);
const byId = (id: string) => PROPELLANT_PROCESSES.find((p) => p.id === id)!;

describe("propellant plant processes", () => {
  it("run on the plant, use known materials and never make mass", () => {
    for (const p of PROPELLANT_PROCESSES) {
      expect(p.machine).toBe("planta");
      for (const id of [...Object.keys(p.inputs), ...Object.keys(p.outputs)]) expect(materialInfo(id), id).toBeDefined();
      expect(sum(p.outputs)).toBeLessThanOrEqual(sum(p.inputs) + 1e-9);
      expect(p.process.source).toMatch(/^https:\/\//);
      expect(p.steps.value.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("follow the balanced reactions (H 1, N 14, O 16 g/mol)", () => {
    // 2 H2O → 2 H2 + O2: water is 1/9 hydrogen.
    expect(byId("electrolisis-agua").outputs.hidrogeno! / byId("electrolisis-agua").inputs.agua!).toBeCloseTo(2 / 18, 6);
    expect(byId("electrolisis-agua").energyKwh!.value).toBe(110); // 55 kWh/kg H2 × 2 kg
    // N2 + 3 H2 → 2 NH3 at 90 %.
    const nh3 = byId("amoniaco");
    expect(nh3.inputs.hidrogeno! / nh3.inputs["nitrogeno-roca"]!).toBeCloseTo(6 / 28, 2);
    expect(nh3.outputs.amoniaco!).toBeCloseTo(((1.4 * 34) / 28) * 0.9, 2);
    // 2 NH3 + H2O2 → N2H4 + 2 H2O at 80 %.
    const n2h4 = byId("hidracina");
    expect(n2h4.outputs.hidracina! / n2h4.inputs.amoniaco!).toBeCloseTo((32 / 34) * 0.8, 3);
    // 4 NH3 + 7 O2 → 2 N2O4 + 6 H2O at 95 %.
    const nto = byId("nto");
    expect(nto.inputs.oxigeno! / nto.inputs.amoniaco!).toBeCloseTo(224 / 68, 3);
    expect(nto.outputs.nto! / nto.inputs.amoniaco!).toBeCloseTo((184 / 68) * 0.95, 2);
  });

  it("the rock's nitrogen reaches the store, and what cannot be made here is imported", () => {
    expect(cargoMaterial("Nitrogen (in ammonium salts and organics)")).toBe("nitrogeno-roca");
    const imported = MATERIALS.filter((m) => m.propellant && m.stage === "importado").map((m) => m.id);
    expect(imported.sort()).toEqual(["helio", "lmp-103s", "mmh", "xenon"]);
    expect(materialInfo("hidracina")!.stage).toBe("refinado");
    expect(materialInfo("nto")!.stage).toBe("refinado");
    // One full fill of the probe's pair at O/F 1,65 is in store at the start: 438 kg → 165,3 MMH + 272,7 NTO.
    expect(STARTING_STOCK.mmh).toBeGreaterThanOrEqual(438 / 2.65);
    expect(STARTING_STOCK.nto).toBeGreaterThanOrEqual((438 * 1.65) / 2.65);
  });
});

describe("running the plant", () => {
  const right = (ex: Exercise): Answer => (ex.kind === "order" ? { kind: "order", order: ex.solution } : { kind: "choice", index: ex.correct });
  it("water → hydrogen → ammonia → hydrazine, each a solved chain and a job on the plant", () => {
    const station = new Station(POLANA_STATION, new MaterialStock({ agua: 18, "nitrogeno-roca": 1.4, oxigeno: 2 }), new Hangar());
    const ops = new StationOps(station, [], [...REFINE_PROCESSES, ...PROPELLANT_PROCESSES]);
    const run = (id: string) => {
      const s = ops.startRefining(id);
      for (const e of s.chore.exercises) {
        expect(isCorrect(e, right(e))).toBe(true);
        if (e.kind === "choice") expect(new Set(e.options).size).toBe(e.options.length);
        s.answer(right(e));
      }
      expect(s.run.status).toBe("done");
      station.tick(100);
    };
    run("electrolisis-agua");
    expect(station.stock.amount("hidrogeno")).toBeCloseTo(2);
    run("amoniaco");
    expect(station.stock.amount("amoniaco")).toBeCloseTo(1.53);
    run("hidracina"); // 1,53 kg of ammonia: a 90 % batch
    expect(station.stock.amount("hidracina")).toBeCloseTo(1.28 * 0.9, 6);
  });
});

