import { describe, expect, it } from "vitest";
import { isCorrect, type Answer, type Exercise } from "@modules/mind-duel/domain/exercise";
import { MaterialStock } from "@modules/station/domain/materials";
import { Hangar } from "@modules/station/domain/hangar";
import { Station } from "@modules/station/domain/station";
import { POLANA_STATION } from "@modules/station/data/station";
import { cargoMaterial } from "@modules/station/data/materials";
import { CARRIERS, SUPPLY_ITEMS, SUPPLY_LIMITS, supplyItem } from "@modules/station/data/component-supply";
import { catalogueMassOf } from "@modules/station/data/vehicle-catalogue";
import type { StationSession } from "@modules/station/application/station-ops";
import { LAUNCHERS, TRANSFER_STAGE, GAME_HOURS_PER_TRANSIT_DAY } from "../data/launchers";
import { MASS_DRIVER, TUG } from "../data/craft";
import { importGood } from "../data/goods";
import { Wallet } from "../domain/wallet";
import { ImportOps } from "./import-ops";
import { ComponentImports } from "./component-imports";

const right = (ex: Exercise): Answer => (ex.kind === "order" ? { kind: "order", order: ex.solution } : { kind: "choice", index: ex.correct });
const solve = (s: StationSession) => {
  for (const ex of s.chore.exercises) {
    expect(isCorrect(ex, right(ex))).toBe(true);
    s.answer(right(ex));
  }
  expect(s.run.status).toBe("done");
};

function setup(credits = 0) {
  const station = new Station(POLANA_STATION, new MaterialStock({}), new Hangar());
  const ops = new ImportOps(station, new Wallet(credits), {
    regionAU: () => 1.1264,
    bodies: () => [],
    toMaterial: cargoMaterial,
    launchers: LAUNCHERS,
    stage: { ispS: TRANSFER_STAGE.ispS.value, tankage: TRANSFER_STAGE.tankage.value },
    gameHoursPerTransitDay: GAME_HOURS_PER_TRANSIT_DAY,
    kgPerUnit: (id) => importGood(id)?.kgPerUnit ?? 1,
    tug: TUG,
    driver: MASS_DRIVER,
  });
  const imports = new ComponentImports(ops, SUPPLY_ITEMS, CARRIERS, LAUNCHERS, SUPPLY_LIMITS.arm.maxPayloadKg, (id) => supplyItem(id)?.massKg.value ?? catalogueMassOf(id));
  return { ops, station, imports };
}

describe("components by import (IMP-10, IMP-11)", () => {
  it("what the vehicles in play carry is de serie and is not imported on its own", () => {
    const { imports } = setup(1e6);
    expect(imports.offer("lm-dps").blocker).toMatch(/De serie en el módulo lunar/);
    expect(imports.offer("juventas-gas-frio").blocker).toMatch(/De serie en Juventas/);
    expect(imports.offer("raptor-2").blocker).toMatch(/De serie en la Starship/);
  });

  it("tiers open one at a time: tier 2 over the LM's own engine, tier 3 only after a tier-2 engine", () => {
    const { imports, ops } = setup(1e6);
    const r4d = imports.offer("aerojet-r-4d");
    expect(r4d.unlocked).toBe(true);
    expect(r4d.blocker).toBeUndefined();
    const hipat = imports.offer("aerojet-r-4d-15-hipat");
    expect(hipat.unlocked).toBe(false);
    expect(hipat.blocker).toMatch(/Primero el nivel 2/);
    solve(imports.start(r4d));
    expect(imports.inTransit("aerojet-r-4d")).toBe(1);
    expect(imports.offer("aerojet-r-4d-15-hipat").blocker).toBeUndefined();
    // It lands in the hangar after the real Hohmann transfer, on the station clock.
    ops.tick(r4d.quote.gameHours + 0.01);
    imports.tick();
    expect(ops.station.hangar.count("aerojet-r-4d")).toBe(1);
    expect(imports.drainEvents()).toEqual([{ type: "llega", label: expect.stringMatching(/R-4D-11/), parts: { "aerojet-r-4d": 1 } }]);
  });

  it("price is the real launch price per kg in LEO; without credits it says how many are missing", () => {
    const { imports } = setup(10);
    const o = imports.offer("aerojet-r-4d");
    expect(o.shipment.launcher?.id).toBe("falcon-heavy");
    expect(o.quote.credits).toBe(Math.ceil((o.kg * o.quote.leoKgPerKg * 1410) / 1000 - 1e-9));
    expect(o.blocker).toMatch(/Faltan .* créditos/);
    expect(o.unlocked).toBe(true);
  });

  it("small cargo flies in Cygnus (pressurised) or in Dragon's trunk (outside); a heavy part flies on its own and needs a bigger launcher", () => {
    const { imports } = setup(1e9);
    expect(imports.offer("li-ion-78").shipment.carrier).toMatchObject({ id: "cygnus" });
    expect(imports.offer("aerojet-r-4d").shipment.carrier).toMatchObject({ id: "dragon" });
    const raptor3 = imports.offer("raptor-3");
    expect(raptor3.shipment.carrier).toMatchObject({ id: "dragon" });
    const haven = imports.offer("haven-1-modulo");
    expect(haven.shipment.carrier).toBe("libre");
  });

  it("a whole vehicle: what it lacks comes in one shipment, and lands as its parts", () => {
    const { imports, ops } = setup(1e6);
    const o = imports.offerVehicle("Juventas", { "juventas-bus": 1, jura: 1 }, "presurizada");
    expect(o.blocker).toBeUndefined();
    expect(o.kg).toBeGreaterThan(1);
    solve(imports.start(o));
    ops.tick(o.quote.gameHours + 0.01);
    imports.tick();
    expect(ops.station.hangar.count("juventas-bus")).toBe(1);
    expect(ops.station.hangar.count("jura")).toBe(1);
    expect(imports.offerVehicle("Nada", {}, "exterior").blocker).toMatch(/No le falta nada/);
  });
});
