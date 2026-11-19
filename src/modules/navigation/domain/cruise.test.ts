import { describe, expect, it } from "vitest";
import { CruiseClock } from "./cruise";
import { TRAVEL_TIME } from "./travel-time";

describe("CruiseClock (the Starship's cruise to Bennu, docs/design/santuario3-lanzamiento.md)", () => {
  it("816 real days at ×60 are squeezed into the 10 min cap of the trips", () => {
    const c = CruiseClock.start(816);
    expect(c.totalS).toBe(TRAVEL_TIME.capS);
    expect(c.leftS).toBe(TRAVEL_TIME.capS);
    expect(c.fraction).toBe(0);
    expect(c.active).toBe(true);
  });

  it("runs down with real time and ends at 0", () => {
    const c = CruiseClock.start(816);
    c.advance(150);
    expect(c.leftS).toBeCloseTo(450, 6);
    expect(c.fraction).toBeCloseTo(0.25, 6);
    c.advance(1e6);
    expect(c.leftS).toBe(0);
    expect(c.active).toBe(false);
  });

  it("a saved cruise comes back at the same point (a reload in mid-cruise does not arrive)", () => {
    const c = CruiseClock.start(816);
    c.advance(200);
    const back = CruiseClock.restore(JSON.parse(JSON.stringify(c.snapshot())));
    expect(back).toBeDefined();
    expect(back!.cruiseDays).toBe(816);
    expect(back!.leftS).toBeCloseTo(400, 6);
    expect(back!.fraction).toBeCloseTo(c.fraction, 9);
    expect(back!.active).toBe(true);
  });

  it("a broken or finished saved cruise is no cruise", () => {
    expect(CruiseClock.restore(undefined)).toBeUndefined();
    expect(CruiseClock.restore({ cruiseDays: 816, totalS: "x", leftS: 3 })).toBeUndefined();
    expect(CruiseClock.restore({ cruiseDays: 816, totalS: 600, leftS: 0 })).toBeUndefined();
    // Left is never more than the whole.
    expect(CruiseClock.restore({ cruiseDays: 816, totalS: 600, leftS: 900 })!.leftS).toBe(600);
  });
});
