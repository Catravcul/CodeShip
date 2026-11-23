import { describe, expect, it } from "vitest";
import { JORNADA, ageAt, etapa, lineAt, papelPorEdad, spanOf, tallaPorEdad, tramoAt, YEARS_PER_HOUR } from "./vida";

describe("microcosm lives (vida.ts)", () => {
  it("each role's day starts at midnight, in order, and the hour picks its block", () => {
    for (const day of Object.values(JORNADA)) {
      expect(day[0]!.from).toBe(0);
      for (let i = 1; i < day.length; i++) expect(day[i]!.from).toBeGreaterThan(day[i - 1]!.from);
    }
    expect(tramoAt("maestro", 7.5).what).toBe("ensenar");
    expect(tramoAt("maestro", 23).what).toBe("dormir");
    expect(tramoAt("joven", 25).what).toBe(tramoAt("joven", 1).what);
  });
  it("a line goes on: when one dies at their span, their child is born then", () => {
    const first = { family: "Glauco", gen: 1, bornH: -70, span: spanOf("Glauco", 1) };
    const now = lineAt(first, 0);
    expect(ageAt(now, 0)).toBeLessThan(now.span);
    const later = lineAt(first, 200);
    expect(later.gen).toBeGreaterThan(now.gen);
    expect(ageAt(later, 200)).toBeGreaterThanOrEqual(0);
    expect(later.bornH).toBeLessThanOrEqual(200);
    expect(YEARS_PER_HOUR).toBeGreaterThan(0);
  });
  it("spans are 55–85 years and deterministic", () => {
    for (let g = 1; g < 50; g++) {
      const s = spanOf("Teodoro", g);
      expect(s).toBeGreaterThanOrEqual(55);
      expect(s).toBeLessThanOrEqual(85);
      expect(spanOf("Teodoro", g)).toBe(s);
    }
  });
  it("the stage of life gives the role and the size", () => {
    expect(etapa(3)).toBe("bebe");
    expect(papelPorEdad(3, "joven")).toBe("bebe");
    expect(papelPorEdad(10, "joven")).toBe("nino");
    expect(papelPorEdad(70, "joven")).toBe("anciano");
    expect(papelPorEdad(35, "entrenador")).toBe("entrenador");
    expect(tallaPorEdad(30)).toBe(1);
    expect(tallaPorEdad(8)).toBeLessThan(1);
  });
});
