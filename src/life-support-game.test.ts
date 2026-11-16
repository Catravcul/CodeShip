import { describe, expect, it } from "vitest";
import { STATION_LIFE_SUPPORT } from "@modules/life-support/data/hosts";
import { STARSHIP_LIFE_SUPPORT } from "@modules/mothership/data/starship";
import { LifeSupportGame, type LifeSupportGameDeps } from "./life-support-game";
import type { DuelView } from "./ui/duel-view";

type Where = "estacion" | "nodriza" | "modulo";

/** The station and the Starship on one clock, as main.ts runs them, with Doménica in one place at a time. */
function twoVehicles() {
  let where: Where = "estacion";
  const said: Record<"estacion" | "nodriza", string[]> = { estacion: [], nodriza: [] };
  const deps = (host: "estacion" | "nodriza"): LifeSupportGameDeps => ({
    duel: {} as DuelView,
    say: (t) => void said[host].push(t),
    rack: () => undefined,
    openTasks: () => {},
    crewAboard: () => (where === host ? 1 : 0),
  });
  const station = new LifeSupportGame(deps("estacion"), STATION_LIFE_SUPPORT, 58);
  const ship = new LifeSupportGame(deps("nodriza"), STARSHIP_LIFE_SUPPORT, 58);
  const tick = (h: number) => {
    station.tick(h);
    ship.tick(h);
  };
  return { station, ship, said, tick, goTo: (w: Where) => (where = w) };
}

describe("SV-13 each vehicle's life support counts only the crew aboard it", () => {
  it("with Doménica in the station, only the station's food goes and only it gives her symptoms", () => {
    const v = twoVehicles();
    v.station.system.fail("cdra-lechos");
    v.ship.system.fail("cdra-lechos");
    const food = { st: v.station.system.readout().foodKg, sh: v.ship.system.readout().foodKg };
    for (let i = 0; i < 7 * 24; i++) v.tick(1);
    expect(v.station.system.readout().foodKg).toBeLessThan(food.st);
    expect(v.ship.system.readout().foodKg).toBe(food.sh);
    // The broken CDRA lets her CO₂ build up in the station; the empty Starship's air has nobody breathing.
    expect(v.station.system.readout().ppCO2MmHg).toBeGreaterThan(5.3);
    expect(v.ship.system.readout().ppCO2MmHg).toBeLessThan(3);
    expect(v.said.estacion.some((t) => t.startsWith("Doménica:"))).toBe(true);
    expect(v.said.nodriza.some((t) => t.startsWith("Doménica:"))).toBe(false);
  });

  it("she moves to the Starship: its load starts and the station's stops", () => {
    const v = twoVehicles();
    v.tick(24);
    v.goTo("nodriza");
    const food = { st: v.station.system.readout().foodKg, sh: v.ship.system.readout().foodKg };
    v.tick(24);
    expect(v.station.system.readout().foodKg).toBe(food.st);
    expect(v.ship.system.readout().foodKg).toBeLessThan(food.sh);
  });

  it("in the lander, neither vehicle has crew, and both still run their machines", () => {
    const v = twoVehicles();
    v.goTo("modulo");
    const food = { st: v.station.system.readout().foodKg, sh: v.ship.system.readout().foodKg };
    v.tick(48);
    expect(v.station.system.readout().foodKg).toBe(food.st);
    expect(v.ship.system.readout().foodKg).toBe(food.sh);
    expect(v.station.system.readout().powerW).toBeGreaterThan(0);
    expect(v.ship.system.readout().powerW).toBeGreaterThan(0);
  });
});
