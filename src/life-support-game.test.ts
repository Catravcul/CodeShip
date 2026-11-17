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

describe("SV-15/SV-17 in play: causes on the rack, preventive tasks, the galley's pantry and its cargo", () => {
  const rack = (kind: string) => ({ id: `sv-${kind}`, label: kind, info: "", action: { kind: "soporte-vital", rack: kind } }) as unknown as Parameters<LifeSupportGame["readout"]>[0];
  const galley = { id: "cocina", label: "Cocina", info: "", action: { kind: "tripulacion", area: "cocina" } } as unknown as Parameters<LifeSupportGame["readout"]>[0];

  it("the air rack shows each machine's wear and the cause of what is closest to failing", () => {
    const v = twoVehicles();
    v.tick(1);
    const html = v.station.readout(rack("ar"))!;
    expect(html).toMatch(/CDRA · en marcha · <span class="sv-wear">7\d % gastado<\/span>/);
    expect(html).toMatch(/Lechos de zeolita degradados: .*zeolita.*de 4800 medios ciclos/);
    v.station.system.setWear("cdra-lechos", 0.85);
    v.tick(1);
    expect(v.station.readout(rack("ar"))).toMatch(/85 % gastado, falla en \d+ días/);
  });

  it("a worn mode past 80 % is a «Preventivo» task of the global list and a button on its rack; done, its wear drops", () => {
    const v = twoVehicles();
    v.station.system.setWear("cdra-lechos", 0.85);
    expect(v.station.taskFacts().map((t) => t.id)).toContain("sv-pm-cdra-lechos");
    const a = v.station.actions(rack("ar")).find((x) => x.id === "chore:sv-pm-cdra-lechos");
    expect(a).toMatchObject({ label: "Preventivo CDRA: limpiar los lechos", enabled: true });
    expect(v.station.rackState(rack("ar")).state).toBe("aviso");
  });

  it("the galley shows the pantry and its days; a Dragon ordered there arrives in 18 h and fills it", () => {
    const v = twoVehicles();
    expect(v.station.readout(galley)).toMatch(/Despensa.*kg.*Quedan.*60 días/s);
    expect(v.station.cargoActions().map((a) => a.label)).toEqual(["Pedir Dragon (2507 kg, 18 h)", "Pedir Cygnus (3749 kg, 60 h)"]);
    const before = v.station.system.readout().foodKg;
    expect(v.station.cargoAct("carguero:dragon")).toBe(true);
    expect(v.station.cargoActions()).toEqual([]);
    expect(v.station.readout(galley)).toMatch(/Dragon de carga en camino: llega en 18 h/);
    v.tick(18);
    expect(v.station.system.readout().foodKg).toBeGreaterThan(before + 400);
    expect(v.said.estacion.some((t) => /Dragon de carga se acopla sola en el IDA de Harmony/.test(t))).toBe(true);
  });

  it("a meal at the galley draws from the pantry", () => {
    const v = twoVehicles();
    const kg = v.station.system.readout().foodKg;
    expect(v.station.pantry.draw()).toBe(true);
    expect(v.station.system.readout().foodKg).toBeCloseTo(kg - 1.195, 6);
  });
});
