import { describe, expect, it } from "vitest";
import { glyphBeats, stepsUpTo } from "./trace-chore";

describe("los pasos del reto mientras se dibuja el compuesto", () => {
  it("glifo i de G completa los pasos hasta ⌈(i+1)·N/G⌉", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((i) => stepsUpTo(i, 8, 5))).toEqual([1, 2, 2, 3, 4, 4, 5, 5]);
    expect([0, 1, 2].map((i) => stepsUpTo(i, 3, 6))).toEqual([2, 4, 6]);
  });
  it("cada paso suena una vez, con todas sus partes, y al terminar están todos", () => {
    const parts = [1, 3, 1, 1, 2, 1];
    const all = [0, 1, 2].flatMap((i) => glyphBeats(parts, i, 3));
    expect(all).toEqual([[0, 0], [1, 0], [1, 1], [1, 2], [2, 0], [3, 0], [4, 0], [4, 1], [5, 0]]);
    const many = Array.from({ length: 9 }, (_, i) => glyphBeats(parts, i, 9)).flat();
    expect(many).toEqual(all);
  });
});
