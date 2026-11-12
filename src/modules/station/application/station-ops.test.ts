import { describe, expect, it } from "vitest";
import { isCorrect, type Answer, type Exercise } from "@modules/mind-duel/domain/exercise";
import { MaterialStock } from "../domain/materials";
import { Hangar } from "../domain/hangar";
import { Station } from "../domain/station";
import { BLUEPRINTS, blueprintForPart } from "../data/blueprints";
import { REFINE_PROCESSES } from "../data/processes";
import { POLANA_STATION, STARTING_STOCK } from "../data/station";
import { materialName } from "../data/materials";
import { StationOps } from "./station-ops";
import { fabricationChore, refineChore } from "./challenges";

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
    const tank = plans.find((p) => p.blueprint.id === "plano-tanque-n2h4-80")!;
    expect(tank.canBuild).toBe(true);
    const big = plans.find((p) => p.blueprint.id === "plano-aerojet-mr-107t")!;
    expect(big.canBuild).toBe(false);
    expect(big.missing.niquel).toBeGreaterThan(0);
  });

  it("solving the chain takes the materials and queues the job; failing changes nothing", () => {
    const o = ops();
    const fail = o.startFabrication("plano-tanque-n2h4-80");
    while (fail.run.status === "doing") fail.answer(wrong(fail.run.current!));
    expect(o.station.queue()).toHaveLength(0);
    expect(o.station.stock.amount("hierro")).toBe(30);

    const s = o.startFabrication("plano-tanque-n2h4-80");
    while (s.run.status === "doing") s.answer(right(s.run.current!));
    expect(o.station.queue("fundicion")).toHaveLength(1);
    expect(o.station.stock.amount("hierro")).toBeLessThan(30);
    o.station.tick(100);
    expect(o.station.hangar.count("tanque-n2h4-80")).toBe(1);
    expect(o.plans().find((p) => p.blueprint.id === "plano-tanque-n2h4-80")!.inHangar).toBe(1);
  });

  it("cannot start what it has no materials for", () => {
    expect(() => ops({}).startFabrication("plano-tanque-n2h4-80")).toThrow();
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
