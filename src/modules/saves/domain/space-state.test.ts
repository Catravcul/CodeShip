import { describe, expect, it } from "vitest";
import { boardDayOf, checkSpaceState, type SpaceState } from "./space-state";
import { readSlot, SAVE_FORMAT, writeSlot } from "./save-slot";

const state = (): SpaceState => ({
  boardDays: 2.4,
  crew: { vehicle: "nodriza", spot: "interior", at: "cocina-1", member: { satiety: 0.6 } },
  lander: { body: { p: [250, 120, 1600], q: [0, 0, 0, 1], v: [0, 0, 0], w: [0, 0, 0] }, simTimeS: 3600, dockedTo: "nodriza" },
  mothership: { pose: { p: [240, 110, 1620], q: [0, 0.1, 0, 0.995] }, dockedTo: null, propellantKg: 1e6 },
  wallet: { balance: 500, log: [] },
  settings: { ajustes: "{}", pasoAPaso: true, aterrizaje: "manual" },
});

describe("the space sanctuary's saved state (level 6)", () => {
  it("a full state passes its check, and survives being written and read in a slot", () => {
    const s = state();
    expect(checkSpaceState(s)).toBeUndefined();
    const r = readSlot("1", writeSlot({ id: "1", format: SAVE_FORMAT, level: 6, savedAt: "2026-11-18T10:00:00Z", boardDay: 3, summary: { vehicle: "Starship", place: "Cubierta 1" }, state: s }));
    expect(r.ok && r.slot.state).toEqual(s);
    expect(r.ok && checkSpaceState(r.slot.state)).toBeUndefined();
  });

  it("the optional parts may be missing (a new game's values are kept)", () => {
    const { wallet: _w, settings: _s, ...bare } = state();
    expect(checkSpaceState(bare)).toBeUndefined();
  });

  it("without where the craft are or where she is, it cannot be resumed, and says what is missing", () => {
    const s = state();
    expect(checkSpaceState({ ...s, crew: { vehicle: "submarino", spot: "interior" } })).toMatch(/Doménica/);
    expect(checkSpaceState({ ...s, lander: { ...s.lander, body: { ...s.lander.body, p: [1, 2] } } })).toMatch(/módulo/);
    expect(checkSpaceState({ ...s, lander: { ...s.lander, body: { ...s.lander.body, v: [0, Number.NaN, 0] } } })).toMatch(/módulo/);
    expect(checkSpaceState({ ...s, mothership: { pose: { p: [0, 0, 0] }, dockedTo: null } })).toMatch(/Starship/);
    expect(checkSpaceState({ ...s, boardDays: -1 })).toMatch(/día/);
    expect(checkSpaceState(null)).toBeDefined();
  });

  it("the list's day on board starts at 1", () => {
    expect(boardDayOf(0)).toBe(1);
    expect(boardDayOf(2.4)).toBe(3);
  });
});
