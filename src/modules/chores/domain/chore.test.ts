import { describe, expect, it } from "vitest";
import type { Exercise } from "@modules/mind-duel/domain/exercise";
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
    run.submit({ kind: "choice", index: 2 });
    expect(run.status).toBe("failed");
    expect(() => run.submit({ kind: "choice", index: 0 })).toThrow();
  });
});
