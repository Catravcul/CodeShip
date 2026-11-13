import { describe, expect, it } from "vitest";
import { clampToFloor, clearPath, floorPath, nearestStation } from "@modules/lander-cabin/domain/cabin";
import { BRIDGE, PANEL_CONSOLE } from "./bridge";

describe("the travel ship's bridge as a room of consoles (docs/design/habitaculo.md §Puente)", () => {
  it("HAB-07 every page of the old deck has its own console, plus the probe, the asteroid's mind and the nano_net", () => {
    const ids = BRIDGE.stations.map((s) => s.id);
    for (const c of Object.values(PANEL_CONSOLE)) expect(ids).toContain(c);
    for (const c of ["sonda", "mente", "nano", "salida"] as const) expect(ids).toContain(c);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("HAB-07 the consoles stand on the deck, far enough apart to tell which one she is at, and she can walk between any two", () => {
    const st = BRIDGE.stations;
    for (const s of st) {
      expect(clampToFloor(BRIDGE.floor, s.stand)).toEqual(s.stand);
      expect(nearestStation(BRIDGE, s.stand)?.id).toBe(s.id);
    }
    for (const a of st)
      for (const b of st) {
        if (a === b) continue;
        expect(Math.hypot(a.stand.x - b.stand.x, a.stand.z - b.stand.z)).toBeGreaterThan(2 * BRIDGE.reachM);
        let p = a.stand;
        for (const q of floorPath(BRIDGE.floor, a.stand, b.stand)) {
          expect(clearPath(BRIDGE.floor, p, q)).toBe(true);
          p = q;
        }
      }
  });
});
