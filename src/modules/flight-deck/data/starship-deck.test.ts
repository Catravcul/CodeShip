import { describe, expect, it } from "vitest";
import { clampToFloor, clearPath, floorPath, nearestStation } from "@modules/lander-cabin/domain/cabin";
import { INTERACTABLE_SPACING, minSpacing } from "@core/spacing";
import { BRIDGE } from "./bridge";
import { STARSHIP_DECK, STARSHIP_DECK_BASIS, STARSHIP_DECK_SHAPE, STARSHIP_DECK_SOURCES } from "./starship-deck";

const at = (id: string) => STARSHIP_DECK.stations.find((s) => s.id === id)!;

describe("HAB-26 Starship's flight deck rebuilt from what is public (docs/design/puente.md)", () => {
  it("a round deck in the nose cone: its floor and stations inside the 4,2 m hull and under the leaning wall", () => {
    const S = STARSHIP_DECK_SHAPE;
    for (const s of STARSHIP_DECK.stations) {
      expect(clampToFloor(STARSHIP_DECK.floor, s.stand)).toEqual(s.stand);
      expect(nearestStation(STARSHIP_DECK, s.stand)?.id).toBe(s.id);
      // Where she stands the cone is still above her head (1,7 m).
      const r = Math.hypot(s.stand.x, s.stand.z);
      const wallY = ((S.floorRadiusM - r) / (S.floorRadiusM - S.ceilingRadiusM)) * S.heightM;
      expect(Math.min(S.heightM, wallY)).toBeGreaterThan(1.7);
      // The machine is inside the hull.
      expect(Math.hypot(s.look.x, s.look.z)).toBeLessThan(S.floorRadiusM);
    }
    expect(STARSHIP_DECK.habitableM3).toBeGreaterThan(80);
    expect(STARSHIP_DECK.habitableM3).toBeLessThan(100);
  });

  it("the same jobs as before, without the info-only consoles: life and power live on the pilot's screens", () => {
    const ids = STARSHIP_DECK.stations.map((s) => s.id);
    for (const id of ["prop", "dock", "sonda", "nav", "comms", "mente", "nano", "salida"]) expect(ids).toContain(id);
    expect(ids).not.toContain("life");
    expect(ids).not.toContain("power");
    expect(new Set(ids).size).toBe(ids.length);
    // Not the old bridge: no station where it was.
    expect(STARSHIP_DECK.stations.every((s) => !BRIDGE.stations.some((b) => b.id === s.id && b.stand.x === s.stand.x && b.stand.z === s.stand.z))).toBe(true);
  });

  it("forward under the windows: pilot in the middle, docking and probe beside it, all seated (Crew Dragon's seats face the displays)", () => {
    expect(at("prop").stand.x).toBe(0);
    expect(at("prop").look.z).toBeLessThan(at("prop").stand.z);
    for (const id of ["prop", "dock", "sonda"]) expect(at(id).seated).toBe(true);
    expect(STARSHIP_DECK.stations.filter((s) => s.seated)).toHaveLength(3);
    expect(at("dock").stand.x).toBeGreaterThan(0);
    expect(at("sonda").stand.x).toBeLessThan(0);
    // The hatch down to deck 1 is aft.
    expect(at("salida").stand.z).toBeGreaterThan(2);
  });

  it("HAB-08 every station and its place 2 m from the next at real size, and she walks between any two", () => {
    const items = STARSHIP_DECK.stations.map((s) => ({ id: s.id, centre: s.look, anchor: { x: s.stand.x, y: 0, z: s.stand.z } }));
    expect(minSpacing(items)).toBeGreaterThanOrEqual(INTERACTABLE_SPACING.minM);
    for (const a of STARSHIP_DECK.stations)
      for (const b of STARSHIP_DECK.stations) {
        if (a === b) continue;
        let p = a.stand;
        for (const q of floorPath(STARSHIP_DECK.floor, a.stand, b.stand)) {
          expect(clearPath(STARSHIP_DECK.floor, p, q)).toBe(true);
          p = q;
        }
      }
  });

  it("every source is a link and every station says what its base is (real, en desarrollo, nuestra or ficción)", () => {
    for (const v of Object.values(STARSHIP_DECK_SOURCES)) expect(v).toMatch(/https:\/\//);
    for (const s of STARSHIP_DECK.stations) if (s.id !== "salida") expect(STARSHIP_DECK_BASIS[s.id]?.tag).toMatch(/real|en desarrollo|nuestra|ficción/);
  });
});
