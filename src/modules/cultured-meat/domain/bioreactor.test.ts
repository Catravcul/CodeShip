import { describe, expect, it } from "vitest";
import { Bioreactor, CULTURE, BIOREACTOR_TUNING } from "./bioreactor";

describe("bioreactor", () => {
  it("grows a vial to ~5·10¹¹ cells in about 9 doublings with medium renewals, then makes 2 kg", () => {
    const b = new Bioreactor();
    b.seed();
    let days = 0;
    let renewals = 0;
    while (b.stage === "proliferando" && days < 30) {
      b.tick(0.1);
      days += 0.1;
      if (b.needsMedium) {
        b.renewMedium();
        renewals++;
      }
    }
    expect(b.stage).toBe("listo-para-diferenciar");
    expect(days).toBeGreaterThan(8.5);
    expect(days).toBeLessThan(9.5);
    expect(renewals).toBeGreaterThanOrEqual(4);
    b.differentiate();
    b.tick(BIOREACTOR_TUNING.differentiationDays);
    expect(b.stage).toBe("listo");
    expect(b.harvest()).toBe(CULTURE.value.targetCells / CULTURE.value.cellsPerGram);
    expect(b.stage).toBe("vacio");
  });

  it("without medium the pH falls until the culture dies", () => {
    const b = new Bioreactor();
    b.seed();
    for (let d = 0; d < 10; d += 0.1) b.tick(0.1);
    expect(b.stage).toBe("perdido");
    b.sterilize();
    expect(b.stage).toBe("vacio");
  });

  it("a contaminated batch must be sterilized", () => {
    const b = new Bioreactor();
    b.seed();
    b.contaminate();
    expect(b.stage).toBe("contaminado");
    expect(() => b.renewMedium()).toThrow();
  });
});
