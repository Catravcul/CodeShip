/**
 * Meals × the world's clocks (docs/qa/entrelazamiento.md, «Relojes»; docs/design/vida-a-bordo.md, «Ritmo de los
 * días»). Berón (2026-11-16): «las comidas serán 2 al día». Doménica eats half her day each time she gets
 * hungry, while the frames advance life on board the way main.ts does (`frameClocks`).
 */
import { describe, expect, it } from "vitest";
import { CrewMember } from "@modules/crew/domain/crew-member";
import { DAY_REAL_S, frames } from "./mundo";

/** Real seconds of frames at `tripLapse` (and manual warp): the meals she eats, each one when hunger comes. */
function mealsIn(realS: number, tripLapse = 1, manualWarp = 1): { meals: number; days: number } {
  const c = new CrewMember("Doménica");
  // She starts the day with satiety 0,75 (it starts at 0,8): hungry a quarter and three quarters into it.
  c.tick(0.05);
  let meals = 0;
  let days = 0;
  frames(
    realS,
    1,
    tripLapse,
    (f) => {
      c.tick(f.lifeDays);
      days += f.lifeDays;
      if (c.hungry) {
        c.eatKcal(c.mealKcal);
        meals++;
      }
    },
    manualWarp,
  );
  return { meals, days };
}

describe("CV · comidas y relojes", () => {
  it("CV-20 a ×1, un día de a bordo (24 min reales) son 2 comidas", () => {
    const r = mealsIn(DAY_REAL_S);
    expect(r.days).toBeCloseTo(1, 6);
    expect(r.meals).toBe(2);
  });

  it("CV-20 en diez días de a bordo come 20 veces: nunca 3 por día", () => {
    const r = mealsIn(10 * DAY_REAL_S);
    expect(r.meals).toBeGreaterThanOrEqual(19);
    expect(r.meals).toBeLessThanOrEqual(21);
  });

  it("CV-20 con ×10 a mano el día dura 2,4 min y siguen siendo 2 comidas por día", () => {
    const r = mealsIn(DAY_REAL_S / 10, 1, 10);
    expect(r.days).toBeCloseTo(1, 6);
    expect(r.meals).toBe(2);
  });

  it("CV-20 un salto de la nodriza (×600) arrastra la vida: 2 comidas por cada día de a bordo que pasa", () => {
    const r = mealsIn(5 * 144, 600);
    expect(r.days).toBeCloseTo(5, 6);
    expect(r.meals).toBeGreaterThanOrEqual(9);
    expect(r.meals).toBeLessThanOrEqual(11);
  });
});
