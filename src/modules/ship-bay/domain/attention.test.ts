import { describe, expect, it } from "vitest";
import { ATTENTION_TUNING, byIntegrity, byLevel, byMachine, worst, mostUrgentFirst } from "./attention";

describe("attention rules", () => {
  it("hull: any damage asks for a look, half gone is critical", () => {
    expect(byIntegrity(1)).toBe("ok");
    expect(byIntegrity(0.9)).toBe("aviso");
    expect(byIntegrity(ATTENTION_TUNING.hullCriticalBelow - 0.01)).toBe("critico");
  });

  it("levels: empty is critical, under a quarter is a warning", () => {
    expect(byLevel(1)).toBe("ok");
    expect(byLevel(0.2)).toBe("aviso");
    expect(byLevel(0)).toBe("critico");
  });

  it("machines: broken is critical, worn is a warning", () => {
    expect(byMachine(1, true)).toBe("ok");
    expect(byMachine(0.7, true)).toBe("aviso");
    expect(byMachine(0.3, false)).toBe("critico");
  });

  it("the worst wins and lists sort the urgent first", () => {
    expect(worst([])).toBe("ok");
    expect(worst(["ok", "critico", "aviso"])).toBe("critico");
    const sorted = mostUrgentFirst([{ attention: "aviso" as const }, { attention: "ok" as const }, { attention: "critico" as const }]);
    expect(sorted.map((x) => x.attention)).toEqual(["critico", "aviso", "ok"]);
  });
});
