import { describe, expect, it } from "vitest";
import type { Answer, Exercise } from "@modules/mind-duel/domain/exercise";
import { CHORE_CATEGORY } from "@modules/chores/domain/chore";
import { BioOps } from "./bio-ops";
import { MaterialStock } from "../domain/materials";
import { Hangar } from "../domain/hangar";
import { Station } from "../domain/station";
import { BIO_TUNING } from "../domain/bioreactor";
import { BIO_KCAL_PER_KG, BIO_OUTPUT_USE, BIO_PROCESSES, CREW_NEEDS, LARDER_UNITS } from "../data/bio";
import { EQ_BIO_LAB, EQ_LOOP, EQ_SPIRULINA } from "../data/bio-equipment";
import { BLUEPRINTS } from "../data/blueprints";
import { EQ_COMPOSITES, EQ_CROPS, EQ_EBW, MOD_FARM, WINGS_IROSA, RADIATORS_DOUBLE, startingOutfit } from "../data/outfit";
import { MATERIALS } from "../data/materials";
import { POLANA_STATION } from "../data/station";

const solve = (ex: Exercise): Answer => {
  if (ex.kind === "choice") return { kind: "choice", index: ex.correct };
  if (ex.kind === "order") return { kind: "order", order: ex.solution };
  throw new Error("unexpected exercise");
};
const bp = (id: string) => BLUEPRINTS.find((b) => b.id === id)!;

function grownStation(extra: string[] = []) {
  const outfit = startingOutfit();
  const st = new Station(POLANA_STATION, new MaterialStock(Object.fromEntries(MATERIALS.map((m) => [m.id, 1e6]))), new Hangar(), outfit);
  // More power first, so the farm and the reactors fit.
  outfit.fitComponent(WINGS_IROSA);
  outfit.fitComponent(RADIATORS_DOUBLE);
  for (const id of [`plano-equipo-${EQ_EBW.id}`, `plano-equipo-${EQ_COMPOSITES.id}`, `plano-modulo-${MOD_FARM.id}`, `plano-equipo-${EQ_CROPS.id}`, ...extra]) {
    st.fabricate(bp(id));
    st.tick(1e4);
  }
  const stock = new MaterialStock({ fertilizante: 4, resina: 120 });
  const ops = new BioOps(outfit, stock, BIO_PROCESSES, {
    needs: CREW_NEEDS,
    kcalPerKg: BIO_KCAL_PER_KG,
    uses: BIO_OUTPUT_USE,
    larderUnits: LARDER_UNITS,
    crew: () => 1,
    eatersKcalPerDay: () => 4000,
    resinImportedKg: 120,
  });
  return { st, outfit, stock, ops };
}

describe("BioOps: the station's living machines", () => {
  it("the lab is locked until the agricultural module is built; reactors until the lab", () => {
    const outfit = startingOutfit();
    const st = new Station(POLANA_STATION, new MaterialStock({}), new Hangar(), outfit);
    expect(st.locked(bp(`plano-equipo-${EQ_BIO_LAB.id}`))).toMatch(/módulo agrícola/);
    expect(st.locked(bp(`plano-equipo-${EQ_SPIRULINA.id}`))).toMatch(/Laboratorio de biología/);
    const g = grownStation();
    expect(g.st.locked(bp(`plano-equipo-${EQ_BIO_LAB.id}`))).toBeUndefined();
  });

  it("the crop fields start by themselves once built and make oxygen and grain from the crew's CO₂", () => {
    const { ops, stock } = grownStation();
    ops.tick(24);
    const crops = ops.status().find((s) => s.process.id === "cultivo")!;
    expect(crops.installed).toBe(true);
    expect(crops.state).toBe("en-marcha");
    expect(stock.amount("oxigeno")).toBeGreaterThan(0);
    expect(stock.amount("grano")).toBeGreaterThan(0);
    expect(stock.amount("biomasa")).toBeGreaterThan(0);
    // One person exhales 1,04 kg of CO₂ a day; the 60 m² want ~1,85 kg: CO₂ holds them back.
    expect(crops.run.short).toBe("co2");
  });

  it("a reactor is tuned with a chain of challenges about power, balance and destinations", () => {
    const { ops, stock } = grownStation([`plano-equipo-${EQ_BIO_LAB.id}`, `plano-equipo-${EQ_LOOP.id}`]);
    expect(ops.tuneBlocker("espirulina")).toMatch(/Monta antes/);
    expect(() => ops.startTuning("espirulina")).toThrow();
    ops.tick(48);
    const s = ops.startTuning("bucle");
    expect(s.chore.kind).toBe("ajustar-biorreactor");
    expect(CHORE_CATEGORY[s.chore.kind]).toBe("plantas");
    expect(s.chore.exercises.length).toBe(4);
    const text = JSON.stringify(s.chore.exercises);
    expect(text).toMatch(/kWh/);
    expect(text).toMatch(/fertilizante|CO₂|co2/);
    while (s.run.current) s.answer(solve(s.run.current));
    expect(s.run.status).toBe("done");
    expect(ops.lab.state("bucle")).toBe("en-marcha");
    const before = stock.amount("fertilizante");
    ops.tick(24);
    expect(ops.lab.run("bucle").k).toBeGreaterThan(0);
    expect(ops.lab.made.fertilizante).toBeGreaterThan(0);
    expect(stock.amount("fertilizante")).toBeLessThan(before);
    // Drifts after the tuned hours.
    ops.tick(BIO_TUNING.tunedHours);
    expect(ops.lab.state("bucle")).toBe("desajustado");
  });

  it("the gauge shows nitrogen honestly: the loop gives back about half, the rest is imported", () => {
    const { ops } = grownStation([`plano-equipo-${EQ_BIO_LAB.id}`, `plano-equipo-${EQ_LOOP.id}`]);
    ops.tick(1);
    const s = ops.startTuning("bucle");
    while (s.run.current) s.answer(solve(s.run.current));
    ops.tick(24);
    const n = ops.gauge().find((r) => r.id === "nitrogeno")!;
    expect(n.share).toBeGreaterThan(0.3);
    expect(n.share).toBeLessThan(0.8);
    expect(n.imported).toBeGreaterThan(0);
    expect(ops.gauge().find((r) => r.id === "agua")!.share).toBe(1);
  });

  it("the nitrogen hook: a local source plugged in closes the gauge's gap", () => {
    const { ops } = grownStation();
    ops.tick(24);
    const need = ops.gauge().find((r) => r.id === "nitrogeno")!.need;
    ops.nitrogenSources.push({ id: "cometa", label: "Amoníaco de cometa", kgNPerDay: need, local: true });
    expect(ops.gauge().find((r) => r.id === "nitrogeno")!.share).toBeCloseTo(1);
  });

  it("with ammonia fertiliser on, store ammonia covers the fertiliser the crops run short of", () => {
    const { ops, stock } = grownStation();
    stock.take({ fertilizante: 4 });
    stock.add({ amoniaco: 1 });
    ops.tick(24);
    expect(ops.lab.run("cultivo").short).toBe("fertilizante");
    ops.ammoniaFertiliser = true;
    ops.tick(24);
    expect(ops.lab.run("cultivo").short).not.toBe("fertilizante");
    expect(stock.amount("amoniaco")).toBeLessThan(1);
    expect(ops.nitrogen().some((n) => n.id === "amoniaco" && n.local)).toBe(true);
  });

  it("food goes to the mothership's larder in whole units", () => {
    const { ops, stock } = grownStation();
    stock.add({ grano: 0.5, proteina: 0.0105 });
    const larder: Record<string, number> = {};
    const sent = ops.shipToLarder({ stock: (item, n) => (larder[item] = (larder[item] ?? 0) + n) });
    expect(larder.harina).toBe(4);
    expect(larder["pienso-gatos"]).toBe(10);
    expect(stock.amount("grano")).toBeCloseTo(0.02);
    expect(sent.length).toBe(2);
  });
});
