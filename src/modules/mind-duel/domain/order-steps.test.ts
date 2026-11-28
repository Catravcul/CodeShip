import { describe, expect, it } from "vitest";
import { isCorrect, type Answer, type OrderExercise } from "./exercise";
import { Attempts } from "./attempts";
import { keepRight, pickStep, slotMarks, wrongPicks } from "./order-steps";

const blk = (id: string) => ({ id, pseudo: id, js: id });
// Trip-like: five steps and a distractor «x».
const trip: OrderExercise = { kind: "order", id: "viaje", concept: 1, idea: "Primero apunto", blocks: ["a", "b", "c", "d", "e", "x"].map(blk), solution: ["a", "b", "c", "d", "e"] };

/** The smallest session: like a chore, a wrong answer costs a life, a repeated one nothing. */
function session(ex: OrderExercise, lives = 3) {
  const seen = new Attempts();
  seen.on(ex);
  const s = { lives, hits: 0, answer(a: Answer) {
    if (seen.repeated(a)) return false;
    const ok = isCorrect(ex, a);
    seen.record(a, ok);
    if (ok) s.hits++;
    else s.lives--;
    return ok;
  } };
  return s;
}

describe("UI-04 Ordenar todo y enviar: marks after a wrong order", () => {
  it("marks each slot right (in its place) or wrong", () => {
    expect(slotMarks(trip, ["a", "c", "b", "d", "x"])).toEqual(["ok", "bad", "bad", "ok", "bad"]);
  });

  it("leaves empty slots unmarked", () => {
    expect(slotMarks(trip, ["a", undefined, "b"])).toEqual(["ok", undefined, "bad", undefined, undefined]);
  });

  it("Reintentar keeps the right blocks in their slots and sends the wrong ones back", () => {
    expect(keepRight(trip, ["a", "c", "b", "d", "x"])).toEqual(["a", undefined, undefined, "d", undefined]);
  });
});

describe("UI-05 Paso a paso: each pick is checked at once", () => {
  it("a right pick for the next slot is placed; the last one completes the order", () => {
    const t = new Attempts();
    t.on(trip);
    expect(pickStep(trip, [], "a", t)).toEqual({ kind: "right", done: false });
    expect(pickStep(trip, ["a", "b", "c", "d"], "e", t)).toEqual({ kind: "right", done: true });
  });

  it("a wrong pick is an answer that the session counts as one failure", () => {
    const t = new Attempts();
    t.on(trip);
    const v = pickStep(trip, ["a"], "c", t);
    expect(v.kind).toBe("wrong");
    if (v.kind !== "wrong") return;
    expect(v.answer).toEqual({ kind: "order", order: ["a", "c"] });
    const s = session(trip);
    expect(s.answer(v.answer)).toBe(false);
    expect(s.lives).toBe(2);
  });

  it("the same wrong pick again is a repeat: it costs nothing more", () => {
    const t = new Attempts();
    t.on(trip);
    const s = session(trip);
    for (let k = 0; k < 3; k++) {
      const v = pickStep(trip, ["a"], "x", t);
      if (v.kind === "wrong") {
        s.answer(v.answer);
        t.record(v.answer, false);
      }
      expect(v.kind).toBe(k === 0 ? "wrong" : "repeated");
    }
    expect(s.lives).toBe(2);
    expect(wrongPicks(["a"], t)).toEqual(["x"]);
  });

  it("another wrong pick for the same slot is another failure; the same block at another slot is a new pick", () => {
    const t = new Attempts();
    t.on(trip);
    const s = session(trip);
    for (const [placed, id] of [[["a"], "x"], [["a"], "c"], [["a", "b"], "x"]] as const) {
      const v = pickStep(trip, placed, id, t);
      expect(v.kind).toBe("wrong");
      if (v.kind === "wrong") {
        s.answer(v.answer);
        t.record(v.answer, false);
      }
    }
    expect(s.lives).toBe(0);
    expect(wrongPicks(["a"], t)).toEqual(["x", "c"]);
    expect(wrongPicks(["a", "b"], t)).toEqual(["x"]);
    expect(wrongPicks([], t)).toEqual([]);
  });

  it("a clean run costs nothing and the full order is one hit", () => {
    const t = new Attempts();
    t.on(trip);
    const s = session(trip);
    const placed: string[] = [];
    for (const id of trip.solution) {
      const v = pickStep(trip, placed, id, t);
      expect(v.kind).toBe("right");
      placed.push(id);
    }
    expect(s.answer({ kind: "order", order: placed })).toBe(true);
    expect({ lives: s.lives, hits: s.hits }).toEqual({ lives: 3, hits: 1 });
  });
});
