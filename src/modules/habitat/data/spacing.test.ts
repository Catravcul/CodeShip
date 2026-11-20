import { MACHINE_SCALE } from "@core/machine-scale";
import { WORLD_SCALE } from "@core/scale";
import { scaleInteriorPlan } from "@modules/station/domain/interior";
import { describe, expect, it } from "vitest";
import { ACTION_REACH_M, asPlayed, INTERACTABLE_SPACING, minSpacing, spacingViolations, type Interactable } from "@core/spacing";
import { BRIDGE } from "@modules/flight-deck/data/bridge";
import { STARSHIP_DECK } from "@modules/flight-deck/data/starship-deck";
import { LANDER_CABIN } from "@modules/lander-cabin/data/cabin";
import type { CabinLayout } from "@modules/lander-cabin/domain/cabin";
import { POLANA_INTERIOR } from "@modules/station/data/interior";
import { stationInteractables } from "@modules/station/data/presentation";
import { spineInteractables, spineLayout } from "@modules/gravity/data/spine";
import { CODESHIP_RING } from "@modules/gravity/data/ring";
import { RING_MODULE, RING_REACH_M, RING_STATIONS, ringInteractables } from "./ring-module";

const X = INTERACTABLE_SPACING.minM;
const roomItems = <Id extends string>(l: CabinLayout<Id>): Interactable[] => l.stations.map((s) => ({ id: s.id, centre: s.look, anchor: { x: s.stand.x, y: 0, z: s.stand.z } }));

/** The station as played: its plan drawn at MACHINE_SCALE (main.ts), each door one interactable (data/presentation.ts). */
const stationItems = (): Interactable[] => stationInteractables(scaleInteriorPlan(POLANA_INTERIOR, MACHINE_SCALE));

/** Every area she walks or floats in, as played (data at real size × its drawing scale), with no exemptions. */
const AREAS: readonly { readonly area: string; readonly scale: number; readonly items: () => Interactable[] }[] = [
  { area: "anillo y cubierta de cultivo", scale: WORLD_SCALE, items: () => asPlayed(ringInteractables(), WORLD_SCALE) },
  { area: "puente", scale: WORLD_SCALE, items: () => asPlayed(roomItems(BRIDGE), WORLD_SCALE) },
  { area: "cubierta de vuelo de la Starship", scale: WORLD_SCALE, items: () => asPlayed(roomItems(STARSHIP_DECK), WORLD_SCALE) },
  { area: "habitáculo del módulo", scale: WORLD_SCALE, items: () => asPlayed(roomItems(LANDER_CABIN), WORLD_SCALE) },
  { area: "estación", scale: MACHINE_SCALE, items: stationItems },
  // The hub and the spine are game values already (tubes 5,5 m across): drawn as laid out.
  { area: "cubo y espina", scale: 1, items: () => spineInteractables(spineLayout(CODESHIP_RING.floorRadiusM, RING_MODULE.halfL)) },
];

describe("HAB-08 room between interactables (the rule from Cold Sanctuary), in every area as played", () => {
  it("the rule is 2 m, and a button shows within under half of it, so two never show at once", () => {
    expect(X).toBe(2.0);
    expect(ACTION_REACH_M).toBeLessThan(X / 2);
    expect(RING_REACH_M).toBeLessThan(X / 2);
    expect(INTERACTABLE_SPACING.source).toMatch(/Cold Sanctuary/);
  });

  for (const a of AREAS)
    it(`${a.area} (×${String(a.scale).replace(".", ",")}): every interactable and its action anchor ${X} m from the next, no exemptions`, () => {
      expect(spacingViolations(a.items())).toEqual([]);
    });

  it("every area is drawn at the one scale of src/core/scale.ts, except the hub and spine (game-size tubes)", () => {
    expect(AREAS.filter((a) => a.scale !== WORLD_SCALE).map((a) => a.area)).toEqual(["cubo y espina"]);
    expect(MACHINE_SCALE).toBe(WORLD_SCALE);
  });

  it("ring module: the yoga mat, the exercise corner and the bunk Berón named, well apart; inside the module or past the doorway", () => {
    const at = (id: string) => RING_STATIONS.find((s) => s.id === id)!.stand;
    const d = (a: string, b: string) => Math.hypot(at(a).x - at(b).x, at(a).z - at(b).z) * WORLD_SCALE;
    expect(d("yoga", "ejercicio")).toBeGreaterThanOrEqual(X);
    expect(d("yoga", "camarote")).toBeGreaterThanOrEqual(X);
    expect(d("ejercicio", "camarote")).toBeGreaterThanOrEqual(X);
    for (const s of RING_STATIONS) expect(Math.abs(s.stand.x) < RING_MODULE.halfW || s.stand.z > RING_MODULE.halfL).toBe(true);
  });

  it("galley machines: the galley and the mill and soy processor are two stations 2 m apart", () => {
    const k = asPlayed(ringInteractables(), WORLD_SCALE).filter((i) => i.id === "cocina" || i.id === "procesado");
    expect(minSpacing(k)).toBeGreaterThanOrEqual(X);
  });

  it("lander cabin: no longer exempt; lengthened aft so its five machines are 2 m apart as played", () => {
    expect(minSpacing(asPlayed(roomItems(LANDER_CABIN), WORLD_SCALE))).toBeGreaterThanOrEqual(X);
  });
});
