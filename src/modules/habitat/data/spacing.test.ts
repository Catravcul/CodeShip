import { describe, expect, it } from "vitest";
import { ACTION_REACH_M, INTERACTABLE_SPACING, minSpacing, spacingViolations, type Interactable } from "@core/spacing";
import { BRIDGE } from "@modules/flight-deck/data/bridge";
import { LANDER_CABIN } from "@modules/lander-cabin/data/cabin";
import type { CabinLayout } from "@modules/lander-cabin/domain/cabin";
import { POLANA_INTERIOR } from "@modules/station/data/interior";
import { stationHandrails } from "@modules/station/data/handrails";
import { RING_MODULE, RING_REACH_M, RING_STATIONS, ringInteractables } from "./ring-module";

const X = INTERACTABLE_SPACING.minM;
const roomItems = <Id extends string>(l: CabinLayout<Id>): Interactable[] => l.stations.map((s) => ({ id: s.id, centre: s.look, anchor: { x: s.stand.x, y: 0, z: s.stand.z } }));

describe("HAB-08 room between interactables (the rule from Cold Sanctuary)", () => {
  it("the rule is 2 m, and a button shows within under half of it, so two never show at once", () => {
    expect(X).toBe(2.0);
    expect(ACTION_REACH_M).toBeLessThan(X / 2);
    expect(RING_REACH_M).toBeLessThan(X / 2);
    expect(INTERACTABLE_SPACING.source).toMatch(/Cold Sanctuary/);
  });

  it("ring module and farm deck: every station, the elevator, the yoga mat, the exercise corner and the bunk 2 m apart", () => {
    expect(spacingViolations(ringInteractables())).toEqual([]);
    // The three Berón named, now well apart.
    const at = (id: string) => RING_STATIONS.find((s) => s.id === id)!.stand;
    const d = (a: string, b: string) => Math.hypot(at(a).x - at(b).x, at(a).z - at(b).z);
    expect(d("yoga", "ejercicio")).toBeGreaterThanOrEqual(X);
    expect(d("yoga", "camarote")).toBeGreaterThanOrEqual(X);
    expect(d("ejercicio", "camarote")).toBeGreaterThanOrEqual(X);
    // Inside the module (or on the farm deck past the doorway).
    for (const s of RING_STATIONS) expect(Math.abs(s.stand.x) < RING_MODULE.halfW || s.stand.z > RING_MODULE.halfL).toBe(true);
  });

  it("galley machines: the galley and the mill and soy processor are two stations 2 m apart", () => {
    const k = ringInteractables().filter((i) => i.id === "cocina" || i.id === "procesado");
    expect(minSpacing(k)).toBeGreaterThanOrEqual(X);
  });

  it("bridge: its ten consoles and the hatch 2 m apart (the deck was enlarged to 6,4 × 8 m)", () => {
    expect(spacingViolations(roomItems(BRIDGE))).toEqual([]);
    expect(BRIDGE.floor.maxX - BRIDGE.floor.minX).toBeGreaterThan(5);
  });

  it("station: every fixture and its grab point 2 m apart, except machines side by side in a module's rack bays (ISS pitch)", () => {
    const rails = stationHandrails(POLANA_INTERIOR);
    const items: (Interactable & { rack: string | undefined })[] = POLANA_INTERIOR.fixtures.map((f) => {
      const r = rails.find((x) => x.poi === f.id);
      return { id: f.id, centre: f.at, anchor: r ? r.a.add(r.b).scale(0.5) : f.at, rack: Math.abs(f.size.x - 0.86) < 1e-6 || Math.abs(f.size.z - 0.86) < 1e-6 ? f.volume : undefined };
    });
    const bad = spacingViolations(items).filter((v) => {
      const a = items.find((i) => i.id === v.a)!;
      const b = items.find((i) => i.id === v.b)!;
      return !(a.rack && a.rack === b.rack);
    });
    expect(bad).toEqual([]);
  });

  it("lander cabin: the one exception (a real-size capsule); there no two machines share a button's reach", () => {
    const items = roomItems(LANDER_CABIN);
    expect(minSpacing(items.map((i) => ({ ...i, centre: i.anchor })))).toBeGreaterThanOrEqual(2 * LANDER_CABIN.reachM);
  });
});
