import { describe, expect, it } from "vitest";
import { ChoreRun } from "@modules/chores/domain/chore";
import type { Answer, Exercise } from "@modules/mind-duel/domain/exercise";
import { planContinuousBurn, planTransfer } from "../domain/transfer";
import { carrierTripChore, duration, tripChore } from "./trip-chore";

const plan = planTransfer({ distanceM: 9400, accelMS2: 490 / 681, deltaVAvailableMS: 930 });
const chore = tripChore({ targetId: "242916", targetName: "242916 (2006 OS2)", plan, approachM: 300, thrustN: 490, massKg: 681, deltaVAvailableMS: 930, detours: 1 });
const right = (ex: Exercise): Answer => (ex.kind === "order" ? { kind: "order", order: ex.solution } : { kind: "choice", index: ex.correct });
const answerText = (ex: Exercise) => (ex.kind === "choice" ? ex.options[ex.correct]! : "");

describe("tripChore", () => {
  it("covers the five kinds of challenge with the hop's real numbers", () => {
    const kinds = chore.exercises.map((e) => (e.kind === "order" ? "ordenar" : e.skill));
    expect(kinds).toEqual(["ordenar", "completar", "predecir", "reparar", "especificar"]);
    const [seq, dv, time, fix] = chore.exercises;
    // Order: orient, burn, coast, flip, brake (and a trap block left out).
    expect(seq!.kind === "order" && seq!.blocks.length - seq!.solution.length).toBe(1);
    expect(answerText(dv!)).toBe("50 m/s");
    expect(answerText(time!)).toBe(duration(9400 / 25 + 25 / (490 / 681)));
    expect(answerText(fix!)).toContain("v² / (2 × a)");
  });

  it("each choice has a single right option", () => {
    for (const e of chore.exercises) if (e.kind === "choice") expect(new Set(e.options).size).toBe(e.options.length);
  });

  it("can be solved with the chore engine", () => {
    const run = new ChoreRun(chore);
    while (run.current) run.submit(right(run.current));
    expect(run.status).toBe("done");
  });

  it("formats durations in minutes and seconds", () => {
    expect(duration(38.4)).toBe("38 s");
    expect(duration(410)).toBe("6 min 50 s");
  });
});

describe("NAV-09 Starship's trip chore: burn, coast and brake with the vacuum Raptors", () => {
  const p = planContinuousBurn(2_000_000, 4.7, 500);
  const c = carrierTripChore({
    targetId: "bennu",
    targetName: "Bennu",
    carrierName: "Starship",
    plan: p,
    thrusterCount: 3,
    engineName: "motores Raptor de vacío",
    propellantName: "metano y oxígeno",
    thrustN: 7_590_000,
    massKg: 1_600_000,
    deltaVAvailableMS: 10_000,
    burnDays: 0.003,
    propellantKg: 380_000,
    parkingM: 2000,
    approachM: 300,
    detours: 0,
  });

  it("says what pushes it and what it burns, and the answers are the coasting ones", () => {
    expect(c.scenario).toMatch(/3 motores Raptor de vacío/);
    expect(c.scenario).toMatch(/metano y oxígeno/);
    expect(c.scenario).not.toMatch(/xenón|eléctricos/);
    const order = c.exercises[0]!;
    expect(order.kind === "order" && order.blocks.find((b) => order.solution.includes(b.id) && /inercia/.test(b.pseudo))).toBeTruthy();
    expect(answerText(c.exercises[2]!)).toBe(duration(p.totalS));
    const run = new ChoreRun(c);
    while (run.current) run.submit(right(run.current));
    expect(run.status).toBe("done");
  });
});
