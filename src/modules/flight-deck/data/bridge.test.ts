import { describe, expect, it } from "vitest";
import { clampToFloor, clearPath, floorPath, nearestStation } from "@modules/lander-cabin/domain/cabin";
import { WORLD_SCALE } from "@core/scale";
import { INTERACTABLE_SPACING, minSpacing } from "@core/spacing";
import { BRIDGE, BRIDGE_ERGONOMICS, BRIDGE_SOURCES, PANEL_CONSOLE, PLOT_TABLE } from "./bridge";

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

  it("HAB-13 laid out from real control rooms: pilot facing the bow, probe beside it, both seated; the plot table in the middle; systems on the side walls", () => {
    const at = (id: string) => BRIDGE.stations.find((s) => s.id === id)!;
    // Pilot and probe sit (MSIS asks for restraints for long watches and two-handed work; drones and ROVs are flown seated).
    expect(at("prop").seated).toBe(true);
    expect(at("sonda").seated).toBe(true);
    expect(BRIDGE.stations.filter((s) => s.seated).map((s) => s.id).sort()).toEqual(["prop", "sonda"]);
    // Both face the bow (−z) at the front of the deck.
    for (const id of ["prop", "sonda", "dock"]) {
      expect(at(id).look.z).toBeLessThan(at(id).stand.z);
      expect(at(id).stand.z).toBeLessThan(BRIDGE.floor.minZ + 1);
    }
    // The plot table stands in the middle and she cannot walk through it, but walks round it.
    expect(Math.abs(PLOT_TABLE.x)).toBeLessThan(0.5);
    expect(BRIDGE.floor.blocked.length).toBe(1);
    expect(clampToFloor(BRIDGE.floor, { x: PLOT_TABLE.x, z: PLOT_TABLE.z })).not.toEqual({ x: PLOT_TABLE.x, z: PLOT_TABLE.z });
    const path = floorPath(BRIDGE.floor, at("prop").stand, at("nav").stand);
    expect(path.length).toBeLessThanOrEqual(3);
    // Systems consoles on the side walls.
    for (const id of ["life", "power", "mente", "nano"]) expect(Math.abs(at(id).look.x)).toBeGreaterThan(BRIDGE.floor.maxX);
    // Every source is a link.
    for (const v of Object.values(BRIDGE_SOURCES)) expect(v).toMatch(/https:\/\//);
  });

  it("HAB-13 real ergonomics: screens 0,33–0,71 m from the eye and under 30° off it (MSIS), seated eye under standing", () => {
    expect(BRIDGE_ERGONOMICS.viewing.minM).toBe(0.33);
    expect(BRIDGE_ERGONOMICS.viewing.maxM).toBe(0.71);
    expect(BRIDGE_ERGONOMICS.maxOffNormalDeg).toBe(30);
    expect(BRIDGE_ERGONOMICS.eyeSeatedM).toBeLessThan(BRIDGE_ERGONOMICS.eyeStandingM);
    expect(BRIDGE_ERGONOMICS.workSurfaceM).toBeLessThan(BRIDGE_ERGONOMICS.eyeStandingM);
  });

  it("HAB-08 drawn at WORLD_SCALE the consoles are even further apart than the 2 m of the data", () => {
    const items = BRIDGE.stations.map((s) => ({ id: s.id, centre: { x: s.look.x * WORLD_SCALE, y: s.look.y, z: s.look.z * WORLD_SCALE }, anchor: { x: s.stand.x * WORLD_SCALE, y: 0, z: s.stand.z * WORLD_SCALE } }));
    expect(minSpacing(items)).toBeGreaterThanOrEqual(INTERACTABLE_SPACING.minM);
  });
});
