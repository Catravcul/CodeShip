import { describe, expect, it } from "vitest";
import { CREW_DAILY } from "@modules/station/data/vehicle-catalogue";
import { CREW_TUNING } from "@modules/crew/domain/crew-member";
import { CREW_ENERGY } from "@modules/life-support/domain/sustainability";
import { CREW_BALANCE, crewHeatW, dailyBalance } from "./crew-balance";

describe("SV-01 the daily balance of one crew member", () => {
  it("uses the catalogue's CREW_DAILY: 0,89 kg O₂, 1,08 kg CO₂, 2,39 kg of packaged food", () => {
    expect(CREW_BALANCE.o2Kg.value).toBe(CREW_DAILY.oxygenKg!.value);
    expect(CREW_BALANCE.co2Kg.value).toBe(CREW_DAILY.co2Kg!.value);
    expect(CREW_BALANCE.foodPackagedKg.value).toBe(CREW_DAILY.foodPackagedKg!.value);
  });

  it("every value carries a source", () => {
    for (const [k, v] of Object.entries(CREW_BALANCE)) expect(v.source, k).toMatch(/^https:\/\//);
  });

  it("drinking and food water reach NASA's 2,5 L minimum and, with hygiene, the ISS's gallon (3,8 L)", () => {
    const b = dailyBalance(1);
    expect(CREW_BALANCE.drinkFoodWaterKg.value).toBeGreaterThanOrEqual(2.5);
    expect(b.waterUseKg).toBeCloseTo(3.8, 1);
  });

  it("the outputs: urine 1,40 kg, condensate (vapour) 2,53 kg, CO₂ 1,08 kg; scales with the crew", () => {
    const four = dailyBalance(4);
    expect(four.urineKg).toBeCloseTo(5.6);
    expect(four.condensateKg).toBeCloseTo(10.12);
    expect(four.co2Kg).toBeCloseTo(4.32);
    expect(four.o2Kg).toBeCloseTo(3.56);
  });

  it("metabolic heat is 12 778 kJ a day: about 148 W per person", () => {
    expect(crewHeatW(1)).toBeCloseTo(147.9, 0);
  });
});

describe("SV-01 the food balance and the two-meal hunger model", () => {
  it("2,39 kg a day is two meals of 1,195 kg (CREW_TUNING: half a day's energy a meal)", () => {
    const perMeal = CREW_BALANCE.foodPackagedKg.value * CREW_TUNING.mealShareOfDay;
    expect(1 / CREW_TUNING.mealShareOfDay).toBe(2);
    expect(perMeal).toBeCloseTo(1.195, 3);
  });

  it("the ISS ration covers Doménica's energy with margin: MetMan's 82 kg astronaut burns more than her EER", () => {
    const metmanKcal = CREW_BALANCE.metabolicKj.value / 4.184;
    const domenicaKcal = CREW_ENERGY.value(30, 58, 1.6);
    expect(metmanKcal).toBeCloseTo(3054, 0);
    expect(domenicaKcal).toBeGreaterThan(2200);
    expect(domenicaKcal).toBeLessThan(metmanKcal);
  });
});
