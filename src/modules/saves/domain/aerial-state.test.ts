import { describe, expect, it } from "vitest";
import { checkAerialState } from "./aerial-state";

describe("the aerial sanctuary's saved state (level 3)", () => {
  const ok = { boardDays: 0.4, at: { x: 200, y: 0, z: -95, island: "entrenamiento" }, yaw: 1, k: 1.5, settings: { ajustes: "{}" } };

  it("resumes with where she is; the rest is optional", () => {
    expect(checkAerialState(ok)).toBeUndefined();
    expect(checkAerialState({ boardDays: 0, at: { x: 0, y: 0, z: 0, island: "lanzadera" } })).toBeUndefined();
  });

  it("says why a broken one cannot be resumed", () => {
    expect(checkAerialState(null)).toBe("sin estado");
    expect(checkAerialState({ ...ok, boardDays: -1 })).toBe("sin día");
    expect(checkAerialState({ ...ok, at: { x: 0, y: 0, z: 0, island: "luna" } })).toBe("sin el sitio de Doménica");
    expect(checkAerialState({ ...ok, at: { x: Number.NaN, y: 0, z: 0, island: "muelle" } })).toBe("sin el sitio de Doménica");
    expect(checkAerialState({ ...ok, settings: 3 })).toBe("ajustes ilegibles");
  });
});
