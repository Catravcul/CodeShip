import { describe, expect, it } from "vitest";
import { Habitat } from "@modules/habitat/application/habitat";
import { RECIPES } from "@modules/kitchen/data/recipes";
import { WORKOUTS } from "@modules/wellness/data/exercise";
import { YOGA_SEQUENCES } from "@modules/wellness/data/yoga";
import { STATION_LARDER, TRIP_STORES_SHARE } from "../data/galley";
import { StationCrew } from "./station-crew";

const make = () => {
  const ship = new Habitat(() => 0.5);
  const h = new Habitat(() => 0.5, 0, undefined, "Doménica", [], ship.crew);
  h.stockAll(STATION_LARDER);
  return { ship, crew: new StationCrew(h, { recipes: RECIPES, yoga: YOGA_SEQUENCES, workouts: WORKOUTS }) };
};

describe("EST-23 life at the station", () => {
  it("offers dishes from the station's larder at the galley, yoga at the mat and workouts in node 1", () => {
    const { crew } = make();
    expect(crew.choresAt("cocina").length).toBeGreaterThan(0);
    expect(crew.choresAt("cocina").every((c) => c.kind === "cocinar")).toBe(true);
    expect(crew.choresAt("esterilla").length).toBe(YOGA_SEQUENCES.length);
    expect(crew.choresAt("ejercicio").length).toBe(WORKOUTS.length);
    // No eggs at the station: scrambled eggs are not offered.
    expect(crew.chore("cocinar-huevos-revueltos")).toBeUndefined();
  });

  it("cooking uses the station's larder and feeds the one Doménica", () => {
    const { ship, crew } = make();
    const c = crew.choresAt("cocina")[0]!;
    const before = crew.larder();
    const s = crew.start(c.id)!;
    while (s.run.current) s.answer(s.run.current.kind === "order" ? { kind: "order", order: s.run.current.solution } : { kind: "choice", index: s.run.current.correct });
    expect(crew.larder()).not.toEqual(before);
    expect(ship.crew).toBe(crew.habitat.crew);
  });

  it("sleep calms her; trip stores go aboard the mothership", () => {
    const { ship, crew } = make();
    ship.crew.startle(0.5);
    const s0 = ship.crew.stress;
    crew.rest();
    expect(ship.crew.stress).toBeLessThan(s0);
    const sent = crew.sendTripStores(ship, TRIP_STORES_SHARE);
    expect(sent.find(([i]) => i === "harina")?.[1]).toBe(4);
    expect(ship.larder("harina")).toBe(4);
    expect(crew.habitat.larder("harina")).toBe(4);
  });
});
