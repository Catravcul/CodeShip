import { describe, expect, it } from "vitest";
import { CODESHIP_RING } from "@modules/gravity/data/ring";
import { carRideSeconds } from "@modules/gravity/data/spine";
import { stationInteriorPlan } from "@modules/station/data/interior";
import { scaleInteriorPlan, StationInterior } from "@modules/station/domain/interior";
import { MACHINE_SCALE } from "@core/machine-scale";
import { planJourney, type CrewJoins } from "../domain/journey";
import { dockingSeconds, journeyTransfers, herePlace, shipPointOf, stationPointOf, taskGoal, type JourneyFacts } from "./journey-world";
import { starshipInteriorPlan } from "@modules/mothership/data/starship-interior";
import { presentInteriorPlan } from "@modules/station/domain/presentation";

const station = new StationInterior(stationInteriorPlan());
const docked: CrewJoins = { lander: "nodriza", mothershipAtStation: false };
const facts = (over: Partial<JourneyFacts> = {}): JourneyFacts => ({
  here: { room: "anillo", at: { x: 0.5, z: 3 } },
  joins: docked,
  ringRadiusM: CODESHIP_RING.floorRadiusM,
  station,
  flights: { landerToMothership: { seconds: 60 }, carrierToStation: { seconds: 20 } },
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

  it("EST-27 from the ring to a station task: the ring's navigation console, the mothership flies into the dry dock, then the spoke, the spine, the docking hatch and the station's hops", () => {
    const p = plan(facts(), planos);
    expect(p.kind).toBe("ruta");
    if (p.kind !== "ruta") return;
    expect(p.legs.map((l) => l.kind)).toEqual(["andar", "vuelo", "andar", "ascensor", "saltos", "escotilla", "saltos"]);
    expect(p.legs[1]).toMatchObject({ from: "anillo:navegacion", label: expect.stringMatching(/dique seco/) });
    expect(p.legs[1]!.joins).toEqual({ lander: "nodriza", mothershipAtStation: true });
    expect(p.legs.at(-2)!.to).toMatch(/^estacion:/);
    // Real durations: the 51 m ride, a chain of hops (the launcher shortens it), the 20 s compressed flight.
    expect(p.legs[1]!.seconds).toBe(20);
    expect(p.legs[3]!.seconds).toBeGreaterThan(25);
    expect(p.seconds).toBeGreaterThan(60);
    expect(p.seconds).toBeLessThan(160);
  }, 20000);

  it("with the travel ship already berthed, she goes straight across the spine's docking hatch", () => {
    const p = plan(facts({ joins: { lander: "nodriza", mothershipAtStation: true } }), planos);
    expect(p.kind === "ruta" && p.legs.map((l) => l.kind)).toEqual(["andar", "ascensor", "saltos", "escotilla", "saltos"]);
  });

  it("EST-27 the lander never flies to the station: from its seat she goes through the mothership, which flies", () => {
    const p = plan(facts({ here: { room: "modulo", at: "asiento" } }), planos);
    expect(p.kind).toBe("ruta");
    if (p.kind !== "ruta") return;
    const flights = p.legs.filter((l) => l.kind === "vuelo");
    expect(flights).toHaveLength(1);
    expect(flights[0]!.from).toMatch(/^(puente:nav|anillo:navegacion)$/);
    expect(p.legs.some((l) => l.to === "modulo:acople" && l.kind === "escotilla")).toBe(false);
  });

  it("EST-27 the lander away (landed, or left at the station) does not keep the mothership home: she flies alone", () => {
    for (const lander of [null, "estacion"] as const) {
      const p = plan(facts({ joins: { lander, mothershipAtStation: false } }), planos);
      expect(p.kind).toBe("ruta");
      if (p.kind === "ruta") expect(p.legs.find((l) => l.kind === "vuelo")!.joins).toEqual({ lander, mothershipAtStation: true });
    }
  });

  it("no xenon for the flight: blocked, with the flight's reason", () => {
    const p = plan(facts({ flights: { carrierToStation: { seconds: 20, blocked: "A la nodriza no le queda xenón para ese viaje" } } }), planos);
    expect(p.kind === "bloqueado" && p.why).toMatch(/xenón/);
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
  it("in the station as it is played (drawn bigger, with doors and crew areas): to a machine in the air and to the galley", () => {
    const big = new StationInterior(scaleInteriorPlan(stationInteriorPlan(), MACHINE_SCALE));
    const f = facts({ station: big, joins: { lander: "nodriza", mothershipAtStation: true } });
    const to = taskGoal({ vehicle: "estacion", spot: "pantalla", tab: "planos" }, big)!;
    expect(plan(f, to).kind).toBe("ruta");
    const area = big.plan.fixtures.find((x) => x.action.kind === "tripulacion")!;
    const galley = taskGoal({ vehicle: "estacion", spot: "tripulacion", area: area.id }, big)!;
    expect(galley).toBe(`estacion:${area.id}`);
    const p = plan(f, galley);
    expect(p.kind === "ruta" && p.legs.at(-1)!.kind).toBe("saltos");
    // A hangar task goes to a machine she can reach without the suit.
    const hangar = taskGoal({ vehicle: "estacion", spot: "pantalla", tab: "hangar" }, big)!;
    expect(big.volume(big.fixture(hangar.split(":")[1]!)!.volume)?.pressurised).toBe(true);
  });
});

describe("TRY Starship: every way walked, hatches opened (docs/design/reglas.md §3)", () => {
  const ship = new StationInterior(presentInteriorPlan(starshipInteriorPlan(), { scale: 1.5, spreadM: 2 }));
  const shipFacts = (over: Partial<JourneyFacts> = {}): JourneyFacts => facts({ ship, ringRadiusM: 0, here: { room: "nave", point: shipPointOf(ship, "salir-modulo")! }, ...over });
  const galley = taskGoal({ vehicle: "nodriza", spot: "anillo", station: "cocina" }, station, ship)!;

  it("TRY-01 a chore of Starship's decks is a place on them; no ring, spoke or spine in the graph", () => {
    expect(galley).toBe("nave:cocina");
    const legs = journeyTransfers(shipFacts());
    expect(legs.some((l) => /^(anillo|eje):/.test(l.from) || /^(anillo|eje):/.test(l.to))).toBe(false);
  });

  it("TRY-02 from deck 3 to the flight deck's navigation console: hops up the decks, the ceiling hatch, then the walk", () => {
    const p = plan(shipFacts(), "puente:nav");
    expect(p.kind).toBe("ruta");
    if (p.kind !== "ruta") return;
    expect(p.legs.map((l) => l.kind)).toEqual(["saltos", "escotilla", "andar"]);
    expect(p.legs[0]!.to).toBe("nave:subir-cubierta-vuelo");
    expect(p.legs[1]!.label).toMatch(/cubierta de vuelo/);
  });

  it("TRY-03 from the flight deck to the galley: through the hatch down into deck 1 and hops", () => {
    const p = plan(shipFacts({ here: { room: "puente", at: { x: 0, z: 0 } } }), galley);
    expect(p.kind === "ruta" && p.legs.map((l) => l.kind)).toEqual(["andar", "escotilla", "saltos"]);
  });

  it("TRY-04 to a station task from Starship's deck 3: up to the navigation console, Starship flies and berths, then through the nose tunnel", () => {
    const p = plan(shipFacts(), planos);
    expect(p.kind).toBe("ruta");
    if (p.kind !== "ruta") return;
    expect(p.legs.map((l) => l.kind)).toEqual(["saltos", "escotilla", "andar", "vuelo", "andar", "escotilla", "saltos", "escotilla", "saltos"]);
    expect(p.legs[3]).toMatchObject({ from: "puente:nav" });
    expect(p.legs[7]!.label).toMatch(/túnel de proa/);
  });

  it("TRY-05 from the lander's seat to the galley: the roof hatch into deck 3, no teleport", () => {
    const p = plan(shipFacts({ here: { room: "modulo", at: "asiento" } }), galley);
    expect(p.kind === "ruta" && p.legs.map((l) => l.kind)).toEqual(["andar", "escotilla", "saltos"]);
  });

  it("TRY-06 the lander away: Starship's deck-3 hatch stays shut, and she is told why", () => {
    const p = plan(shipFacts({ joins: { lander: null, mothershipAtStation: false }, flights: { carrierToStation: { seconds: 20 } } }), "modulo:ecs");
    expect(p.kind).toBe("bloqueado");
    if (p.kind === "bloqueado") expect(p.why).toMatch(/módulo de aterrizaje no está acoplado/);
  });
});
