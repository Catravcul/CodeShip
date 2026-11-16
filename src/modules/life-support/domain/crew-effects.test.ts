import { describe, expect, it } from "vitest";
import { CrewExposure, symptomsFor } from "./crew-effects";

const air = (ppCO2MmHg: number, ppO2KPa = 21.3) => ({ ppCO2MmHg, ppO2KPa, cabinC: 22 });

describe("SV-05 what the air and the water do to Doménica", () => {
  it("under 2,8 mmHg of CO₂ nothing; from 2,8 headaches; above 4,5 tiredness and nausea (NASA)", () => {
    expect(symptomsFor(air(1), 0, 58)).toEqual([]);
    expect(symptomsFor(air(3.2), 0, 58).map((s) => s.id)).toEqual(["dolor-cabeza-co2"]);
    expect(symptomsFor(air(5), 0, 58).map((s) => s.id)).toEqual(["fatiga-co2"]);
  });

  it("low O₂ under 122 mmHg (16,3 kPa) is hypoxia", () => {
    expect(symptomsFor(air(1, 15), 0, 58).map((s) => s.id)).toContain("hipoxia");
  });

  it("losing 2,5 % of her body mass in water impairs her: for 58 kg, 1,45 kg", () => {
    expect(symptomsFor(air(1), 1.4, 58)).toEqual([]);
    expect(symptomsFor(air(1), 1.5, 58).map((s) => s.id)).toEqual(["deshidratacion"]);
  });

  it("she dehydrates only when there is no drinking water, and recovers drinking again", () => {
    const e = new CrewExposure(58);
    e.update(24, { ...air(1), waterKg: 0 });
    expect(e.deficitKg).toBeCloseTo(2.5);
    e.update(24, { ...air(1), waterKg: 100 });
    expect(e.deficitKg).toBe(0);
  });

  it("a headache or worse costs one try in the challenges (cognition with CO₂)", () => {
    const e = new CrewExposure(58);
    expect(e.mistakePenalty(air(1))).toBe(0);
    expect(e.mistakePenalty(air(4))).toBe(1);
  });
});
