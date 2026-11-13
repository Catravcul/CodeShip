import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Quat } from "@core/math/quat";
import { isCorrect, type Answer, type Exercise } from "@modules/mind-duel/domain/exercise";
import { Ship } from "@modules/ship/domain/ship";
import { explorerDesign } from "@modules/ship/data/explorer";
import { HELIUM_KG_M3, MMH_NTO_MIXTURE_RATIO, PROPELLANT_DENSITY } from "@modules/ship/data/propellants";
import { Mothership } from "@modules/mothership/domain/mothership";
import { NODRIZA } from "@modules/mothership/data/mothership";
import { MaterialStock } from "../domain/materials";
import { Hangar } from "../domain/hangar";
import { Station } from "../domain/station";
import { POLANA_STATION, STARTING_STOCK } from "../data/station";
import { HELIUM_PER_KG_PAIR, PROPELLANT_MATERIALS, REFUEL_TUNING, RefuelOps, mothershipRefuelTarget, shipRefuelTarget } from "./refuel";

const right = (ex: Exercise): Answer => (ex.kind === "order" ? { kind: "order", order: ex.solution } : { kind: "choice", index: ex.correct });

/** The Explorer with its pair at 100 kg and its hydrazine at 5 kg. */
function drainedShip(): Ship {
  const d = explorerDesign();
  return Ship.create({ ...d, tanks: [{ spec: d.tanks[0]!.spec, fillKg: 100 }, { spec: d.tanks[1]!.spec, fillKg: 5 }] });
}

function setup(stock: Record<string, number> = { ...STARTING_STOCK }, docked = { ship: true, mother: true }) {
  const station = new Station(POLANA_STATION, new MaterialStock(stock), new Hangar());
  const ship = drainedShip();
  const mother = new Mothership(NODRIZA, Vec3.ZERO, Quat.IDENTITY, NODRIZA.propellantCapacityKg - 5000);
  const ops = new RefuelOps(station, [shipRefuelTarget(ship, "explorador", () => docked.ship), mothershipRefuelTarget(mother, () => docked.mother)]);
  return { station, ship, mother, ops, docked };
}

describe("what each propellant takes from the store", () => {
  it("the pair splits at O/F 1,65 and its helium refills the emptied volume at the regulated pressure", () => {
    const pair = PROPELLANT_MATERIALS["MMH/NTO"];
    expect(pair.mmh! + pair.nto!).toBeCloseTo(1, 9);
    expect(pair.nto! / pair.mmh!).toBeCloseTo(MMH_NTO_MIXTURE_RATIO, 9);
    // Volume per kg of the mix × helium at 20 bar (NIST): about 2,8 g of helium per kg loaded.
    expect(HELIUM_PER_KG_PAIR).toBeCloseTo(HELIUM_KG_M3.tank.value / PROPELLANT_DENSITY["MMH/NTO"].value, 9);
    expect(HELIUM_PER_KG_PAIR).toBeCloseTo(0.0028, 4);
    expect(PROPELLANT_MATERIALS.Hydrazine).toEqual({ hidracina: 1 });
  });
});

describe("refuelling a docked craft", () => {
  it("plans to fill the probe's tanks from the store", () => {
    const { ops, ship } = setup();
    const s = ops.status("explorador");
    const pairRoom = ship.propellantCapacityKg("MMH/NTO") - 100;
    expect(s.plan.map((p) => p.loadKg)).toEqual([pairRoom, 40]);
    expect(s.takes.mmh).toBeCloseTo(pairRoom / 2.65, 6);
    expect(s.takes.nto).toBeCloseTo((pairRoom * 1.65) / 2.65, 6);
    expect(s.hours).toBeCloseTo((pairRoom + 40) / REFUEL_TUNING.probeKgPerHour.value, 6);
    expect(s.canStart).toBe(true);
  });

  it("solving the chain queues the transfer; game hours later the tanks are full", () => {
    const { ops, ship, station } = setup();
    const s = ops.startRefuel("explorador");
    const ex = s.chore.exercises;
    expect(s.chore.kind).toBe("repostar");
    expect(ex[0]!.kind).toBe("choice");
    if (ex[0]!.kind === "choice") expect(ex[0]!.options[ex[0]!.correct]).toBe("210,45 kg"); // 338 kg × 1,65 / 2,65
    for (const e of ex) {
      expect(isCorrect(e, right(e))).toBe(true);
      s.answer(right(e));
    }
    expect(s.run.status).toBe("done");
    expect(station.queue("repostaje")).toHaveLength(1);
    expect(station.stock.amount("mmh")).toBeCloseTo(170 - 338 / 2.65, 6);
    // Nothing is on board until the line has run.
    expect(ship.propellantKg("MMH/NTO")).toBe(100);
    expect(ops.status("explorador").loadKg).toBe(0);
    station.tick(ops.status("explorador").jobs[0]!.hoursTotal);
    expect(ship.propellantKg("MMH/NTO")).toBeCloseTo(ship.propellantCapacityKg("MMH/NTO"), 6);
    expect(ship.propellantKg("Hydrazine")).toBeCloseTo(45, 6);
  });

  it("fills the mothership's xenon, and only when docked", () => {
    const { ops, mother, station, docked } = setup();
    expect(ops.status("nodriza").loadKg).toBe(5000);
    docked.mother = false;
    expect(ops.status("nodriza").canStart).toBe(false);
    expect(() => ops.startRefuel("nodriza")).toThrow();
    docked.mother = true;
    const s = ops.startRefuel("nodriza");
    for (const e of s.chore.exercises) s.answer(right(e));
    station.tick(5000 / REFUEL_TUNING.xenonKgPerHour.value);
    expect(mother.propellantKg).toBe(NODRIZA.propellantCapacityKg);
    expect(station.stock.amount("xenon")).toBe(15000);
  });

  it("with no propellant in store there is nothing to start", () => {
    const { ops } = setup({});
    const s = ops.status("explorador");
    expect(s.loadKg).toBe(0);
    expect(s.plan[0]!.shortOf).toBe("mmh");
    expect(() => ops.startRefuel("explorador")).toThrow();
  });
});
