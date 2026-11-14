import { describe, expect, it } from "vitest";
import { CODESHIP_RING } from "@modules/gravity/data/ring";
import { carRideSeconds } from "@modules/gravity/data/spine";
import { stationInteriorPlan } from "@modules/station/data/interior";
import { StationInterior } from "@modules/station/domain/interior";
import { planJourney, type CrewJoins } from "../domain/journey";
import { dockingSeconds, journeyTransfers, herePlace, stationPointOf, taskGoal, type JourneyFacts } from "./journey-world";

const station = new StationInterior(stationInteriorPlan());
const docked: CrewJoins = { lander: "nodriza", mothershipAtStation: false };
const facts = (over: Partial<JourneyFacts> = {}): JourneyFacts => ({
  here: { room: "anillo", at: { x: 0.5, z: 3 } },
  joins: docked,
  ringRadiusM: CODESHIP_RING.floorRadiusM,
  station,
  flights: { landerToStation: { seconds: 60 }, landerToMothership: { seconds: 60 }, carrierToStation: { seconds: 120 } },
  ...over,
});
const plan = (f: JourneyFacts, goal: string) => planJourney(journeyTransfers(f), { place: herePlace(f.here), joins: f.joins }, goal);
const planos = taskGoal({ vehicle: "estacion", spot: "pantalla", tab: "planos" }, station)!;

describe("HAB-21 The real journey to a task (travel mode)", () => {
  it("every station tab and the bay have a machine to go to", () => {
    for (const tab of ["materiales", "planos", "fabricacion", "hangar", "importar", "vida"] as const) expect(taskGoal({ vehicle: "estacion", spot: "pantalla", tab }, station), tab).toMatch(/^estacion:/);
    expect(taskGoal({ vehicle: "estacion", spot: "bahia" }, station)).toMatch(/^estacion:/);
    expect(taskGoal({ vehicle: "nodriza", spot: "puente", page: "misiones" }, station)).toBe("puente:comms");
  });

  it("the spoke's car takes about half a minute (accelerate, cruise at 2 m/s, brake)", () => {
    expect(carRideSeconds(51.05)).toBeCloseTo(4 + 4 + (51.05 - 8) / 2, 6);
  });

  it("from the ring to a station task: elevator, spine hops, docking hatch, lander's seat, the flight, roof hatch, station hops", () => {
    const p = plan(facts(), planos);
    expect(p.kind).toBe("ruta");
    if (p.kind !== "ruta") return;
    expect(p.legs.map((l) => l.kind)).toEqual(["andar", "ascensor", "saltos", "escotilla", "andar", "vuelo", "andar", "escotilla", "saltos"]);
    expect(p.legs.map((l) => l.to)).toEqual(["anillo:ascensor", "eje:ascensor", "eje:atraque", "modulo:acople", "modulo:asiento", "modulo:asiento", "modulo:acople", expect.stringMatching(/^estacion:/), planos]);
    // Real durations: the 51 m ride, a chain of hops (the launcher shortens it), the 60 s flight.
    expect(p.legs[1]!.seconds).toBeGreaterThan(25);
    expect(p.legs[2]!.seconds).toBeGreaterThan(3);
    expect(p.legs[2]!.seconds).toBeLessThan(40);
    expect(p.seconds).toBeGreaterThan(100);
    expect(p.seconds).toBeLessThan(220);
  });

  it("with the travel ship already berthed, she goes straight across the spine's docking hatch", () => {
    const p = plan(facts({ joins: { lander: "nodriza", mothershipAtStation: true } }), planos);
    expect(p.kind === "ruta" && p.legs.map((l) => l.kind)).toEqual(["andar", "ascensor", "saltos", "escotilla", "saltos"]);
  });

  it("a slow lander flight loses to the travel ship flown from the ring's navigation console", () => {
    const p = plan(facts({ flights: { landerToStation: { seconds: 600 }, carrierToStation: { seconds: 60 } } }), planos);
    expect(p.kind === "ruta" && p.legs[1]).toMatchObject({ kind: "vuelo", from: "anillo:navegacion" });
  });

  it("the lander away and the travel ship not berthed: she cannot get there, and is told why", () => {
    const p = plan(facts({ joins: { lander: null, mothershipAtStation: false } }), planos);
    expect(p.kind).toBe("bloqueado");
    if (p.kind === "bloqueado") expect(p.why).toMatch(/módulo de aterrizaje/);
  });

  it("no fuel for the flight: blocked, with the flight's reason", () => {
    const p = plan(facts({ flights: { landerToStation: { seconds: 60, blocked: "No queda combustible en el motor principal" }, carrierToStation: { seconds: 60, blocked: "A la nodriza no le queda xenón para ese viaje" } } }), planos);
    expect(p.kind === "bloqueado" && p.why).toMatch(/combustible|xenón/);
  });

  it("from the lander's seat, docked at the station: up, through the roof hatch and across", () => {
    const p = plan(facts({ here: { room: "modulo", at: "asiento" }, joins: { lander: "estacion", mothershipAtStation: false } }), planos);
    expect(p.kind === "ruta" && p.legs.map((l) => l.kind)).toEqual(["andar", "escotilla", "saltos"]);
  });

  it("a ring chore from the station: back through the lander, the flight home, the spine and down the spoke", () => {
    const here = { room: "estacion" as const, point: stationPointOf(station, "impresora")! };
    const p = plan(facts({ here, joins: { lander: "estacion", mothershipAtStation: false } }), "anillo:cocina");
    expect(p.kind === "ruta" && p.legs.map((l) => l.kind)).toEqual(["saltos", "escotilla", "andar", "vuelo", "andar", "escotilla", "saltos", "ascensor", "andar"]);
  });

  it("the docking assist's last 40 m take a minute or two at its braking profile", () => {
    const s = dockingSeconds(40, 0.2);
    expect(s).toBeGreaterThan(40);
    expect(s).toBeLessThan(200);
  });
});
