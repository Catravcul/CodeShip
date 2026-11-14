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

  it("CV-02 tiempo acelerado a mano (×50, sin viaje): la vida a bordo corre ×50 igual que la estación (HC-01)", () => {
    const c = clocks(1 / 60, 1, 50);
    expect(c.warp).toBe(50);
    expect(c.missionS).toBeCloseTo(50 / 60, 9);
    expect(c.lifeDays).toBeCloseTo((50 / 60) / DAY_REAL_S, 12);
    expect(c.stationHours).toBeCloseTo((50 / 60) * STATION_TUNING.hoursPerSecond, 9);
    // The station and life on board keep together, as on a trip: 24 station hours per day on board.
    expect(c.stationHours).toBeCloseTo(c.lifeDays * 24, 12);
  });

  it("CV-02 con ×10 a mano un día de a bordo dura 4 s reales, y la estación no se separa de la vida a lo largo de un minuto", () => {
    let life = 0;
    let station = 0;
    frames(60, 1 / 30, 1, (c) => {
      life += c.lifeDays;
      station += c.stationHours;
    }, 10);
    expect(life).toBeCloseTo((60 * 10) / DAY_REAL_S, 6);
    expect(station).toBeCloseTo(life * 24, 6);
  });

  it("CV-08 una amenaza de la ira baja a ×1 la cámara rápida del viaje (y la manual), y el viaje queda retenido (HC-03)", () => {
    const underThreat = clocks(1 / 60, 40, 50, true);
    expect(underThreat.warp).toBe(1);
    expect(underThreat.held).toBe(true);
    expect(underThreat.missionS).toBeCloseTo(1 / 60, 12);
    // Life on board and the station keep their own pace meanwhile.
    expect(underThreat.lifeDays).toBeCloseTo(1 / 60 / DAY_REAL_S, 12);
    expect(underThreat.stationHours).toBeCloseTo(underThreat.lifeDays * 24, 12);
    // Without a trip the threat only clears the manual warp; nothing is held.
    const manual = clocks(1 / 60, 1, 50, true);
    expect(manual.warp).toBe(1);
    expect(manual.held).toBe(false);
  });

  it("CV-08 al pasar la amenaza el viaje recupera su cámara rápida, que manda sobre la manual", () => {
    const after = clocks(1 / 60, 40, 50);
    expect(after.warp).toBe(40);
    expect(after.held).toBe(false);
  });

  it("CV-01 un fotograma de tiempo negativo o nulo no mueve ningún reloj", () => {
    for (const c of [clocks(0, 600), clocks(-1, 1, 50)]) {
      expect(c.missionS).toBe(0);
      expect(c.lifeDays).toBe(0);
      expect(c.stationHours).toBe(0);
    }
  });
});
