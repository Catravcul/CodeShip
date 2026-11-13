/**
 * The game's clocks under compressed travel and time warp (docs/qa/entrelazamiento.md, «Relojes»).
 * `frameClocks` is what main.ts uses every frame; these cases pin how the clocks move together.
 */
import { describe, expect, it } from "vitest";
import { STATION_TUNING } from "@modules/station/domain/blueprint";
import { TRAVEL_TIME } from "@modules/navigation/domain/travel-time";
import { clocks, DAY_REAL_S, frames } from "./mundo";

describe("CV · relojes del mundo", () => {
  it("CV-01 en un viaje comprimido el reloj de misión va a la cámara rápida y la estación a las horas de la vida a bordo", () => {
    const c = clocks(1 / 60, 600);
    expect(c.warp).toBe(600);
    expect(c.missionS).toBeCloseTo(10, 9);
    // ×600 compresses less than life on board (a day every 40 s, ×2160): life keeps its own pace.
    expect(c.lifeDays).toBeCloseTo(1 / 60 / DAY_REAL_S, 12);
    expect(c.stationHours).toBeCloseTo(c.lifeDays * 24, 12);
  });

  it("CV-01 un viaje que comprime más que la vida a bordo arrastra la vida y la estación con él", () => {
    const c = clocks(0.1, 5000);
    expect(c.lifeDays).toBeCloseTo(c.missionS / 86400, 12);
    expect(c.stationHours).toBeCloseTo(c.missionS / 3600, 9);
  });

  it("CV-01 a lo largo de un viaje entero los relojes no se separan: horas de estación = 24 × días de a bordo", () => {
    let life = 0;
    let station = 0;
    let mission = 0;
    frames(TRAVEL_TIME.capS, 1 / 30, 600, (c) => {
      life += c.lifeDays;
      station += c.stationHours;
      mission += c.missionS;
    });
    expect(station).toBeCloseTo(life * 24, 6);
    expect(mission).toBeCloseTo(TRAVEL_TIME.capS * 600, 3);
    expect(life).toBeCloseTo(TRAVEL_TIME.capS / DAY_REAL_S, 6);
  });

  it("CV-02 tiempo acelerado a mano (×50, sin viaje): la estación corre ×50 y la vida a bordo no (HC-01, se fija lo actual)", () => {
    const c = clocks(1 / 60, 1, 50);
    expect(c.warp).toBe(50);
    expect(c.missionS).toBeCloseTo(50 / 60, 9);
    expect(c.lifeDays).toBeCloseTo(1 / 60 / DAY_REAL_S, 12);
    expect(c.stationHours).toBeCloseTo((50 / 60) * STATION_TUNING.hoursPerSecond, 9);
    // The two clocks that are equal on a trip drift apart ×50 here.
    expect(c.stationHours / (c.lifeDays * 24)).toBeCloseTo(50, 6);
  });

  it("CV-02 consecuencia: con ×50 a mano la estación avanza más deprisa que en un viaje de la nodriza a ×600", () => {
    const manual = clocks(1 / 60, 1, 50);
    const trip = clocks(1 / 60, 600, 1);
    expect(manual.stationHours).toBeGreaterThan(trip.stationHours * 40);
  });

  it("CV-08 la cámara rápida de un viaje manda sobre la manual y no la frena nada más (HC-03: ni las amenazas de la ira)", () => {
    // Main clears the manual warp when something flies at the lander (WrathMode.allowsWarp); a trip's lapse is not cleared.
    const underThreat = clocks(1 / 60, 40, 1);
    expect(underThreat.warp).toBe(40);
    const asked = clocks(1 / 60, 40, 50);
    expect(asked.warp).toBe(40);
  });

  it("CV-01 un fotograma de tiempo negativo o nulo no mueve ningún reloj", () => {
    for (const c of [clocks(0, 600), clocks(-1, 1, 50)]) {
      expect(c.missionS).toBe(0);
      expect(c.lifeDays).toBe(0);
      expect(c.stationHours).toBe(0);
    }
  });
});
