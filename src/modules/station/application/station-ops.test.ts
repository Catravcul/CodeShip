import { describe, expect, it } from "vitest";
import { failingAnswer } from "@modules/chores/domain/testing";
import { isCorrect, type Answer, type Exercise } from "@modules/mind-duel/domain/exercise";
import { MaterialStock } from "../domain/materials";
import { Hangar } from "../domain/hangar";
import { Station } from "../domain/station";
import { BLUEPRINTS, blueprintForPart } from "../data/blueprints";
import { REFINE_PROCESSES } from "../data/processes";
import { POLANA_STATION, STARTING_STOCK } from "../data/station";
import { materialName } from "../data/materials";
import { StationOps } from "./station-ops";
import { fabricationChore, growthChore, refineChore } from "./challenges";
import { startingOutfit, EQ_CARBONYL, EQ_EBW, RADIATORS_DOUBLE, STATION_COMPONENTS, WINGS_IROSA } from "../data/outfit";
import { applyStationRefit, stationOptions, stationRefitChore } from "./station-refit";

const right = (ex: Exercise): Answer => (ex.kind === "order" ? { kind: "order", order: ex.solution } : { kind: "choice", index: ex.correct });
const wrong = (ex: Exercise): Answer => (ex.kind === "order" ? { kind: "order", order: [...ex.solution].reverse() } : { kind: "choice", index: (ex.correct + 1) % ex.options.length });
const valid = (ex: Exercise) => {
  expect(isCorrect(ex, right(ex))).toBe(true);
  if (ex.kind === "choice") expect(new Set(ex.options).size).toBe(ex.options.length);
};
const ops = (stock: Record<string, number> = { ...STARTING_STOCK }) => new StationOps(new Station(POLANA_STATION, new MaterialStock(stock), new Hangar()), BLUEPRINTS, REFINE_PROCESSES, materialName);

describe("station challenges", () => {
  it("fabricating asks for the feedstock from the real mass and yield, then what is left in store", () => {
    const stock = new MaterialStock(STARTING_STOCK);
    const bp = blueprintForPart("aerojet-mr-104h")!;
    const c = fabricationChore(bp, stock, materialName);
    c.exercises.forEach(valid);
    const [mass, left] = c.exercises as [Exercise & { kind: "choice" }, Exercise & { kind: "choice" }];
    expect(mass.options[mass.correct]).toBe("3 kg"); // 2,4 kg / 0,8
    expect(left.options[left.correct]).toBe("28,2 kg"); // 30 kg of iron − 0,6 × 3 kg
    expect(c.exercises.at(-1)!.kind).toBe("order");
  });

  it("refining predicts the batch output and asks the real temperatures of the process", () => {
    const stock = new MaterialStock({ "mineral-hierro": 100, "mineral-niquel": 6, carbono: 4 });
    const c = refineChore(REFINE_PROCESSES.find((p) => p.id === "carbonilo")!, stock, materialName);
    c.exercises.forEach(valid);
    const out = c.exercises[0] as Exercise & { kind: "choice" };
    expect(out.options[out.correct]).toBe("80 kg");
    expect(c.exercises.some((e) => e.kind === "choice" && e.options[e.correct] === "50 °C")).toBe(true);
  });

  it("every blueprint and process makes valid challenges", () => {
    const stock = new MaterialStock({ ...STARTING_STOCK, "agua-hidratada": 20, "mineral-hierro": 100, "mineral-niquel": 6, silicatos: 100 });
    for (const bp of BLUEPRINTS) fabricationChore(bp, stock, materialName).exercises.forEach(valid);
    for (const p of REFINE_PROCESSES) refineChore(p, stock, materialName).exercises.forEach(valid);
  });
});

describe("station ops", () => {
  it("lists what can be built and what is missing", () => {
    const plans = ops().plans();
    const tank = plans.find((p) => p.blueprint.id === "plano-tanque-n2h4-80397")!;
    expect(tank.canBuild).toBe(true);
    const big = plans.find((p) => p.blueprint.id === "plano-aerojet-mr-107t")!;
    expect(big.canBuild).toBe(false);
    expect(big.missing.niquel).toBeGreaterThan(0);
  });

  it("solving the chain takes the materials and queues the job; failing changes nothing", () => {
    const o = ops();
    const fail = o.startFabrication("plano-tanque-n2h4-80397");
    while (fail.run.status === "doing") fail.answer(failingAnswer(fail.run));
    expect(o.station.queue()).toHaveLength(0);
    expect(o.station.stock.amount("hierro")).toBe(30);

    const s = o.startFabrication("plano-tanque-n2h4-80397");
    while (s.run.status === "doing") s.answer(right(s.run.current!));
    expect(o.station.queue("soldadora")).toHaveLength(1);
    expect(o.station.stock.amount("hierro")).toBeLessThan(30);
    o.station.tick(100);
    expect(o.station.hangar.count("tanque-n2h4-80397")).toBe(1);
    expect(o.plans().find((p) => p.blueprint.id === "plano-tanque-n2h4-80397")!.inHangar).toBe(1);
  });

  it("cannot start what it has no materials for", () => {
    expect(() => ops({}).startFabrication("plano-tanque-n2h4-80397")).toThrow();
    expect(() => ops({}).startRefining("mre")).toThrow();
    expect(ops({ silicatos: 50 }).refining().find((r) => r.process.id === "mre")!.scale).toBeCloseTo(0.5);
  });

  it("a probe goes to the hangar as a craft", () => {
    const o = ops({ hierro: 100, carbono: 20, niquel: 10, ceramica: 10, kit: 5 });
    const s = o.startFabrication("plano-sonda");
    while (s.run.status === "doing") s.answer(right(s.run.current!));
    o.station.tick(100);
    expect(o.station.hangar.crafts.map((c) => c.kind)).toEqual(["sonda"]);
  });
});

describe("station ops with an outfit (the station grows)", () => {
  const grown = (stock: Record<string, number> = { ...STARTING_STOCK }) => new StationOps(new Station(POLANA_STATION, new MaterialStock(stock), new Hangar(), startingOutfit()), BLUEPRINTS, REFINE_PROCESSES, materialName);

  it("plans say which kind each blueprint is and why a locked one is locked", () => {
    const plans = grown().plans();
    expect(new Set(plans.map((p) => p.kind))).toEqual(new Set(["modulo", "equipo", "componente"]));
    const tank = plans.find((p) => p.blueprint.id === "plano-tanque-n2h4-80397")!;
    expect(tank.canBuild).toBe(false);
    expect(tank.locked).toMatch(/Soldadora/);
    const reactor = plans.find((p) => p.blueprint.id === `plano-equipo-${EQ_CARBONYL.id}`)!;
    expect(reactor.locked).toBeUndefined();
    expect(reactor.canBuild).toBe(true);
    expect(plans.find((p) => p.blueprint.id === "plano-equipo-impresora")).toBeUndefined();
    expect(grown().refining().find((r) => r.process.id === "carbonilo")!.locked).toMatch(/carbonilo/);
  });

  it("building equipment is a chain: power left, store left, then the steps; solving it queues the job", () => {
    const o = grown();
    const s = o.startFabrication(`plano-equipo-${EQ_EBW.id}`);
    s.chore.exercises.forEach(valid);
    const power = s.chore.exercises[0] as Exercise & { kind: "choice" };
    const out = o.station.outfit!;
    expect(power.options[power.correct]).toBe(`${(Math.round((out.capacityKw - out.drawKw - EQ_EBW.powerKw) * 100) / 100).toLocaleString("es-ES")} kW`);
    while (s.run.status === "doing") s.answer(right(s.run.current!));
    expect(o.station.queue("impresora")).toHaveLength(1);
    o.station.tick(1000);
    expect(out.has(EQ_EBW.id)).toBe(true);
    expect(o.plans().find((p) => p.blueprint.id === `plano-equipo-${EQ_EBW.id}`)!.built).toBe(true);
    expect(o.plans().find((p) => p.blueprint.id === "plano-tanque-n2h4-80397")!.canBuild).toBe(true);
  });

  it("every growth blueprint makes a valid chain", () => {
    const out = startingOutfit();
    const stock = new MaterialStock({ hierro: 5000, niquel: 500, ceramica: 500, carbono: 1000, agua: 1000, kit: 200 });
    for (const bp of BLUEPRINTS.filter((b) => b.product.kind === "module" || b.product.kind === "equipment")) growthChore(bp, out, stock, materialName).exercises.forEach(valid);
  });

  it("the Estación tab swaps a station component from the hangar; the old one goes back", () => {
    const out = startingOutfit();
    const hangar = new Hangar();
    expect(stationOptions(out, "radiadores", STATION_COMPONENTS, hangar)[0]!.locked).toMatch(/hangar/);
    hangar.put(RADIATORS_DOUBLE.id);
    const opt = stationOptions(out, "radiadores", STATION_COMPONENTS, hangar)[0]!;
    expect(opt.locked).toBeUndefined();
    const chore = stationRefitChore(out, RADIATORS_DOUBLE);
    chore.exercises.forEach(valid);
    const c = chore.exercises[0] as Exercise & { kind: "choice" };
    expect(c.options[c.correct]).toBe("124 kW");
    applyStationRefit(out, RADIATORS_DOUBLE, hangar);
    expect(out.component("radiadores")).toBe(RADIATORS_DOUBLE);
    expect(hangar.count("radiadores-eatcs")).toBe(1);
    expect(hangar.count(RADIATORS_DOUBLE.id)).toBe(0);
    expect(() => applyStationRefit(out, WINGS_IROSA, hangar)).toThrow();
  });
});
