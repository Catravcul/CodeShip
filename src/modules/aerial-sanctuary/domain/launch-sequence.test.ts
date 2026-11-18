import { describe, expect, it } from "vitest";
import { canStart, missingBeforeLaunch, nextLaunchStep, tClock } from "./launch-sequence";

describe("El día del lanzamiento (puesto 13)", () => {
  it("el traje solo con los puestos 1 a 12 superados", () => {
    expect(missingBeforeLaunch(new Set([1, 2, 3]))).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(missingBeforeLaunch(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))).toEqual([]);
  });
  it("cada paso, en su orden: traje, torre, cuenta atrás, ascenso y acople", () => {
    expect(nextLaunchStep(new Set())).toBe("traje");
    expect(canStart("torre", new Set())).toBe(false);
    expect(canStart("torre", new Set(["traje"]))).toBe(true);
    expect(nextLaunchStep(new Set(["traje", "torre", "cuenta-atras", "ascenso"]))).toBe("acople");
    expect(nextLaunchStep(new Set(["traje", "torre", "cuenta-atras", "ascenso", "acople"]))).toBeUndefined();
  });
  it("la hora de la cuenta atrás como se dice: T−2 h 35 min, T+8 min 49 s", () => {
    expect(tClock(-(2 * 3600 + 35 * 60))).toBe("T−2 h 35 min");
    expect(tClock(529)).toBe("T+8 min 49 s");
    expect(tClock(0)).toBe("T−0");
  });
});
