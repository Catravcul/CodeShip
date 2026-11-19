import { describe, expect, it } from "vitest";
import { BOARD_DAY_REAL_S } from "@core/board-time";
import { BOARD_DAYS_PER_REAL_S, legBudgets, realSeconds, TRAVEL_TIME, TravelClock, worldStep } from "./travel-time";

describe("realSeconds (time compression with a cap)", () => {
  it("short trips scale in proportion to their game duration", () => {
    expect(realSeconds(100, 10)).toBeCloseTo(10, 9);
    expect(realSeconds(200, 10)).toBeCloseTo(20, 9);
  });

  it("long trips never take more than the cap of real seconds", () => {
    // A 5 h hop plays in 5 real minutes at the board's pace.
    expect(realSeconds(5 * 3600, TRAVEL_TIME.lapse.carrier)).toBeCloseTo(300, 6);
    expect(realSeconds(30 * 86400, TRAVEL_TIME.lapse.carrier)).toBe(TRAVEL_TIME.capS);
  });

  it("an empty trip takes no time", () => {
    expect(realSeconds(0, 10)).toBe(0);
  });

  it("the cap is a sensible game value: minutes, time for the chores on board (Berón, 2026-11-17)", () => {
    expect(TRAVEL_TIME.capS).toBeGreaterThanOrEqual(300);
    expect(TRAVEL_TIME.capS).toBeLessThanOrEqual(900);
  });

  it("NAV-10 every vehicle flies at the board's pace: a game hour per real minute, so life on board and the trip share one clock", () => {
    expect(BOARD_DAY_REAL_S).toBe(24 * 60);
    for (const v of ["carrier", "lander", "probe"] as const) expect(TRAVEL_TIME.lapse[v]).toBe(86400 / BOARD_DAY_REAL_S);
    // During a trip the crew lives exactly the trip's game time: no more, no less.
    const w = worldStep(1, TRAVEL_TIME.lapse.carrier);
    expect(w.lifeDays * 86400).toBeCloseTo(w.missionS, 6);
  });
});

describe("legBudgets", () => {
  it("legs that fit under the cap keep their own lapse", () => {
    const b = legBudgets(
      [
        { gameS: 6000, lapse: 600 },
        { gameS: 80, lapse: 5 },
      ],
      75,
    );
    expect(b[0]).toBeCloseTo(10, 9);
    expect(b[1]).toBeCloseTo(16, 9);
  });

  it("a long trip shares the cap between its legs in proportion", () => {
    const b = legBudgets(
      [
        { gameS: 60000, lapse: 600 },
        { gameS: 500, lapse: 5 },
      ],
      75,
    );
    expect(b[0]! + b[1]!).toBeCloseTo(75, 9);
    expect(b[0]! / b[1]!).toBeCloseTo(100 / 100, 9);
  });
});

describe("TravelClock", () => {
  it("a kinematic leg plays exactly in its real budget at a steady lapse", () => {
    const c = new TravelClock(18000, 30);
    expect(c.lapse()).toBeCloseTo(600, 9);
    let game = 0;
    for (let i = 0; i < 30 * 60; i++) game += c.advance(1 / 60);
    expect(game).toBeCloseTo(18000, 3);
    expect(c.realElapsedS).toBeCloseTo(30, 6);
    expect(c.etaRealS()).toBeCloseTo(0, 6);
  });

  it("with a live estimate of what is left it speeds up to stay within the budget", () => {
    const c = new TravelClock(1000, 50, { minLapse: 1, maxLapse: 60 });
    for (let i = 0; i < 25; i++) c.advance(1);
    expect(c.gameElapsedS).toBeCloseTo(500, 6);
    // Half the real budget used, but the autopilot says 750 s are still to fly (turns took longer): faster.
    expect(c.lapse(750)).toBeCloseTo(30, 9);
    expect(c.etaRealS(750)).toBeCloseTo(25, 6);
  });

  it("never goes past the physics limit nor below real time", () => {
    const c = new TravelClock(100000, 10, { minLapse: 1, maxLapse: 60 });
    expect(c.lapse()).toBe(60);
    const d = new TravelClock(0, 0);
    expect(d.lapse()).toBe(1);
  });

  it("an unknown estimate (still turning) falls back to the plan", () => {
    const c = new TravelClock(600, 60);
    expect(c.lapse(Infinity)).toBeCloseTo(10, 9);
  });

  it("states: en-ruta until done, then llegada; cancel stops it", () => {
    const c = new TravelClock(100, 10);
    expect(c.state).toBe("en-ruta");
    c.arrive();
    expect(c.state).toBe("llegada");
    expect(c.lapse()).toBe(1);
    const d = new TravelClock(100, 10);
    d.cancel();
    expect(d.state).toBe("cancelado");
    expect(d.advance(1)).toBe(1);
  });
});

describe("TravelClock saved (docs/design/partidas.md)", () => {
  it("comes back en route with the same real and game time passed, and keeps its pace", () => {
    const c = new TravelClock(3600, 60);
    c.advance(20);
    const back = TravelClock.restore(JSON.parse(JSON.stringify(c.snapshot())))!;
    expect(back.state).toBe("en-ruta");
    expect(back.realElapsedS).toBeCloseTo(20, 9);
    expect(back.gameElapsedS).toBeCloseTo(c.gameElapsedS, 9);
    expect(back.lapse()).toBeCloseTo(c.lapse(), 9);
    expect(back.etaRealS()).toBeCloseTo(40, 6);
  });

  it("a broken snapshot is no clock", () => {
    expect(TravelClock.restore({ plannedGameS: 1, budgetRealS: "x", realS: 0, gameS: 0 })).toBeUndefined();
    expect(TravelClock.restore(null)).toBeUndefined();
  });
});

describe("worldStep (one clock for everyone during a compressed trip)", () => {
  it("the mission clock runs at the trip's lapse", () => {
    expect(worldStep(0.5, 600).missionS).toBeCloseTo(300, 9);
  });

  it("life on board never runs slower than the trip: max(its own pace, the trip's game time)", () => {
    // Life on board runs a day every 24 real minutes (×60): the lander's ×5 changes nothing…
    expect(worldStep(1, 5).lifeDays).toBeCloseTo(BOARD_DAYS_PER_REAL_S, 12);
    // …the mothership's ×600 drags it along (ten times its own pace), and so does any faster trip.
    expect(worldStep(1, 600).lifeDays).toBeCloseTo(600 / 86400, 12);
    expect(worldStep(1, 86400).lifeDays).toBeCloseTo(1, 12);
  });
});
