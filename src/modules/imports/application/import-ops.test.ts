import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { G } from "@core/units";
import { isCorrect, type Answer, type Exercise } from "@modules/mind-duel/domain/exercise";
import { COMETS } from "@modules/celestial/data/comets";
import { MaterialStock } from "@modules/station/domain/materials";
import { Hangar } from "@modules/station/domain/hangar";
import { Station } from "@modules/station/domain/station";
import { POLANA_STATION } from "@modules/station/data/station";
import { cargoMaterial } from "@modules/station/data/materials";
import { LAUNCHERS, TRANSFER_STAGE, GAME_HOURS_PER_TRANSIT_DAY } from "../data/launchers";
import { MASS_DRIVER, MASS_DRIVER_CRAFT, TUG, TUG_CRAFT } from "../data/craft";
import { importGood } from "../data/goods";
import { Wallet } from "../domain/wallet";
import { ImportOps, type ImportBody } from "./import-ops";
import type { StationSession } from "@modules/station/application/station-ops";

const right = (ex: Exercise): Answer => (ex.kind === "order" ? { kind: "order", order: ex.solution } : { kind: "choice", index: ex.correct });
const solve = (s: StationSession) => {
  for (const ex of s.chore.exercises) {
    if (ex.kind === "choice") expect(new Set(ex.options).size).toBe(ex.options.length);
    expect(isCorrect(ex, right(ex))).toBe(true);
    s.answer(right(ex));
  }
  expect(s.run.status).toBe("done");
};

const c67p = COMETS.find((c) => c.id === "67p")!;
const body: ImportBody = {
  id: c67p.id,
  name: c67p.name,
  position: new Vec3(12000, -4000, -9000),
  meanRadiusM: c67p.meanRadiusM.value,
  densityKgM3: c67p.densityKgM3.value,
  escapeSpeedMs: Math.sqrt((2 * G * c67p.massKg.value) / c67p.meanRadiusM.value),
  composition: c67p.composition,
  comet: true,
};

function setup(opts: { credits?: number; crafts?: boolean } = {}) {
  const hangar = new Hangar();
  if (opts.crafts) {
    hangar.addCraft(TUG_CRAFT);
    hangar.addCraft(MASS_DRIVER_CRAFT);
  }
  const station = new Station(POLANA_STATION, new MaterialStock({ xenon: 50 }), hangar);
  const letters: string[] = [];
  const ops = new ImportOps(station, new Wallet(opts.credits ?? 0), {
    regionAU: () => 2.1,
    bodies: () => [body],
    toMaterial: cargoMaterial,
    launchers: LAUNCHERS,
    stage: { ispS: TRANSFER_STAGE.ispS.value, tankage: TRANSFER_STAGE.tankage.value },
    gameHoursPerTransitDay: GAME_HOURS_PER_TRANSIT_DAY,
    kgPerUnit: (id) => importGood(id)?.kgPerUnit ?? 1,
    tug: TUG,
    driver: MASS_DRIVER,
    onOrder: (q) => letters.push(`${q.credits}`),
  });
  return { ops, station, letters };
}

describe("imports from the Sanctuary", () => {
  it("a kit costs its 25 kg times the multiplier times the launch price; cheaper launchers cost less", () => {
    const { ops } = setup();
    const f9 = ops.quote({ kit: 1 }, "falcon-9");
    const ss = ops.quote({ kit: 1 }, "starship");
    expect(f9.massKg).toBe(25);
    expect(f9.credits).toBeGreaterThan(ss.credits * 20);
    expect(ops.orderBlocker({ kit: 1 }, "falcon-9")).toMatch(/Faltan/);
    expect(ops.orderBlocker({}, "falcon-9")).toMatch(/vacío/);
  });

  it("solving the order pays the credits, posts Nevaeh's answer, and the goods land after the transit", () => {
    const { ops, station, letters } = setup({ credits: 5000 });
    const q = ops.quote({ kit: 2, xenon: 10 }, "falcon-heavy");
    const s = ops.startOrder({ kit: 2, xenon: 10 }, "falcon-heavy", "2 kits y 10 kg de xenón");
    solve(s);
    expect(ops.wallet.balance).toBe(5000 - q.credits);
    expect(letters).toEqual([`${q.credits}`]);
    ops.tick(q.gameHours - 1);
    expect(station.stock.amount("kit")).toBe(0);
    ops.tick(1.01);
    expect(station.stock.amount("kit")).toBe(2);
    expect(station.stock.amount("xenon")).toBe(60);
    expect(ops.drainEvents().map((e) => e.type)).toEqual(["pedido", "llegada"]);
  });
});

describe("the station's own sources", () => {
  it("works on any body, no subjugation needed: only the tug home, xenon and the arms' size", () => {
    expect(setup({ crafts: true }).ops.towBlocker("67p", 2)).toBeUndefined();
    expect(setup().ops.towBlocker("67p", 2)).toMatch(/Construye/);
    expect(setup({ crafts: true }).ops.towBlocker("67p", 5)).toMatch(/4 m/);
    expect(setup({ crafts: true }).ops.installBlocker("67p")).toBeUndefined();
  });

  it("other mechanics can send goods to the station through the inbox", () => {
    const { ops, station } = setup();
    ops.inbox.send("asteroide", "Agua de 242916", { agua: 12 }, 2);
    ops.tick(2.01);
    expect(station.stock.amount("agua")).toBe(12);
    expect(ops.drainEvents()).toMatchObject([{ type: "llegada" }]);
  });

  it("the tug hauls a comet boulder: water ice and CO2 ice reach the store, CO boils away", () => {
    const { ops, station } = setup({ crafts: true });
    const plan = ops.towPlan("67p", 2);
    solve(ops.startTow("67p", 2));
    expect(ops.tug).toBeUndefined();
    expect(ops.tow?.bodyName).toBe(c67p.name);
    expect(station.stock.amount("xenon")).toBeCloseTo(50 - plan.xenonKg, 6);
    ops.tick(plan.totalHours + 0.01);
    expect(ops.tug).toBeDefined();
    expect(station.stock.amount("hielo-agua")).toBeGreaterThan(300);
    expect(station.stock.amount("hielo-co2")).toBeGreaterThan(40);
    const lost = ops.goodsFrom(body, plan.boulderKg).lostKg;
    expect(lost).toBeGreaterThan(0);
  });

  it("a mass driver set on the comet (not subjugated) sends a small package every few hours", () => {
    const { ops, station } = setup({ crafts: true });
    solve(ops.startInstall("67p"));
    expect(ops.driverCraft).toBeUndefined();
    expect(station.hangar.crafts.some((c) => c.kind === "lanzador")).toBe(false);
    expect(ops.installBlocker("67p")).toMatch(/Construye|Ya tiene/);
    ops.tick(MASS_DRIVER.packHours * 3);
    ops.tick(1);
    const kg = station.stock.entries().reduce((s, [id, n]) => (id === "xenon" ? s : s + n), 0);
    expect(kg).toBeGreaterThan(0);
    expect(kg).toBeLessThanOrEqual(3 * MASS_DRIVER.packageKg + 1e-6);
    expect(ops.drainEvents().filter((e) => e.type === "paquete").length).toBe(3);
  });
});
