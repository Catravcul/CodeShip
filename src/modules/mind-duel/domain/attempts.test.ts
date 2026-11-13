import { describe, expect, it } from "vitest";
import type { Exercise } from "./exercise";
import { Attempts, answerKey, sessionOutcome } from "./attempts";

const choice = (id: string): Exercise => ({ kind: "choice", id, concept: 1, skill: "completar", idea: id, question: "?", code: [], options: ["60 °C", "300 °C", "160 °C"], correct: 2 });
const order: Exercise = { kind: "order", id: "o", concept: 1, idea: "o", blocks: [{ id: "a", pseudo: "a", js: "a" }, { id: "b", pseudo: "b", js: "b" }], solution: ["a", "b"] };

describe("Attempts (wrong answers already given to the challenge on screen)", () => {
  it("remembers a wrong choice so tapping it again is not a new answer", () => {
    const t = new Attempts();
    t.on(choice("paso-1"));
    expect(t.repeated({ kind: "choice", index: 0 })).toBe(false);
    t.record({ kind: "choice", index: 0 }, false);
    expect(t.repeated({ kind: "choice", index: 0 })).toBe(true);
    expect(t.repeated({ kind: "choice", index: 1 })).toBe(false);
    expect(t.wrongChoices()).toEqual([0]);
  });

  it("never un-records a wrong answer: a second and third tap keep it marked", () => {
    const t = new Attempts();
    t.on(choice("paso-1"));
    t.record({ kind: "choice", index: 0 }, false);
    t.record({ kind: "choice", index: 0 }, false);
    t.record({ kind: "choice", index: 0 }, false);
    expect(t.wrongChoices()).toEqual([0]);
  });

  it("does not record right answers and forgets the record when the challenge changes", () => {
    const t = new Attempts();
    t.on(choice("paso-1"));
    t.record({ kind: "choice", index: 2 }, true);
    t.record({ kind: "choice", index: 1 }, false);
    t.on(choice("paso-1"));
    expect(t.wrongChoices()).toEqual([1]);
    t.on(choice("paso-2"));
    expect(t.wrongChoices()).toEqual([]);
  });

  it("works for orders too: the same wrong order is a repeat, another order is not", () => {
    const t = new Attempts();
    t.on(order);
    t.record({ kind: "order", order: ["b", "a"] }, false);
    expect(t.repeated({ kind: "order", order: ["b", "a"] })).toBe(true);
    expect(t.repeated({ kind: "order", order: ["a", "b"] })).toBe(false);
    expect(answerKey({ kind: "order", order: ["b", "a"] })).not.toBe(answerKey({ kind: "choice", index: 0 }));
  });
});

describe("sessionOutcome", () => {
  const ex = choice("x");
  it("is playing while there is a challenge, won at the goal, lost otherwise", () => {
    expect(sessionOutcome({ current: ex, progress: 0, goal: 7, lives: 3 })).toBe("playing");
    expect(sessionOutcome({ current: undefined, progress: 7, goal: 7, lives: 1 })).toBe("won");
    expect(sessionOutcome({ current: undefined, progress: 2, goal: 7, lives: 0 })).toBe("lost");
  });
});
