import { describe, expect, it } from "vitest";
import { COMET_PROCESSES, ICE_MELT_KJ_PER_KG } from "./comet-processes";
import { cargoMaterial, materialInfo } from "./materials";
import { cometComposition } from "@modules/celestial/data/comets";

const sum = (a: Readonly<Record<string, number>>) => Object.values(a).reduce((s, n) => s + n, 0);

describe("comet ice at the station", () => {
  it("processes use known materials and never make mass", () => {
    for (const p of COMET_PROCESSES) {
      for (const id of [...Object.keys(p.inputs), ...Object.keys(p.outputs)]) expect(materialInfo(id), id).toBeDefined();
      expect(sum(p.outputs)).toBeLessThanOrEqual(sum(p.inputs));
    }
  });

  it("melting ice costs its latent heat plus warming: about 0,56 MJ per kg", () => {
    expect(ICE_MELT_KJ_PER_KG).toBeCloseTo(560.6, 1);
    const melt = COMET_PROCESSES.find((p) => p.id === "fundir-hielo")!;
    expect(melt.energyKwh!.value).toBeCloseTo((20 * 560.6) / 3600, 1);
  });

  it("CO2 splits into carbon and oxygen in the 12 : 32 proportion of CO2 → C + O2", () => {
    const co2 = COMET_PROCESSES.find((p) => p.id === "co2-oxigeno")!;
    expect(co2.outputs.carbono! / co2.outputs.oxigeno!).toBeCloseTo(12 / 32, 3);
    expect(co2.outputs.oxigeno! / co2.inputs["hielo-co2"]!).toBeCloseTo((32 / 44) * 0.9, 3);
  });

  it("a comet's hold goes to the store except the ices that boil away (CO and the other volatiles)", () => {
    const comp = cometComposition();
    const kept = comp.filter((e) => cargoMaterial(e.material));
    const lost = comp.filter((e) => !cargoMaterial(e.material)).map((e) => e.material);
    expect(kept.length).toBe(5);
    expect(lost).toEqual(["Carbon monoxide ice", "Other volatiles (H2S, O2, CH3OH…)"]);
  });
});
