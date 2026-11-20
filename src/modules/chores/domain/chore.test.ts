import { describe, expect, it } from "vitest";
import type { Exercise, OrderExercise } from "@modules/mind-duel/domain/exercise";
import { Attempts } from "@modules/mind-duel/domain/attempts";
import { pickStep } from "@modules/mind-duel/domain/order-steps";
import { ChoreRun, type Chore } from "./chore";

const ex = (id: string, correct: number): Exercise => ({ kind: "choice", id, concept: 1, skill: "predecir", idea: id, question: "?", code: [], options: ["a", "b", "c"], correct });
const chore: Chore = { id: "c", kind: "yoga", title: "t", scenario: "s", exercises: [ex("1", 0), ex("2", 1), ex("3", 2)] };

describe("ChoreRun", () => {
  it("goes through exercises in the given order and finishes", () => {
    const run = new ChoreRun(chore);
    expect(run.current?.id).toBe("1");
    expect(run.submit({ kind: "choice", index: 0 })).toBe(true);
    expect(run.current?.id).toBe("2");
    run.submit({ kind: "choice", index: 1 });
    run.submit({ kind: "choice", index: 2 });
    expect(run.status).toBe("done");
    expect(run.current).toBeUndefined();
  });

  it("fails after too many mistakes; a mistake keeps the same step", () => {
    const run = new ChoreRun(chore, 2);
    expect(run.submit({ kind: "choice", index: 2 })).toBe(false);
    expect(run.current?.id).toBe("1");
    run.submit({ kind: "choice", index: 1 });
    expect(run.status).toBe("failed");
    expect(() => run.submit({ kind: "choice", index: 0 })).toThrow();
  });

  it("tapping the same wrong option three times records one mistake and never ends or advances the step (crema de cacahuete)", () => {
    const run = new ChoreRun(chore, 3);
    for (let i = 0; i < 3; i++) expect(run.submit({ kind: "choice", index: 1 })).toBe(false);
    expect(run.mistakes).toBe(1);
    expect(run.mistakesLeft).toBe(2);
    expect(run.step).toBe(0);
    expect(run.status).toBe("doing");
    expect(run.current?.id).toBe("1");
    expect(run.tried({ kind: "choice", index: 1 })).toBe(true);
    expect(run.tried({ kind: "choice", index: 2 })).toBe(false);
  });

  it("a wrong answer never completes a step and stays counted after the step is solved", () => {
    const run = new ChoreRun(chore, 3);
    run.submit({ kind: "choice", index: 1 });
    run.submit({ kind: "choice", index: 0 });
    expect(run.step).toBe(1);
    expect(run.mistakes).toBe(1);
    // The record of tried answers belongs to the step: on the new step the same index is a new answer.
    expect(run.tried({ kind: "choice", index: 1 })).toBe(false);
    run.submit({ kind: "choice", index: 2 });
    expect(run.mistakes).toBe(2);
  });
});

describe("UI-05 ChoreRun with order challenges answered step by step", () => {
  const blk = (id: string) => ({ id, pseudo: id, js: id });
  const order: OrderExercise = { kind: "order", id: "viaje-maniobra", concept: 1, idea: "i", blocks: ["a", "b", "c", "x"].map(blk), solution: ["a", "b", "c"] };
  const trip: Chore = { id: "v", kind: "programar-viaje", title: "t", scenario: "s", exercises: [order, ex("dv", 0)] };

  /** What the challenge screen does with a pick in «Paso a paso». */
  const pick = (run: ChoreRun, view: Attempts, placed: string[], id: string) => {
    view.on(run.current);
    const v = pickStep(order, placed, id, view);
    if (v.kind === "wrong") view.record(v.answer, run.submit(v.answer));
    if (v.kind === "right") placed.push(id);
    if (v.kind === "right" && v.done) run.submit({ kind: "order", order: placed });
    return v.kind;
  };

  it("a wrong pick costs one mistake and leaves the step on screen; repeating it costs nothing", () => {
    const run = new ChoreRun(trip, 3);
    const view = new Attempts();
    const placed: string[] = [];
    expect(pick(run, view, placed, "a")).toBe("right");
    expect(pick(run, view, placed, "x")).toBe("wrong");
    expect(pick(run, view, placed, "x")).toBe("repeated");
    expect(run.mistakes).toBe(1);
    expect(run.current?.id).toBe("viaje-maniobra");
    expect(pick(run, view, placed, "b")).toBe("right");
    expect(pick(run, view, placed, "c")).toBe("right");
    expect(run.step).toBe(1);
    expect(run.mistakes).toBe(1);
  });

  it("each different wrong pick is a mistake: too many and the chain fails, as with whole orders", () => {
    const run = new ChoreRun(trip, 2);
    const view = new Attempts();
    const placed: string[] = [];
    pick(run, view, placed, "b");
    pick(run, view, placed, "c");
    expect(run.status).toBe("failed");
  });
});
